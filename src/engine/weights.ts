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
