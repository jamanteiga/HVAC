import { create } from 'zustand';
import { DuctRow, GrilleRow, LossRow, Project, DesignData } from './engine/types';
import { DEFAULT_ACCESSORIES, DEFAULT_MATERIALS, defaultDesign, uid } from './engine/defaults';
import { renumber } from './engine/ducts';
import { renumberG } from './engine/grilles';

export const newDuct = (): DuctRow => ({ uid: uid(), id: 0, sistema: null, tipo: 3, plenum: false, eAlto: null, eAncho: null, eDiam: null, eCaudal: null, fAlto: null, fAncho: null, fDiam: null, longitud: null, elemento: 'Conducto', equipo: '', bloque: '', funcional: false, detalle: false, soportado: false });
export const newGrille = (): GrilleRow => ({ uid: uid(), nr: 0, sws: 510, idRejilla: '', descripcion: '', caudal: null, mfr: 'Munters', partNo: '', area: null, velReq: null, alto: null, ancho: null });
export const newLoss = (): LossRow => ({ uid: uid(), n1: 1, n2: null, n3: null, sistema: '', nLinea: '', tipo: 'Circular', accesorio: 'Conducto', caudal: null, alto: null, ancho: null, ovAlto: null, ovAncho: null, diam: null, longitud: null, material: 'Acero galvanizado' });

export const newProject = (): Project => ({
  id: uid(), design: defaultDesign(), ducts: [], grilles: [], losses: [],
  accessories: DEFAULT_ACCESSORIES.map(a => ({ ...a })), materials: DEFAULT_MATERIALS.map(m => ({ ...m })), updatedAt: Date.now(),
});

type Coll = 'ducts' | 'grilles' | 'losses';
const fixes = { ducts: renumber, grilles: renumberG, losses: (r: LossRow[]) => r } as const;
const makers = { ducts: newDuct, grilles: newGrille, losses: newLoss } as const;

interface S {
  project: Project;
  selected: Record<Coll, string | null>;
  setSelected: (c: Coll, id: string | null) => void;
  setDesign: (p: Partial<DesignData>) => void;
  setProject: (p: Project) => void;
  reset: () => void;
  update: (c: Coll, uid: string, patch: Record<string, unknown>) => void;
  add: (c: Coll, at?: { uid: string; where: 'above' | 'below' } | null) => void;
  remove: (c: Coll, uid: string) => void;
  replaceRows: (c: Coll, rows: any[]) => void;
  setTables: (p: Partial<Pick<Project, 'accessories' | 'materials'>>) => void;
}

const KEY = 'hvac.current';
const load = (): Project => { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* */ } return newProject(); };

export const useStore = create<S>((set) => ({
  project: load(),
  selected: { ducts: null, grilles: null, losses: null },
  setSelected: (c, id) => set(s => ({ selected: { ...s.selected, [c]: id } })),
  setDesign: p => set(s => ({ project: { ...s.project, design: { ...s.project.design, ...p }, updatedAt: Date.now() } })),
  setProject: p => set({ project: p }),
  reset: () => set({ project: newProject() }),
  update: (c, id, patch) => set(s => ({ project: { ...s.project, [c]: (s.project[c] as any[]).map(r => r.uid === id ? { ...r, ...patch } : r), updatedAt: Date.now() } })),
  add: (c, at) => set(s => {
    const rows = [...(s.project[c] as any[])]; const row = makers[c]();
    if (at) {
      const i = rows.findIndex(r => r.uid === at.uid);
      const base = rows[i];
      if (c === 'losses' && base) Object.assign(row, { n1: base.n1, n2: base.n2, n3: base.n3, sistema: base.sistema, nLinea: base.nLinea, tipo: base.tipo, material: base.material });
      rows.splice(i < 0 ? rows.length : at.where === 'above' ? i : i + 1, 0, row);
    } else {
      const last = rows[rows.length - 1];
      if (c === 'losses' && last) Object.assign(row, { n1: last.n1, n2: last.n2, n3: last.n3, sistema: last.sistema, nLinea: last.nLinea, tipo: last.tipo, material: last.material });
      rows.push(row);
    }
    return { project: { ...s.project, [c]: (fixes[c] as any)(rows), updatedAt: Date.now() } };
  }),
  remove: (c, id) => set(s => ({ project: { ...s.project, [c]: (fixes[c] as any)((s.project[c] as any[]).filter(r => r.uid !== id)), updatedAt: Date.now() } })),
  replaceRows: (c, rows) => set(s => ({ project: { ...s.project, [c]: (fixes[c] as any)(rows), updatedAt: Date.now() } })),
  setTables: p => set(s => ({ project: { ...s.project, ...p, updatedAt: Date.now() } })),
}));

let t: any;
useStore.subscribe(s => { clearTimeout(t); t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s.project)); } catch { /* */ } }, 400); });
