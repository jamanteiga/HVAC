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
