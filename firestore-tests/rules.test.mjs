// Run with: cd firestore-tests && npm install && npm test   (needs the Firebase CLI and Java 21+)
// Runs against the Firestore emulator with the repo's firestore.rules.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, addDoc, updateDoc, getDoc, collection, serverTimestamp, deleteField } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-rules',
  firestore: { rules: readFileSync(process.argv[2], 'utf8'), host: '127.0.0.1', port: 8085 },
});
const SEALED = 'v1:' + Buffer.from('x'.repeat(60)).toString('base64');
const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
let failures = 0;
const check = async (name, p, ok) => {
  try { await (ok ? assertSucceeds(p) : assertFails(p)); console.log('ok  ', name); }
  catch (e) { failures++; console.log('FAIL', name, e.message?.slice(0, 120)); }
};
const sessions = (db, uid = 'alice') => collection(db, 'users', uid, 'sessions');
const good = { created_at: serverTimestamp(), timer_duration_sec: 15, sealed: SEALED, source: 'gemini' };

// Sessions: create
await check('create sealed session', addDoc(sessions(alice), good), true);
await check('create with plain scores rejected', addDoc(sessions(alice), { ...good, scores: { stress: 0.1 } }), false);
await check('create with plain reading rejected', addDoc(sessions(alice), { ...good, reading_text: 'hi' }), false);
await check('create without sealed rejected', addDoc(sessions(alice), { created_at: serverTimestamp(), timer_duration_sec: 15 }), false);
await check('create with non-sealed string rejected', addDoc(sessions(alice), { ...good, sealed: 'my reading in plain text' }), false);
await check("create in another user's history rejected", addDoc(sessions(bob, 'alice'), good), false);

// Sessions: marks
const ref = doc(alice, 'users', 'alice', 'sessions', 's1');
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'users/alice/sessions/s1'), { created_at: new Date(), timer_duration_sec: 15, sealed: SEALED }));
await check('sealed summary', updateDoc(ref, { summary: SEALED }), true);
await check('sealed rating', updateDoc(ref, { rating: 'v1:QUJD' }), true);
await check('plain summary rejected', updateDoc(ref, { summary: 'notes in plain text' }), false);
await check('plain rating rejected', updateDoc(ref, { rating: 8 }), false);
await check('calm_anchor mark', updateDoc(ref, { calm_anchor: true }), true);
await check('changing sealed body rejected', updateDoc(ref, { sealed: SEALED + 'AA' }), false);
await check('bob reading alice rejected', getDoc(doc(bob, 'users/alice/sessions/s1')), false);

// Sessions: legacy migration
const legacy = { created_at: new Date(), timer_duration_sec: 15, scores: { stress: 0.2 }, reading_text: 'old', primary_class: 'Stress', summary: 'old notes', rating: 8, source: 'gemini' };
await env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), 'users/alice/sessions/old1'), legacy);
  await setDoc(doc(c.firestore(), 'users/alice/sessions/old2'), legacy);
  await setDoc(doc(c.firestore(), 'users/alice/sessions/old3'), legacy);
});
const old = (id) => doc(alice, 'users/alice/sessions', id);
const wipe = { scores: deleteField(), reading_text: deleteField(), primary_class: deleteField() };
await check('legacy: seal + remove plain', updateDoc(old('old1'), { sealed: SEALED, summary: SEALED, rating: 'v1:QUJD', ...wipe }), true);
await check('legacy: leaving plain reading rejected', updateDoc(old('old2'), { sealed: SEALED, summary: SEALED, rating: 'v1:QUJD', scores: deleteField(), primary_class: deleteField() }), false);
await check('legacy: leaving plain summary rejected', updateDoc(old('old2'), { sealed: SEALED, rating: 'v1:QUJD', ...wipe }), false);
await check('legacy: second migration of a sealed doc rejected', updateDoc(old('old1'), { sealed: SEALED + 'AA' }), false);
await check('legacy: calm_anchor on unmigrated doc still allowed', updateDoc(old('old3'), { calm_anchor: true }), true);

// Account settings
const me = doc(alice, 'users/alice');
await check('settings: show_photo', setDoc(me, { show_photo: false }, { merge: true }), true);
await check('settings: sealed profile', setDoc(me, { profile: SEALED }, { merge: true }), true);
await check('settings: plain age rejected', setDoc(me, { age: 34 }, { merge: true }), false);
await check('settings: plain profile rejected', setDoc(me, { profile: '{"age":34}' }, { merge: true }), false);
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'users/carol'), { remember_progression: false }));
const carol = env.authenticatedContext('carol').firestore();
await check('settings: retired field removed while writing', setDoc(doc(carol, 'users/carol'), { show_photo: true, remember_progression: deleteField() }, { merge: true }), true);
await check("settings: bob can't read alice", getDoc(doc(bob, 'users/alice')), false);

await env.cleanup();
console.log(failures ? `${failures} FAILED` : 'all passed');
process.exit(failures ? 1 : 0);
