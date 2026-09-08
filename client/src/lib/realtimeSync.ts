// ============================================================
// APYMSA — realtimeSync
// Cliente del estado compartido en tiempo real. Dos backends intercambiables:
//   • Firebase Realtime Database  → funciona por internet con el link de Pages
//     (se activa al llenar client/src/lib/firebaseConfig.ts).
//   • SSE del servidor de desarrollo → modo local / misma red (fallback).
// La interfaz pública es la misma para ambos: fetchState / pushState /
// resetState / subscribe, para que AppContext no dependa del backend.
// ============================================================
import { firebaseConfig, firebaseEnabled, FIREBASE_STATE_PATH } from './firebaseConfig';

// Identificador único de este cliente (para ignorar el eco de mis propios envíos).
export const CLIENT_ID: string =
  (globalThis.crypto?.randomUUID?.() ?? `c${Math.random().toString(36).slice(2)}${Date.now()}`).slice(0, 12);

export interface RealtimeSnapshot { version: number; snapshot: unknown | null; }
export type RealtimeEvent =
  | { type: 'state'; version: number; senderId: string | null; snapshot: unknown | null }
  | { type: 'reset'; version: number };

// ── Backend Firebase (lazy) ───────────────────────────────────
let dbRefPromise: Promise<{ ref: any; db: typeof import('firebase/database') }> | null = null;
async function getDbRef() {
  if (!dbRefPromise) {
    dbRefPromise = (async () => {
      const { initializeApp, getApps } = await import('firebase/app');
      const db = await import('firebase/database');
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      return { ref: db.ref(db.getDatabase(app), FIREBASE_STATE_PATH), db };
    })();
  }
  return dbRefPromise;
}

// El snapshot se guarda como string JSON en la RTDB: evita problemas con
// `undefined` y con la coerción de arreglos de Firebase.
const decode = (val: any): RealtimeSnapshot =>
  !val || !val.snapshotJson
    ? { version: val?.v ?? 0, snapshot: null }
    : { version: val.v ?? 0, snapshot: JSON.parse(val.snapshotJson) };

// ── Backend SSE local ─────────────────────────────────────────
const BASE = '/api/realtime';

// ── API pública ───────────────────────────────────────────────
export async function fetchState(): Promise<RealtimeSnapshot | null> {
  try {
    if (firebaseEnabled) {
      const { ref, db } = await getDbRef();
      const snap = await db.get(ref);
      return decode(snap.val());
    }
    const r = await fetch(`${BASE}/state`);
    return r.ok ? ((await r.json()) as RealtimeSnapshot) : null;
  } catch {
    return null;
  }
}

export async function pushState(snapshot: unknown): Promise<void> {
  try {
    if (firebaseEnabled) {
      const { ref, db } = await getDbRef();
      await db.set(ref, { v: Date.now(), senderId: CLIENT_ID, snapshotJson: JSON.stringify(snapshot) });
      return;
    }
    await fetch(`${BASE}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: CLIENT_ID, snapshot }),
    });
  } catch {
    /* sin conexión: se reintentará en el siguiente cambio */
  }
}

export async function resetState(): Promise<void> {
  try {
    if (firebaseEnabled) {
      const { ref, db } = await getDbRef();
      await db.set(ref, null);
      return;
    }
    await fetch(`${BASE}/reset`, { method: 'POST' });
  } catch {
    /* ignore */
  }
}

// Suscripción en tiempo real. Devuelve una función para cerrar la conexión.
export function subscribe(onEvent: (evt: RealtimeEvent) => void): () => void {
  if (firebaseEnabled) {
    let off = () => {};
    getDbRef().then(({ ref, db }) => {
      off = db.onValue(ref, (snap: any) => {
        const val = snap.val();
        if (!val || !val.snapshotJson) { onEvent({ type: 'reset', version: val?.v ?? Date.now() }); return; }
        onEvent({ type: 'state', version: val.v ?? Date.now(), senderId: val.senderId ?? null, snapshot: JSON.parse(val.snapshotJson) });
      });
    }).catch(() => {});
    return () => { try { off(); } catch { /* noop */ } };
  }

  let es: EventSource | null = null;
  try {
    es = new EventSource(`${BASE}/events`);
    es.onmessage = (e) => { try { onEvent(JSON.parse(e.data) as RealtimeEvent); } catch { /* ping */ } };
  } catch { /* EventSource no disponible */ }
  return () => { try { es?.close(); } catch { /* noop */ } };
}
