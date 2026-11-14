import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
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
  updateDoc,
  Firestore,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { EmotionScores, StoredSession, TimerDurationSec } from '../types';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

export const firebaseEnabled: boolean = Boolean(
  apiKey && authDomain && projectId && appId
);

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
  data: { timer_duration_sec: TimerDurationSec; scores: EmotionScores }
): Promise<string> {
  const sanitizedScores: EmotionScores = {
    stress: Number(data.scores.stress.toFixed(2)),
    anxiety: Number(data.scores.anxiety.toFixed(2)),
    mental_fatigue: Number(data.scores.mental_fatigue.toFixed(2)),
    calm_flow: Number(data.scores.calm_flow.toFixed(2)),
    radiant_joy: Number(data.scores.radiant_joy.toFixed(2)),
  };

  if (user && db) {
    const colRef = collection(db, 'users', user.uid, 'sessions');
    const docRef = await addDoc(colRef, {
      created_at: serverTimestamp(),
      timer_duration_sec: data.timer_duration_sec,
      scores: sanitizedScores,
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
  };
  const list = getLocalSessions();
  list.push(newSession);
  saveLocalSessions(list.slice(-60));
  return id;
}

export async function listSessions(
  user: User | null
): Promise<StoredSession[]> {
  if (user && db) {
    try {
      const colRef = collection(db, 'users', user.uid, 'sessions');
      const q = query(colRef, orderBy('created_at', 'desc'), limit(60));
      const snap = await getDocs(q);
      const results: StoredSession[] = [];

      snap.forEach((docSnap) => {
        const raw = docSnap.data() as DocumentData;
        let createdAtMs = Date.now();
        if (raw.created_at) {
          if (typeof raw.created_at.toMillis === 'function') {
            createdAtMs = raw.created_at.toMillis();
          } else if (raw.created_at instanceof Timestamp) {
            createdAtMs = raw.created_at.toMillis();
          } else if (typeof raw.created_at.seconds === 'number') {
            createdAtMs = raw.created_at.seconds * 1000;
          } else if (typeof raw.created_at === 'number') {
            createdAtMs = raw.created_at;
          }
        }

        const session: StoredSession = {
          id: docSnap.id,
          created_at: createdAtMs,
          timer_duration_sec: raw.timer_duration_sec,
          scores: raw.scores,
          calm_anchor: raw.calm_anchor,
          aura_hex: raw.aura_hex,
        };
        results.push(session);
      });

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
  patch: { calm_anchor?: boolean; aura_hex?: string }
): Promise<void> {
  const updatePayload: { calm_anchor?: boolean; aura_hex?: string } = {};
  if (typeof patch.calm_anchor === 'boolean') {
    updatePayload.calm_anchor = patch.calm_anchor;
  }
  if (typeof patch.aura_hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(patch.aura_hex)) {
    updatePayload.aura_hex = patch.aura_hex;
  }

  if (Object.keys(updatePayload).length === 0) {
    return;
  }

  if (user && db) {
    const docRef = doc(db, 'users', user.uid, 'sessions', id);
    await updateDoc(docRef, updatePayload);
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
    saveLocalSessions(local);
  }
}

export async function clearHistory(user: User | null): Promise<void> {
  if (user && db) {
    const colRef = collection(db, 'users', user.uid, 'sessions');
    const snap = await getDocs(colRef);
    const docs = snap.docs;
    const CHUNK_SIZE = 400;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
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
