// Peso de un tramo de conducto de chapa: perímetro × longitud × espesor × densidad.
export type WShape = 'Rectangular' | 'Circular' | 'Oval';
export interface WInput { shape: WShape; alto?: number; ancho?: number; diam?: number; espesor: number; longitud: number; densidad: number; extra: number }
export interface WResult { perimetro: number; area: number; volumen: number; peso: number; total: number }

export function perimeter(i: Pick<WInput, 'shape' | 'alto' | 'ancho' | 'diam'>): number {
  if (i.shape === 'Rectangular') return 2 * ((i.alto ?? 0) + (i.ancho ?? 0));
  if (i.shape === 'Circular') return Math.PI * (i.diam ?? 0);
  const a = Math.max(i.alto ?? 0, i.ancho ?? 0), b = Math.min(i.alto ?? 0, i.ancho ?? 0); // oval plano
  return Math.PI * b + 2 * (a - b);
}
export function weight(i: WInput): WResult {
  const perimetro = perimeter(i);
  const area = perimetro * i.longitud;      // mm²
  const volumen = area * i.espesor;         // mm³
  const peso = volumen * 1e-9 * i.densidad; // kg (ρ en kg/m³)
  return { perimetro, area, volumen, peso, total: peso + i.extra };
}

/** Tabla 1A-1: espesor (mm) según diámetro o dimensión nominal (lado mayor en rectangular). */
const T1A1: { hasta: number; noEst: number; est: number }[] = [
  { hasta: 150, noEst: 1, est: 2 }, { hasta: 300, noEst: 1, est: 2.5 }, { hasta: 450, noEst: 1, est: 3 }, { hasta: 760, noEst: 1.5, est: 3 }, { hasta: Infinity, noEst: 1.5, est: 3 }];
export function espesorTabla(dimNominal: number, estanco: boolean): number | null {
  if (!(dimNominal > 0)) return null;
  const r = T1A1.find(x => dimNominal <= x.hasta)!; return estanco ? r.est : r.noEst;
}
