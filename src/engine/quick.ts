// Dimensionado rápido: caudal + velocidad -> medidas INTERIORES.
import { flatOvalArea } from './geometry';
import { unitLoss } from './sizing';

export const R20_SERIES = [63, 71, 80, 90, 100, 112, 125, 140, 160, 180, 200, 224, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000];

/** TABLA PROVISIONAL (eje menor R20 × eje mayor en pasos de 50). Sustituir por la del fabricante. */
export function provisionalOval(): { minor: number; major: number }[] {
  const out: { minor: number; major: number }[] = [];
  for (const b of [63, 80, 100, 125, 160, 200, 250, 315, 400, 500]) {
    for (let a = Math.ceil((b * 1.5) / 50) * 50; a <= Math.min(1600, b * 6); a += 50) if (a > b) out.push({ minor: b, major: a });
  }
  return out;
}

export const ceil5 = (x: number) => Math.ceil(x / 5 - 1e-9) * 5;
export const round5 = (x: number) => Math.round(x / 5) * 5;
export const requiredArea = (q_m3h: number, v: number) => q_m3h / 3600 / v; // m²

export interface Ctx { rough: number; tC: number; p?: number }
export interface Opt { label: string; a: number | null; b: number | null; d: number | null; area: number; v: number; dp: number; dev: number; ok: boolean; best?: boolean; extra?: string }

const mk = (shape: 'Circular' | 'Rectangular' | 'Oval', q: number, vt: number, ctx: Ctx, dims: { a?: number; b?: number; d?: number }, area: number): Opt => {
  const u = unitLoss(q, { shape, ...dims }, ctx.rough, ctx.tC, ctx.p);
  return { label: '', a: dims.a ?? null, b: dims.b ?? null, d: dims.d ?? null, area, v: u.v, dp: u.dp, dev: (u.v - vt) / vt, ok: u.v <= vt * (1 + 1e-9) };
};

/** Circulares normalizados: la menor que no supera la velocidad + vecinas. */
export function circularOptions(q: number, vt: number, series: number[], ctx: Ctx): Opt[] {
  const A = requiredArea(q, vt);
  const s = [...series].sort((x, y) => x - y);
  let i = s.findIndex(d => (Math.PI / 4) * (d / 1000) ** 2 >= A - 1e-12);
  if (i < 0) i = s.length - 1;
  const closest = s.reduce((bi, d, k) => Math.abs((Math.PI / 4) * (d / 1000) ** 2 - A) < Math.abs((Math.PI / 4) * (s[bi] / 1000) ** 2 - A) ? k : bi, 0);
  const out: Opt[] = [];
  for (let k = Math.max(0, i - 2); k <= Math.min(s.length - 1, i + 2); k++) {
    const o = mk('Circular', q, vt, ctx, { d: s[k] }, (Math.PI / 4) * (s[k] / 1000) ** 2);
    o.label = k === i ? 'Recomendado (v ≤ objetivo)' : k === closest ? 'Más próximo' : k < i ? 'Menor' : 'Mayor';
    o.best = k === i; out.push(o);
  }
  return out;
}

export interface RectOpts { min: number; maxH: number; stepH: number; mode: 'exceso' | 'proximo'; fixH?: number | null; fixW?: number | null; maxRatio: number }
/** Rectangulares con lados múltiplos de 5 mm. */
export function rectOptions(q: number, vt: number, ctx: Ctx, o: RectOpts): Opt[] {
  const A = requiredArea(q, vt) * 1e6; // mm²
  const rnd = o.mode === 'exceso' ? ceil5 : round5;
  const mkRect = (H: number, W: number, label = '') => { const r = mk('Rectangular', q, vt, ctx, { a: H, b: W }, (H * W) / 1e6); r.label = label; const ratio = Math.max(H, W) / Math.min(H, W); r.extra = `${ratio.toFixed(2)}:1`; if (label && ratio > o.maxRatio + 1e-9) r.label = `${label} · supera 1:${o.maxRatio}`; return r; };
  const out: Opt[] = [];
  if (o.fixH && o.fixH > 0) out.push(mkRect(o.fixH, Math.max(5, rnd(A / o.fixH)), `Alto fijo ${o.fixH}`));
  if (o.fixW && o.fixW > 0) out.push(mkRect(Math.max(5, rnd(A / o.fixW)), o.fixW, `Ancho fijo ${o.fixW}`));
  const sweep: Opt[] = [];
  for (let H = Math.max(5, o.min); H <= o.maxH + 1e-9; H += o.stepH) {
    if (A / H < H - 1e-9 && sweep.length) break; // más allá de la sección cuadrada no hay alternativas útiles (H ≤ W)
    const W = Math.max(rnd(A / H), H); // H ≤ W
    if (W / H > o.maxRatio) continue;
    sweep.push(mkRect(H, W));
  }
  if (sweep.length) { const k = sweep.reduce((bi, r, i) => Math.abs(r.dev) < Math.abs(sweep[bi].dev) ? i : bi, 0); sweep[k].best = true; sweep[k].label = 'Más próximo'; }
  return [...out.map(r => ({ ...r, best: false })), ...sweep];
}

export interface OvalOpts { maxMinor?: number | null; maxRatio: number; mode: 'exceso' | 'proximo' }
/** Ovales de la tabla: por cada eje menor, el menor eje mayor que cumple. */
export function ovalOptions(q: number, vt: number, table: { minor: number; major: number }[], ctx: Ctx, o: OvalOpts): Opt[] {
  const A = requiredArea(q, vt) * 1e6;
  const byMinor = new Map<number, { minor: number; major: number }[]>();
  for (const t of table) { if (!(t.minor > 0 && t.major >= t.minor)) continue; if (o.maxMinor && t.minor > o.maxMinor) continue; if (t.major / t.minor > o.maxRatio) continue; (byMinor.get(t.minor) ?? byMinor.set(t.minor, []).get(t.minor)!).push(t); }
  const out: Opt[] = [];
  for (const [minor, rows] of [...byMinor.entries()].sort((a, b) => a[0] - b[0])) {
    rows.sort((x, y) => x.major - y.major);
    let pick = rows.find(r => flatOvalArea(r.major, minor) >= A - 1e-6);
    if (o.mode === 'proximo') pick = rows.reduce((bi, r) => Math.abs(flatOvalArea(r.major, minor) - A) < Math.abs(flatOvalArea(bi.major, minor) - A) ? r : bi, rows[0]);
    if (!pick) continue;
    const r = mk('Oval', q, vt, ctx, { a: pick.major, b: minor }, flatOvalArea(pick.major, minor) / 1e6);
    r.extra = `${(pick.major / minor).toFixed(2)}:1`; out.push(r);
  }
  if (out.length) { const k = out.reduce((bi, r, i) => Math.abs(r.dev) < Math.abs(out[bi].dev) ? i : bi, 0); out[k].best = true; out[k].label = 'Más próximo'; }
  return out;
}

/** Parsea texto pegado desde Excel (dos columnas: menor, mayor). */
export function parseOvalTable(text: string): { minor: number; major: number }[] {
  const rows: { minor: number; major: number }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.replace(/[x×]/gi, ' ').match(/\d+(?:[.,]\d+)?/g); if (!m || m.length < 2) continue;
    const a = parseFloat(m[0].replace(',', '.')), b = parseFloat(m[1].replace(',', '.'));
    rows.push({ minor: Math.min(a, b), major: Math.max(a, b) });
  }
  return rows;
}
