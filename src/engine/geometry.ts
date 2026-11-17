import { Shape } from './types';
import { pos } from './units';

export interface Dims { shape: Shape; a?: number | null; b?: number | null; d?: number | null } // mm

/** Área en m². Rect: a=alto,b=ancho. Oval (elipse): a,b ejes. Circ: d. */
export function area(g: Dims): number | null {
  if (g.shape === 'Rectangular' && pos(g.a) && pos(g.b)) return (g.a * g.b) / 1e6;
  if (g.shape === 'Oval' && pos(g.a) && pos(g.b)) return (Math.PI / 4) * g.a * g.b / 1e6;
  if (g.shape === 'Circular' && pos(g.d)) return (Math.PI / 4) * g.d * g.d / 1e6;
  return null;
}

/** Perímetro de la elipse (aprox. de Ramanujan) en mm. */
export function ellipsePerimeter(a: number, b: number): number {
  const A = a / 2, B = b / 2;
  const h = ((A - B) ** 2) / ((A + B) ** 2);
  return Math.PI * (A + B) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

/** Diámetro hidráulico Dh=4A/P en metros (corregido para el oval). */
export function hydraulicDiameter(g: Dims): number | null {
  if (g.shape === 'Rectangular' && pos(g.a) && pos(g.b)) return (2 * g.a * g.b) / (g.a + g.b) / 1000;
  if (g.shape === 'Oval' && pos(g.a) && pos(g.b)) {
    const A = (Math.PI / 4) * g.a * g.b;           // mm²
    return (4 * A) / ellipsePerimeter(g.a, g.b) / 1000;
  }
  if (g.shape === 'Circular' && pos(g.d)) return g.d / 1000;
  return null;
}

/** Diámetro equivalente (Huebscher, mismo caudal y fricción) en metros. */
export function equivalentDiameter(g: Dims): number | null {
  if ((g.shape === 'Rectangular' || g.shape === 'Oval') && pos(g.a) && pos(g.b))
    return (1.3 * Math.pow(g.a * g.b, 0.625)) / Math.pow(g.a + g.b, 0.25) / 1000;
  if (g.shape === 'Circular' && pos(g.d)) return g.d / 1000;
  return null;
}
