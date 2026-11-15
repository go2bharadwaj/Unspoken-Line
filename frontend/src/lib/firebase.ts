import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, Auth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  Firestore,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { EmotionScores, RATING_CHOICES, SavedReading, StoredSession, TimerDurationSec } from '../types';
import { openValues, sealValues } from './api';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

export const firebaseEnabled: boolean = Boolean(apiKey && authDomain && projectId && appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (firebaseEnabled) {
  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    appId,
  };

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

const LOCAL_STORAGE_KEY = 'unspoken-line.sessions.v1';

function getLocalSessions(): StoredSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: StoredSession[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Gracefully handle storage quotas or disabled storage
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  if (!firebaseEnabled || !auth || !googleProvider) {
    return null;
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function getIdToken(): Promise<string | null> {
  try {
    return (await auth?.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  if (!firebaseEnabled || !auth) {
    return;
  }
  await signOut(auth);
}

export function onUserChanged(cb: (user: User | null) => void): () => void {
  if (!firebaseEnabled || !auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function saveSession(
  user: User | null,
  data: {
    timer_duration_sec: TimerDurationSec;
    scores: EmotionScores;
    reading?: SavedReading;
  }
): Promise<string> {
  // Firestore rejects undefined values, so only send the reading fields that exist
  const reading = Object.fromEntries(
    Object.entries(data.reading ?? {}).filter(([, v]) => v !== undefined && v !== null)
  ) as SavedReading;
  const sanitizedScores: EmotionScores = {
    stress: Number(data.scores.stress.toFixed(2)),
    anxiety: Number(data.scores.anxiety.toFixed(2)),
    mental_fatigue: Number(data.scores.mental_fatigue.toFixed(2)),
    calm_flow: Number(data.scores.calm_flow.toFixed(2)),
    radiant_joy: Number(data.scores.radiant_joy.toFixed(2)),
  };

  if (user && db) {
    // Everything personal is sealed into one value; only the date, timer length and source stay readable
    const { source, ...personal } = reading;
    const [sealed] = await sealValues([JSON.stringify({ scores: sanitizedScores, ...personal })]);
    const colRef = collection(db, 'users', user.uid, 'sessions');
    const docRef = await addDoc(colRef, {
      created_at: serverTimestamp(),
      timer_duration_sec: data.timer_duration_sec,
      sealed,
      ...(source ? { source } : {}),
    });
    return docRef.id;
  }

  // Guest Sanctuary Mode (localStorage)
  const id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const newSession: StoredSession = {
    id,
    created_at: Date.now(),
    timer_duration_sec: data.timer_duration_sec,
    scores: sanitizedScores,
    ...reading,
  };
  const list = getLocalSessions();
  list.push(newSession);
  saveLocalSessions(list.slice(-60));
  return id;
}

export async function listSessions(user: User | null): Promise<StoredSession[]> {
  if (user && db) {
    try {
      const colRef = collection(db, 'users', user.uid, 'sessions');
      const q = query(colRef, orderBy('created_at', 'desc'), limit(60));
      const snap = await getDocs(q);

      // Open every sealed value of every session in one request
      const toOpen: string[] = [];
      const queue = (v: unknown): number => (isSealed(v) ? toOpen.push(v) - 1 : -1);
      const docs = snap.docs.map((d) => {
        const raw = d.data() as DocumentData;
        return {
          id: d.id,
          raw,
          at: {
            body: queue(raw.sealed),
            summary: queue(raw.summary),
            rating: queue(raw.rating),
          },
        };
      });
      const opened = await openValues(toOpen);
      const take = (i: number) => (i >= 0 ? opened[i] : null);

      const results: StoredSession[] = [];
      const legacy: StoredSession[] = [];
      for (const { id, raw, at } of docs) {
        let body: Pick<StoredSession, 'scores'> & SavedReading;
        if (at.body >= 0) {
          const text = take(at.body);
          if (text === null) continue; // can't be opened (wrong key or tampered): leave it out rather than show junk
          try {
            body = JSON.parse(text);
          } catch {
            continue;
          }
        } else {
          // Saved before encryption: read the plain fields, and seal them below
          body = {
            scores: raw.scores,
            reading_text: raw.reading_text,
            progression_text: raw.progression_text,
            trend_text: raw.trend_text,
            evidence: raw.evidence,
            primary_class: raw.primary_class,
          };
        }
        const summary =
          at.summary >= 0 ? (take(at.summary) ?? undefined) : typeof raw.summary === 'string' ? raw.summary : undefined;
        const ratingText = at.rating >= 0 ? take(at.rating) : null;
        const rating =
          ratingText !== null ? Number(ratingText) : typeof raw.rating === 'number' ? raw.rating : undefined;

        const session: StoredSession = {
          ...body,
          id,
          created_at: toMillis(raw.created_at),
          timer_duration_sec: raw.timer_duration_sec,
          calm_anchor: raw.calm_anchor,
          aura_hex: raw.aura_hex,
          summary,
          rating,
          source: raw.source,
        };
        results.push(session);
        if (at.body < 0) legacy.push(session);
      }

      if (legacy.length > 0) {
        // Background: a failure leaves them readable as before, and the next load tries again
        sealLegacySessions(user, legacy).catch(() => {});
      }

      // Return oldest -> newest
      return results.reverse();
    } catch {
      return [];
    }
  }

  // Guest Mode
  const local = getLocalSessions();
  local.sort((a, b) => a.created_at - b.created_at);
  return local.slice(-60);
}

export async function markSession(
  user: User | null,
  id: string,
  patch: {
    calm_anchor?: boolean;
    aura_hex?: string;
    summary?: string;
    rating?: number;
  }
): Promise<void> {
  const updatePayload: {
    calm_anchor?: boolean;
    aura_hex?: string;
    summary?: string;
    rating?: number;
  } = {};
  if (typeof patch.calm_anchor === 'boolean') {
    updatePayload.calm_anchor = patch.calm_anchor;
  }
  if (typeof patch.aura_hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(patch.aura_hex)) {
    updatePayload.aura_hex = patch.aura_hex;
  }
  // Same cap as the backend's SUMMARY_MAX_CHARS and firestore.rules
  if (typeof patch.summary === 'string' && patch.summary.length > 0 && patch.summary.length <= 1500) {
    updatePayload.summary = patch.summary;
  }
  if (patch.rating !== undefined && RATING_CHOICES.includes(patch.rating)) {
    updatePayload.rating = patch.rating;
  }

  if (Object.keys(updatePayload).length === 0) {
    return;
  }

  if (user && db) {
    // Notes and ratings are personal, so they are stored sealed; the activity marks stay plain
    const { summary, rating, ...plain } = updatePayload;
    const toSeal = [summary, rating === undefined ? undefined : String(rating)];
    const sealed = await sealValues(toSeal.filter((v): v is string => v !== undefined));
    const [sealedSummary, sealedRating] = toSeal.map((v) => (v === undefined ? undefined : sealed.shift()));
    await updateDoc(doc(db, 'users', user.uid, 'sessions', id), {
      ...plain,
      ...(sealedSummary ? { summary: sealedSummary } : {}),
      ...(sealedRating ? { rating: sealedRating } : {}),
    });
    return;
  }

  // Guest Mode
  const local = getLocalSessions();
  const target = local.find((s) => s.id === id);
  if (target) {
    if (updatePayload.calm_anchor !== undefined) {
      target.calm_anchor = updatePayload.calm_anchor;
    }
    if (updatePayload.aura_hex !== undefined) {
      target.aura_hex = updatePayload.aura_hex;
    }
    if (updatePayload.summary !== undefined) {
      target.summary = updatePayload.summary;
    }
    if (updatePayload.rating !== undefined) {
      target.rating = updatePayload.rating;
    }
    saveLocalSessions(local);
  }
}

export async function deleteSession(user: User | null, id: string): Promise<void> {
  if (user && db) {
    // The reading and its kept photo go together, in one atomic write
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', user.uid, 'sessions', id));
    batch.delete(doc(db, 'users', user.uid, 'photos', id));
    await batch.commit();
    return;
  }
  saveLocalSessions(getLocalSessions().filter((s) => s.id !== id));
}

export async function clearHistory(user: User | null): Promise<void> {
  if (user && db) {
    // Photos first, so a failure part-way never leaves a photo behind without its reading
    for (const name of ['photos', 'sessions']) {
      const docs = (await getDocs(collection(db, 'users', user.uid, name))).docs;
      const CHUNK_SIZE = 400;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        docs.slice(i, i + CHUNK_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    return;
  }

  // Guest Mode
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Gracefully handle localStorage errors
  }
}

const LOCAL_DISCARD_PHOTO_KEY = 'unspoken-line.discard-photo.v1';
const LOCAL_PROFILE_KEY = 'unspoken-line.profile.v1';

/** Sealed on the account: the age the person gave and the day they gave it, so it can age with them. */
interface Profile {
  age: number;
  set_on: string; // YYYY-MM-DD
}

export interface Settings {
  /** Discard the photo after the reading (the default), or keep it, sealed, with the reading. */
  discardPhoto: boolean;
  /** Age today, or null if they haven't given it. */
  age: number | null;
}

/** Whole years since the age was given, added on. */
export function currentAge(profile: Profile, today = new Date()): number {
  const [y, m, d] = profile.set_on.split('-').map(Number);
  let years = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) years -= 1;
  return profile.age + Math.max(0, years);
}

function parseProfile(text: string | null): Profile | null {
  if (!text) return null;
  try {
    const p = JSON.parse(text);
    return typeof p.age === 'number' && typeof p.set_on === 'string' ? p : null;
  } catch {
    return null;
  }
}

export async function getSettings(user: User | null): Promise<Settings> {
  if (user && db) {
    const data = (await getDoc(doc(db, 'users', user.uid))).data() ?? {};
    const [profileText] = isSealed(data.profile) ? await openValues([data.profile]) : [null];
    const profile = parseProfile(profileText);
    return {
      discardPhoto: data.discard_photo !== false,
      age: profile ? currentAge(profile) : null,
    };
  }
  try {
    const profile = parseProfile(localStorage.getItem(LOCAL_PROFILE_KEY));
    return {
      discardPhoto: localStorage.getItem(LOCAL_DISCARD_PHOTO_KEY) !== 'off',
      age: profile ? currentAge(profile) : null,
    };
  } catch {
    return { discardPhoto: true, age: null };
  }
}

// Merged into the account doc; also clears retired settings so the doc matches firestore.rules
function writeSettings(user: User, fields: Record<string, unknown>): Promise<void> {
  return setDoc(
    doc(db!, 'users', user.uid),
    { ...fields, remember_progression: deleteField(), show_photo: deleteField() },
    { merge: true }
  );
}

export async function setDiscardPhoto(user: User | null, on: boolean): Promise<void> {
  if (user && db) {
    await writeSettings(user, { discard_photo: on });
    return;
  }
  try {
    localStorage.setItem(LOCAL_DISCARD_PHOTO_KEY, on ? 'on' : 'off');
  } catch {
    // Storage disabled: the choice lasts until reload
  }
}

export async function setAge(user: User | null, age: number): Promise<void> {
  const profile: Profile = {
    age,
    set_on: new Date().toLocaleDateString('en-CA'),
  };
  if (user && db) {
    const [sealed] = await sealValues([JSON.stringify(profile)]);
    await writeSettings(user, { profile: sealed });
    return;
  }
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Storage disabled: asked again next visit
  }
}

/** Keep a photo with its reading, sealed. Signed-in only: a guest's browser storage is too small for photos. */
export async function savePhoto(user: User, sessionId: string, base64: string): Promise<void> {
  const [sealed] = await sealValues([base64]);
  await setDoc(doc(db!, 'users', user.uid, 'photos', sessionId), { sealed, created_at: serverTimestamp() });
}

/** The kept photo for a reading (base64 JPEG), or null if none was kept. */
export async function loadPhoto(user: User | null, sessionId: string): Promise<string | null> {
  if (!user || !db) return null;
  const data = (await getDoc(doc(db, 'users', user.uid, 'photos', sessionId))).data();
  if (!isSealed(data?.sealed)) return null;
  const [base64] = await openValues([data.sealed]);
  return base64;
}

function isSealed(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('v1:');
}

function toMillis(createdAt: unknown): number {
  const t = createdAt as { toMillis?: () => number; seconds?: number } | number | undefined;
  if (typeof t === 'number') return t;
  if (t instanceof Timestamp || typeof t?.toMillis === 'function') return t.toMillis!();
  if (typeof t?.seconds === 'number') return t.seconds * 1000;
  return Date.now();
}

const PLAIN_PERSONAL_FIELDS = ['scores', 'primary_class', 'reading_text', 'progression_text', 'trend_text', 'evidence'];

/** Seal sessions saved before encryption, and remove their plain copies. */
async function sealLegacySessions(user: User, sessions: StoredSession[]): Promise<void> {
  const values: string[] = [];
  const plans = sessions.map((s) => {
    const body = {
      scores: s.scores,
      reading_text: s.reading_text,
      progression_text: s.progression_text,
      trend_text: s.trend_text,
      evidence: s.evidence,
      primary_class: s.primary_class,
    };
    return {
      id: s.id,
      body: values.push(JSON.stringify(body)) - 1,
      summary: s.summary ? values.push(s.summary) - 1 : -1,
      rating: s.rating !== undefined ? values.push(String(s.rating)) - 1 : -1,
    };
  });
  const sealed = await sealValues(values);
  for (const p of plans) {
    await updateDoc(doc(db!, 'users', user.uid, 'sessions', p.id), {
      sealed: sealed[p.body],
      ...(p.summary >= 0 ? { summary: sealed[p.summary] } : {}),
      ...(p.rating >= 0 ? { rating: sealed[p.rating] } : {}),
      ...Object.fromEntries(PLAIN_PERSONAL_FIELDS.map((f) => [f, deleteField()])),
    });
  }
}
