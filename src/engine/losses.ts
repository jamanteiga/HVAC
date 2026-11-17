import { Accessory, DesignData, LossRow, Material } from './types';
import { area, equivalentDiameter, hydraulicDiameter, Dims } from './geometry';
import { colebrook } from './friction';
import { airProps } from './air';
import { defaultLocales } from './defaults';
import { pos } from './units';

export interface LossCalc {
  idTramo: string; idPadre: string;
  k: number | null; v: number | null; area: number | null;
  dh: number | null; de: number | null;
  rough: number | null; re: number | null; f: number | null;
  dp: number | null; dpTotal: number | null; isMax: boolean;
  noise: number | null; warn?: string;
}
export interface LossSummary { rows: LossCalc[]; max: number; rho: number; nu: number }

export const idTramo = (r: LossRow) => `${r.n1}${r.n2 == null ? '.0' : '.' + r.n2}${r.n3 == null ? '' : '.' + r.n3}`;
export const idPadre = (r: LossRow) => (r.n2 == null ? 'VENTILADOR' : r.n3 == null ? `${r.n1}.0` : `${r.n1}.${r.n2}`);

export function rowDims(r: LossRow): Dims {
  if (r.tipo === 'Rectangular') return { shape: 'Rectangular', a: r.alto, b: r.ancho };
  if (r.tipo === 'Oval') return { shape: 'Oval', a: r.ovAlto, b: r.ovAncho };
  return { shape: 'Circular', d: r.diam };
}

export function calcLosses(rows: LossRow[], d: DesignData, accessories: Accessory[], materials: Material[], tC?: number): LossSummary {
  const air = airProps(tC ?? d.tIntVerano, d.presion);
  const locales = d.locales ?? defaultLocales();
  const accMap = new Map(accessories.map(a => [a.name.trim(), a.k]));
  const matMap = new Map(materials.map(m => [m.name.trim(), m.roughness]));
  const out: LossCalc[] = rows.map(r => ({
    idTramo: idTramo(r), idPadre: idPadre(r), k: null, v: null, area: null, dh: null, de: null,
    rough: null, re: null, f: null, dp: null, dpTotal: null, isMax: false, noise: null,
  }));

  // 1) pérdidas por fila
  rows.forEach((r, i) => {
    const o = out[i]; const g = rowDims(r);
    o.k = accMap.has(r.accesorio.trim()) ? accMap.get(r.accesorio.trim())! : null;
    o.area = area(g); o.dh = hydraulicDiameter(g); o.de = equivalentDiameter(g);
    o.rough = matMap.get(r.material.trim()) ?? null;
    if (o.k == null) o.warn = 'Accesorio no encontrado';
    if (!o.area || !pos(r.caudal)) return;
    o.v = r.caudal / 3600 / o.area;
    if (!o.dh) return;
    const loc = r.local ? locales.find(l => l.name === r.local) : undefined;
    const ap = loc?.nbq ? airProps(tC ?? d.tIntVerano, d.presion + loc.overP) : air; // local NBQ en sobrepresión
    o.re = (o.v * o.dh) / ap.nu;
    o.f = o.rough != null ? colebrook(o.re, o.rough / 1000, o.dh) : null;
    const q = (ap.rho * o.v * o.v) / 2;
    if (r.accesorio.trim() === 'Conducto') o.dp = o.f != null && pos(r.longitud) ? o.f * ((r.longitud / 1000) / o.dh) * q : (pos(r.longitud) ? null : 0);
    else o.dp = o.k != null ? o.k * q : null;
    // ruido
    const a = r.accesorio.toLowerCase();
    const corr = r.accesorio.trim() === 'Conducto' ? -20 : a.includes('codo') || a.includes('derivación') ? -10 : a.includes('rejilla') || a.includes('difusor') ? 0 : -15;
    o.noise = corr + 10 * Math.log10(o.area) + 50 * Math.log10(o.v) + 55;
  });

  // 2) acumulado por tramo (una fila por accesorio, agrupadas por ID TRAMO)
  const sums = new Map<string, number>();
  rows.forEach((_, i) => sums.set(out[i].idTramo, (sums.get(out[i].idTramo) ?? 0) + (out[i].dp ?? 0)));
  const endTotal = new Map<string, number>();
  const resolving = new Set<string>();
  const parentOf = new Map<string, string>();
  rows.forEach((r, i) => parentOf.set(out[i].idTramo, out[i].idPadre));
  const tramoEnd = (id: string): number => {
    if (id === 'VENTILADOR') return 0;
    if (endTotal.has(id)) return endTotal.get(id)!;
    if (resolving.has(id)) return 0; // ciclo
    if (!sums.has(id)) return 0;     // padre inexistente
    resolving.add(id);
    const v = tramoEnd(parentOf.get(id) ?? 'VENTILADOR') + (sums.get(id) ?? 0);
    resolving.delete(id); endTotal.set(id, v); return v;
  };
  const run = new Map<string, number>();
  let max = 0;
  rows.forEach((_, i) => {
    const o = out[i];
    const parent = o.idPadre === 'VENTILADOR' ? 0 : tramoEnd(o.idPadre);
    if (o.idPadre !== 'VENTILADOR' && !sums.has(o.idPadre)) o.warn = (o.warn ? o.warn + '; ' : '') + `Padre ${o.idPadre} inexistente`;
    const acc = (run.get(o.idTramo) ?? 0) + (o.dp ?? 0);
    run.set(o.idTramo, acc);
    o.dpTotal = parent + acc;
    if (o.dpTotal > max) max = o.dpTotal;
  });
  out.forEach(o => { o.isMax = o.dpTotal != null && max > 0 && Math.abs(o.dpTotal - max) < 1e-9; });
  return { rows: out, max, rho: air.rho, nu: air.nu };
}
