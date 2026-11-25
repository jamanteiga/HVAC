// Lectura de coordenadas de P1 y P2 a partir del texto reconocido (OCR). Decimales con punto.
export type Coords = Partial<Record<'x1' | 'y1' | 'z1' | 'x2' | 'y2' | 'z2', string>>;
const NUM = '[-+]?\\d+(?:\\.\\d+)?';
export function parseCoords(raw: string): Coords {
  const t = raw.replace(/[−–—]/g, '-').replace(/(\d),(\d)/g, '$1.$2').replace(/\r/g, '');
  const out: Coords = {};
  const put = (axis: string, idx: number, v: string) => { if (idx === 1 || idx === 2) out[(axis.toLowerCase() + idx) as keyof Coords] = String(parseFloat(v)); };
  // 1) líneas «P1 … x y z» / «P2 … x y z»
  const rl = new RegExp(`\\bP\\s*([12])\\b[^\\d\\n-]*(${NUM})[^\\d\\n-]+(${NUM})[^\\d\\n-]+(${NUM})`, 'gi');
  for (const m of t.matchAll(rl)) { put('x', +m[1], m[2]); put('y', +m[1], m[3]); put('z', +m[1], m[4]); }
  if (Object.keys(out).length === 6) return out;
  // 2) etiquetas X1=…, X=…, X: …
  const conIdx = [...t.matchAll(new RegExp(`\\b([XYZ])\\s*([12])\\s*[:=]?\\s*(${NUM})`, 'gi'))];
  const idxOk = conIdx.filter(m => /[:=]/.test(m[0]) || /\s/.test(m[0].slice(1, 2)) === false);
  if (idxOk.length >= 6) { idxOk.forEach(m => put(m[1], +m[2], m[3])); if (Object.keys(out).length >= 6) return out; }
  const sinIdx = [...t.matchAll(new RegExp(`\\b([XYZ])\\s*[:=]\\s*(${NUM})`, 'gi'))].concat([...t.matchAll(new RegExp(`\\b([XYZ])\\s+(${NUM})`, 'gi'))]);
  const cnt: Record<string, number> = { X: 0, Y: 0, Z: 0 };
  const orden = [...new Map(sinIdx.sort((a, b) => a.index! - b.index!).map(m => [m.index, m])).values()];
  for (const m of orden) { const a = m[1].toUpperCase(); cnt[a]++; put(a, cnt[a], m[2]); }
  if (Object.keys(out).length >= 6) return out;
  // 3) sin etiquetas: seis números seguidos (x1 y1 z1 x2 y2 z2)
  const nums = [...t.matchAll(new RegExp(NUM, 'g'))].map(m => m[0]);
  if (nums.length === 6) { ['x1', 'y1', 'z1', 'x2', 'y2', 'z2'].forEach((k, i) => (out[k as keyof Coords] = String(parseFloat(nums[i])))); }
  return out;
}

// ---- Capturas de pantalla ruidosas (p. ej. Foran «Distancia»): varias lecturas OCR + votación + comprobación con DX/DY/DZ ----
const DEC = /-?\d{1,7}\.\d{1,3}/g;
const norm = (v: string) => String(parseFloat(v));
const nDec = (v: string) => (v.split('.')[1] ?? '').length;
interface Fila { eje: 'X' | 'Y' | 'Z'; a: string; b: string; d?: string }
function filas(texto: string): Fila[] {
  const t = texto.replace(/[−–—]/g, '-'), res: { eje?: 'X' | 'Y' | 'Z'; a: string; b: string; d?: string }[] = [];
  for (const l of t.split('\n')) {
    const m = [...l.matchAll(DEC)]; if (m.length < 2) continue;
    const a = parseFloat(m[0][0]), b = parseFloat(m[1][0]);
    if (Math.abs(a - b) > 0.2 * Math.max(Math.abs(a), Math.abs(b), 1)) continue; // la 2.ª cifra es un incremento, no P2
    const pre = l.slice(0, m[0].index), lab = /(?:^|[^A-Za-z])([XYZ])\s*[:=;.]?\s*[^A-Za-z]*$/i.exec(pre);
    res.push({ eje: lab ? (lab[1].toUpperCase() as 'X' | 'Y' | 'Z') : undefined, a: m[0][0], b: m[1][0], d: m[2]?.[0] });
  }
  const usados = new Set(res.filter(r => r.eje).map(r => r.eje)), libres = (['X', 'Y', 'Z'] as const).filter(e => !usados.has(e));
  return res.map(r => ({ ...r, eje: r.eje ?? libres.shift() })).filter(r => r.eje) as Fila[];
}
export function combinarLecturas(textos: string[]): { coords: Coords; avisos: string[]; completo: boolean } {
  const tokens = textos.map(t => new Set([...t.replace(/[−–—]/g, '-').matchAll(DEC)].map(m => norm(m[0]))));
  const cand: Record<string, Set<string>> = {}, delta: Record<string, string[]> = {};
  for (const t of textos) for (const f of filas(t)) {
    (cand[f.eje.toLowerCase() + '1'] ??= new Set()).add(norm(f.a)); (cand[f.eje.toLowerCase() + '2'] ??= new Set()).add(norm(f.b));
    if (f.d) (delta[f.eje] ??= []).push(f.d);
  }
  const score = (v: string) => tokens.filter(s => s.has(v)).length;
  const coords: Coords = {}, avisos: string[] = [], pts: Record<string, number> = {};
  for (const k of Object.keys(cand)) {
    const orden = [...cand[k]].sort((x, y) => score(y) - score(x) || y.length - x.length);
    coords[k as keyof Coords] = orden[0]; pts[k] = score(orden[0]);
    if (pts[k] < 2 && textos.length > 1) avisos.push(`${k.toUpperCase()} solo se leyó una vez`);
  }
  let verificados = 0;
  for (const e of ['X', 'Y', 'Z']) {
    const a = coords[(e.toLowerCase() + '1') as keyof Coords], b = coords[(e.toLowerCase() + '2') as keyof Coords], ds = delta[e];
    if (a == null || b == null || !ds?.length) continue;
    const dif = Math.abs(parseFloat(b) - parseFloat(a));
    if (ds.some(d => Math.abs(dif - Math.abs(parseFloat(d))) <= Math.pow(10, -nDec(d)) + 0.011)) verificados++;
    else avisos.push(`${e}1/${e}2 no coinciden con D${e} (${ds[0]}): revísalos`);
  }
  const completo = Object.keys(coords).length === 6 && verificados >= 2 && avisos.length === 0;
  return { coords, avisos, completo };
}
