import { Project } from './engine/types';
import { uid } from './engine/defaults';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, collection, doc, getDocs, getDoc, setDoc, writeBatch, deleteDoc, query, orderBy } from 'firebase/firestore';

export interface ProjectMeta { id: string; nombre: string; codigo: string; cliente: string; tipoBuque: string; updatedAt: number }
export interface Repo {
  kind: 'local' | 'firebase';
  list(): Promise<ProjectMeta[]>;
  load(id: string): Promise<Project | null>;
  save(p: Project): Promise<void>;
  remove(id: string): Promise<void>;
  copy(id: string, nombre: string): Promise<Project>;
}
const meta = (p: Project): ProjectMeta => ({ id: p.id, nombre: p.design.nombre, codigo: p.design.codigo, cliente: p.design.cliente, tipoBuque: p.design.tipoBuque, updatedAt: p.updatedAt });
const clean = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

/* ---------- Local (localStorage) ---------- */
const LK = 'hvac.projects';
const readAll = (): Record<string, Project> => { try { return JSON.parse(localStorage.getItem(LK) || '{}'); } catch { return {}; } };
export const localRepo: Repo = {
  kind: 'local',
  async list() { return Object.values(readAll()).map(meta).sort((a, b) => b.updatedAt - a.updatedAt); },
  async load(id) { return readAll()[id] ?? null; },
  async save(p) { const a = readAll(); a[p.id] = { ...clean(p), updatedAt: Date.now() }; localStorage.setItem(LK, JSON.stringify(a)); },
  async remove(id) { const a = readAll(); delete a[id]; localStorage.setItem(LK, JSON.stringify(a)); },
  async copy(id, nombre) { const p = readAll()[id]; if (!p) throw new Error('Proyecto no encontrado'); const c = clean(p); c.id = uid(); c.design.nombre = nombre; c.updatedAt = Date.now(); await localRepo.save(c); return c; },
};

/* ---------- Firebase ---------- */
const env = import.meta.env as Record<string, string | undefined>;
const cfg = { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID };
export const firebaseConfigured = !!(cfg.apiKey && cfg.projectId && cfg.appId);

let app: ReturnType<typeof initializeApp> | null = null;
const fb = () => {
  if (!firebaseConfigured) throw new Error('Firebase no configurado (.env)');
  if (!app) app = initializeApp(cfg);
  return { auth: getAuth(app), db: initializeFirestore(app, { localCache: persistentLocalCache() }) };
};
export const authApi = {
  onChange(cb: (u: User | null) => void) { if (!firebaseConfigured) { cb(null); return () => {}; } return onAuthStateChanged(fb().auth, cb); },
  login: (e: string, p: string) => signInWithEmailAndPassword(fb().auth, e, p),
  register: (e: string, p: string) => createUserWithEmailAndPassword(fb().auth, e, p),
  logout: () => signOut(fb().auth),
};

const SUBS = ['ducts', 'grilles', 'losses'] as const;
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export const firebaseRepo: Repo = {
  kind: 'firebase',
  async list() {
    const { auth, db } = fb(); if (!auth.currentUser) throw new Error('Inicia sesión');
    const snap = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'projects'), orderBy('updatedAt', 'desc')));
    return snap.docs.map(d => d.data().meta as ProjectMeta);
  },
  async load(id) {
    const { auth, db } = fb(); const base = ['users', auth.currentUser!.uid, 'projects', id] as const;
    const head = await getDoc(doc(db, ...base)); if (!head.exists()) return null;
    const h = head.data() as any; const out: any = { id, design: h.design, accessories: h.accessories, materials: h.materials, ovalSizes: h.ovalSizes ?? undefined, circSizes: h.circSizes ?? undefined, updatedAt: h.updatedAt };
    for (const s of SUBS) {
      const q = await getDocs(collection(db, ...base, s));
      out[s] = q.docs.map(d => d.data()).sort((a: any, b: any) => a._i - b._i).map(({ _i, ...r }: any) => r);
    }
    return out as Project;
  },
  async save(p) {
    const { auth, db } = fb(); const uidU = auth.currentUser!.uid; const base = ['users', uidU, 'projects', p.id] as const;
    const now = Date.now(); const c = clean(p);
    await setDoc(doc(db, ...base), { meta: meta({ ...c, updatedAt: now }), design: c.design, accessories: c.accessories, materials: c.materials, ovalSizes: c.ovalSizes ?? null, circSizes: c.circSizes ?? null, updatedAt: now });
    for (const s of SUBS) {
      const existing = await getDocs(collection(db, ...base, s));
      const keep = new Set((c[s] as any[]).map(r => r.uid));
      const ops: (() => void)[] = []; let b = writeBatch(db); let n = 0;
      const flush = async () => { if (n) { await b.commit(); b = writeBatch(db); n = 0; } };
      for (const d of existing.docs) if (!keep.has(d.id)) { b.delete(d.ref); if (++n >= 400) await flush(); }
      for (const [i, r] of (c[s] as any[]).entries()) { b.set(doc(db, ...base, s, r.uid), { ...r, _i: i }); if (++n >= 400) await flush(); }
      await flush(); void ops; void chunk;
    }
  },
  async remove(id) {
    const { auth, db } = fb(); const base = ['users', auth.currentUser!.uid, 'projects', id] as const;
    for (const s of SUBS) { const q = await getDocs(collection(db, ...base, s)); for (const part of chunk(q.docs, 400)) { const b = writeBatch(db); part.forEach(d => b.delete(d.ref)); await b.commit(); } }
    await deleteDoc(doc(db, ...base));
  },
  async copy(id, nombre) { const p = await firebaseRepo.load(id); if (!p) throw new Error('Proyecto no encontrado'); const c = clean(p); c.id = uid(); c.design.nombre = nombre; await firebaseRepo.save(c); return c; },
};
