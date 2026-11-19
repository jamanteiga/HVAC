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

/** Espiro con aislamiento: Ø nominal (mm) → Ø exterior con aislamiento (mm) y peso por metro lineal (kg/m). */
export const SPIRO_AISLADO: { dn: number; De: number; kgm: number }[] = [
  { dn: 80, De: 112, kgm: 9 }, { dn: 100, De: 132, kgm: 11.2 }, { dn: 125, De: 157, kgm: 13.2 }, { dn: 160, De: 192, kgm: 16.4 },
  { dn: 180, De: 200, kgm: 18 }, { dn: 200, De: 232, kgm: 20.6 }, { dn: 224, De: 260, kgm: 22.7 }, { dn: 250, De: 280, kgm: 25.2 },
  { dn: 280, De: 315, kgm: 28.1 }, { dn: 300, De: 355, kgm: 30.1 }, { dn: 315, De: 355, kgm: 30.1 }];
export const spiroAislado = (dn: number | null) => SPIRO_AISLADO.find(x => x.dn === dn) ?? null;
/** Peso (kg) de un tramo de espiro aislado: kg/m × longitud (mm) / 1000. */
export const pesoSpiroAislado = (dn: number | null, longitudMm: number): number => (spiroAislado(dn)?.kgm ?? 0) * longitudMm / 1000;
