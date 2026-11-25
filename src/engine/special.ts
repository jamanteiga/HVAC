// Cálculos especiales. ΔX para salvar una distancia vertical ΔZ con un codo de ángulo θ: ΔX = ΔZ / sen θ.
export const CODOS_ESPECIALES = [15, 30, 45, 60, 75] as const;
export function deltaX(deltaZ: number, codoGrados: number): number | null {
  if (!(deltaZ >= 0) || !(codoGrados > 0 && codoGrados < 180)) return null;
  return deltaZ / Math.sin(codoGrados * Math.PI / 180);
}

export interface P3 { x: number; y: number; z: number }
/** Distancia horizontal (en planta) entre las verticales de P1 y P2, y desnivel ΔZ = z2 − z1. */
export function distanciaHorizontal(p1: P3, p2: P3): { dx: number; dz: number } {
  return { dx: Math.hypot(p2.x - p1.x, p2.y - p1.y), dz: p2.z - p1.z };
}

export interface Recorrido { dx: number; dz: number; h1: number; h2: number; L1: number; L2: number; recto: number }
/** Recorrido P1→P2 con dos codos (α1 en P1, α2 en P2) que salvan cada uno la mitad del desnivel.
 *  h = (|ΔZ|/2)/tan α (proyección horizontal), L = (|ΔZ|/2)/sen α (longitud inclinada), recto = distancia horizontal − h1 − h2. */
export function recorrido(p1: P3, p2: P3, a1: number, a2: number): Recorrido {
  const { dx, dz } = distanciaHorizontal(p1, p2), m = Math.abs(dz) / 2, r = (g: number) => g * Math.PI / 180;
  const h1 = m / Math.tan(r(a1)), h2 = m / Math.tan(r(a2));
  return { dx, dz, h1, h2, L1: m / Math.sin(r(a1)), L2: m / Math.sin(r(a2)), recto: dx - h1 - h2 };
}
