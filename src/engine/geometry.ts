import { Shape } from './types';
import { pos } from './units';

export interface Dims { shape: Shape; a?: number | null; b?: number | null; d?: number | null } // mm

/** Oval plano (extremos semicirculares): menor b, mayor a. */
export const flatOvalArea = (a: number, b: number) => { const mn = Math.min(a, b), mx = Math.max(a, b); return (Math.PI * mn * mn) / 4 + mn * (mx - mn); }; // mm²
export const flatOvalPerimeter = (a: number, b: number) => { const mn = Math.min(a, b), mx = Math.max(a, b); return Math.PI * mn + 2 * (mx - mn); }; // mm

/** Área en m². Rect: a=alto,b=ancho. Oval plano: a,b ejes. Circ: d. */
export function area(g: Dims): number | null {
  if (g.shape === 'Rectangular' && pos(g.a) && pos(g.b)) return (g.a * g.b) / 1e6;
  if (g.shape === 'Oval' && pos(g.a) && pos(g.b)) return flatOvalArea(g.a, g.b) / 1e6;
  if (g.shape === 'Circular' && pos(g.d)) return (Math.PI / 4) * g.d * g.d / 1e6;
  return null;
}

/** Diámetro hidráulico Dh=4A/P en metros. */
export function hydraulicDiameter(g: Dims): number | null {
  if (g.shape === 'Rectangular' && pos(g.a) && pos(g.b)) return (2 * g.a * g.b) / (g.a + g.b) / 1000;
  if (g.shape === 'Oval' && pos(g.a) && pos(g.b)) return (4 * flatOvalArea(g.a, g.b)) / flatOvalPerimeter(g.a, g.b) / 1000;
  if (g.shape === 'Circular' && pos(g.d)) return g.d / 1000;
  return null;
}

/** Diámetro equivalente (mismo caudal y fricción) en metros: Huebscher (rect.), Heyt-Diaz (oval plano). */
export function equivalentDiameter(g: Dims): number | null {
  if (g.shape === 'Rectangular' && pos(g.a) && pos(g.b))
    return (1.3 * Math.pow(g.a * g.b, 0.625)) / Math.pow(g.a + g.b, 0.25) / 1000;
  if (g.shape === 'Oval' && pos(g.a) && pos(g.b))
    return (1.55 * Math.pow(flatOvalArea(g.a, g.b), 0.625)) / Math.pow(flatOvalPerimeter(g.a, g.b), 0.25) / 1000;
  if (g.shape === 'Circular' && pos(g.d)) return g.d / 1000;
  return null;
}
