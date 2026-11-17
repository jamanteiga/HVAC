import { GrilleRow } from './types';
import { area } from './geometry';
import { pos } from './units';

export interface GrilleCalc {
  velCalc: number | null;   // m/s según área del esquema
  velReal: number | null;   // m/s con dimensiones modeladas
  areaReal: number | null;  // m²
  tag: string;
  state: 'high' | 'low' | 'none';
}
export const foranTag = (id: string) => (id.length >= 3 && id[2].toUpperCase() === 'R' ? id.slice(0, 2) + id.slice(3) : id);

export function calcGrille(r: GrilleRow): GrilleCalc {
  const q = pos(r.caudal) ? r.caudal / 3600 : null;
  const velCalc = q && pos(r.area) ? q / r.area : null;
  const areaReal = pos(r.alto) && pos(r.ancho) ? area({ shape: 'Rectangular', a: r.alto, b: r.ancho }) : null;
  const velReal = q && areaReal ? q / areaReal : null;
  let state: GrilleCalc['state'] = 'none';
  const ref = r.velReq ?? velCalc; // L en la hoja es la velocidad calculada del esquema
  if (velReal != null && velCalc != null) state = velReal > velCalc + 1e-9 ? 'high' : velReal < velCalc - 1e-9 ? 'low' : 'none';
  void ref;
  return { velCalc, velReal, areaReal, tag: foranTag(r.idRejilla), state };
}
export const renumberG = (rows: GrilleRow[]): GrilleRow[] => rows.map((r, i) => ({ ...r, nr: i + 1 }));
