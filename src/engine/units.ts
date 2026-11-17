// Conversiones. Internamente: mm, m², m/s, m³/h, Pa.
export const CFM_TO_M3H = 1.699010796; // 1 CFM = 1.699 m³/h
export const FPM_TO_MS = 0.00508;
export const IN_TO_MM = 25.4;
export const FT2_TO_M2 = 0.09290304;
export const M3H_TO_M3S = 1 / 3600;

export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export const pos = (v: number | null | undefined): v is number => typeof v === 'number' && v > 0;
