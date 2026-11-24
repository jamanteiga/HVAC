// Cálculos especiales. ΔX para salvar una distancia vertical ΔZ con un codo de ángulo θ: ΔX = ΔZ / sen θ · π.
export const CODOS_ESPECIALES = [15, 30, 45, 60, 75] as const;
export function deltaX(deltaZ: number, codoGrados: number): number | null {
  if (!(deltaZ >= 0) || !(codoGrados > 0 && codoGrados < 180)) return null;
  return deltaZ / Math.sin(codoGrados * Math.PI / 180) * Math.PI;
}
