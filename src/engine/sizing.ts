import { Shape } from './types';
import { area, hydraulicDiameter } from './geometry';
import { colebrook } from './friction';
import { airProps } from './air';

export type Method = 'friccion' | 'velocidad' | 'recuperacion';
export interface SizeInput {
  method: Method; shape: Shape;
  q: number;            // m³/h
  roughness: number;    // mm
  tC: number; pPa?: number;
  ratio: number;        // ancho/alto (rect) o eje mayor/menor (oval)
  step: number;         // mm
  frictionTarget?: number; // Pa/m
  velTarget?: number;      // m/s
  v1?: number; regain?: number; length?: number; // recuperación estática (m, m/s)
  maxHeight?: number | null; // mm limitación de altura
}
export interface SizeResult {
  shape: Shape; alto: number | null; ancho: number | null; diam: number | null;
  velocity: number; dpPerM: number; re: number; f: number; note?: string;
}

const roundUp = (x: number, step: number) => Math.ceil(x / step - 1e-9) * step;

/** Pérdida unitaria Pa/m de una sección. */
export function unitLoss(q_m3h: number, g: { shape: Shape; a?: number; b?: number; d?: number }, rough: number, tC: number, p = 101325) {
  const air = airProps(tC, p);
  const A = area(g)!; const dh = hydraulicDiameter(g)!;
  const v = q_m3h / 3600 / A;
  const re = (v * dh) / air.nu;
  const f = colebrook(re, rough / 1000, dh);
  return { v, re, f, dp: f * (1 / dh) * air.rho * v * v / 2, dh, A };
}

function circFromArea(A: number) { return Math.sqrt((4 * A) / Math.PI) * 1000; }

/** Diámetro circular con pérdida unitaria objetivo (bisección). */
function circForFriction(q: number, R: number, rough: number, tC: number, p?: number) {
  let lo = 20, hi = 5000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const dp = unitLoss(q, { shape: 'Circular', d: mid }, rough, tC, p).dp;
    if (dp > R) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Pasa de un diámetro circular equivalente (Huebscher) a H/W. */
function fromEquivalent(De: number, ratio: number) {
  const H = (De * Math.pow(ratio + 1, 0.25)) / (1.3 * Math.pow(ratio, 0.625));
  return { H, W: H * ratio };
}

function finish(inp: SizeInput, dims: { a?: number; b?: number; d?: number }, note?: string): SizeResult {
  const r = unitLoss(inp.q, { shape: inp.shape, ...dims }, inp.roughness, inp.tC, inp.pPa);
  return { shape: inp.shape, alto: dims.a ?? null, ancho: dims.b ?? null, diam: dims.d ?? null, velocity: r.v, dpPerM: r.dp, re: r.re, f: r.f, note };
}

export function sizeDuct(inp: SizeInput): SizeResult {
  const { q, shape, step, ratio } = inp;
  let note: string | undefined;
  // 1) Área/diámetro de referencia según método
  let A: number; let Dcirc: number;
  if (inp.method === 'friccion') {
    Dcirc = circForFriction(q, inp.frictionTarget ?? 1, inp.roughness, inp.tC, inp.pPa);
    A = (Math.PI / 4) * (Dcirc / 1000) ** 2;
    if (shape !== 'Circular') {
      // misma fricción: usar diámetro equivalente (Huebscher)
      const { H, W } = fromEquivalent(Dcirc, ratio);
      return sizeFromHW(inp, H, W);
    }
  } else if (inp.method === 'velocidad') {
    A = q / 3600 / (inp.velTarget ?? 8);
    Dcirc = circFromArea(A);
  } else {
    // Recuperación estática: R·ρ/2·(v1²−v2²) = ΔP fricción del tramo (v medio)
    const air = airProps(inp.tC, inp.pPa);
    const v1 = inp.v1 ?? 10, R = inp.regain ?? 0.75, L = inp.length ?? 3;
    let lo = 0.3, hi = v1;
    const resid = (v2: number) => {
      const vm = (v1 + v2) / 2; const Am = q / 3600 / vm; const D = circFromArea(Am);
      const dp = unitLoss(q, { shape: 'Circular', d: D }, inp.roughness, inp.tC, inp.pPa).dp * L;
      return R * air.rho * (v1 * v1 - v2 * v2) / 2 - dp;
    };
    if (resid(hi) >= 0 && resid(lo) >= 0) { note = 'La recuperación supera la fricción incluso a 0,3 m/s'; }
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (resid(mid) > 0) hi = mid; else lo = mid; }
    const v2 = (lo + hi) / 2;
    A = q / 3600 / v2; Dcirc = circFromArea(A);
    if (v2 >= v1 - 1e-6) note = 'Sin recuperación posible: velocidad de salida ≥ entrada';
  }
  if (shape === 'Circular') return finish(inp, { d: roundUp(Dcirc, step) }, note);
  if (shape === 'Rectangular') {
    let H = Math.sqrt((A * 1e6) / ratio), W = H * ratio;
    return sizeFromHW(inp, H, W, true, note);
  }
  // Oval (elipse): A = π/4·a·b
  const H = Math.sqrt((4 * A * 1e6) / (Math.PI * ratio));
  return sizeFromHW(inp, H, H * ratio, true, note);
}

function sizeFromHW(inp: SizeInput, H: number, W: number, byArea = false, note?: string): SizeResult {
  const { step } = inp;
  if (inp.maxHeight && H > inp.maxHeight) {
    const k = H * W; H = inp.maxHeight; W = k / H; note = (note ? note + '. ' : '') + 'Altura limitada';
  }
  H = roundUp(H, step); W = roundUp(W, step);
  return finish(inp, { a: H, b: W }, note);
}
