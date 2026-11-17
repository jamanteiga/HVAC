import { saveAs } from 'file-saver';
import { Project } from '../engine/types';
import { DEFAULT_ACCESSORIES, DEFAULT_MATERIALS, defaultDesign, uid } from '../engine/defaults';

const w: any = typeof window !== 'undefined' ? window : {};
let handle: any = null; // fichero abierto/guardado (solo navegadores con File System Access: Chrome, Edge)
export const hasFileSystem = () => typeof w.showSaveFilePicker === 'function';
export const currentFileName = () => (handle ? handle.name : '');
export const forgetFile = () => { handle = null; };

const slug = (s: string) => s.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
const suggested = (p: Project) => `HVAC_${slug(p.design.codigo || p.design.nombre || 'proyecto')}.json`;
const FILETYPES = [{ description: 'Proyecto HVAC (.json)', accept: { 'application/json': ['.json'] } }];

/** Valida y completa un proyecto leído de fichero. */
export function parseProject(text: string): Project {
  const raw = JSON.parse(text);
  const p = raw && raw.project ? raw.project : raw;
  if (!p || typeof p !== 'object' || !p.design || !Array.isArray(p.ducts) || !Array.isArray(p.grilles) || !Array.isArray(p.losses)) throw new Error('El fichero no es un proyecto HVAC válido.');
  return { ...p, id: p.id || uid(), design: { ...defaultDesign(), ...p.design }, accessories: p.accessories ?? DEFAULT_ACCESSORIES.map(a => ({ ...a })), materials: p.materials ?? DEFAULT_MATERIALS.map(m => ({ ...m })), updatedAt: Date.now() };
}

/** Guarda el proyecto en un .json. Devuelve el nombre del fichero ('' si se cancela). */
export async function saveToFile(p: Project, saveAsNew = false): Promise<string> {
  const text = JSON.stringify({ app: 'HVAC', version: 1, savedAt: new Date().toISOString(), project: p }, null, 2);
  if (hasFileSystem()) {
    try {
      if (!handle || saveAsNew) handle = await w.showSaveFilePicker({ suggestedName: suggested(p), types: FILETYPES });
      const ws = await handle.createWritable(); await ws.write(text); await ws.close();
      return handle.name;
    } catch (e: any) { if (e?.name === 'AbortError') return ''; throw e; }
  }
  saveAs(new Blob([text], { type: 'application/json' }), suggested(p));
  return suggested(p);
}

/** Abre un .json. Devuelve null si se cancela. */
export async function openFromFile(): Promise<{ project: Project; name: string } | null> {
  if (typeof w.showOpenFilePicker === 'function') {
    try {
      const [h] = await w.showOpenFilePicker({ types: FILETYPES, multiple: false });
      const file = await h.getFile(); const project = parseProject(await file.text()); handle = h; return { project, name: file.name };
    } catch (e: any) { if (e?.name === 'AbortError') return null; throw e; }
  }
  return new Promise((resolve, reject) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = async () => { const f = i.files?.[0]; if (!f) return resolve(null); try { resolve({ project: parseProject(await f.text()), name: f.name }); } catch (e) { reject(e); } };
    i.click();
  });
}
