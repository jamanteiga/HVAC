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
