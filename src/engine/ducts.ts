import { DesignData, DuctRow } from './types';
import { area } from './geometry';
import { pos } from './units';

export type VelState = 'low' | 'equal' | 'high' | 'none';
export interface DuctCalc {
  velTeor: number;               // m/s (col. E)
  qTeor: number | null;          // m³/h (col. J)
  velEsq: number | null;         // m/s (col. L)
  velForan: number | null;       // m/s (col. P)
  qForan: number | null;         // m³/h (col. Q)
  state: VelState;
}

function eDims(r: DuctRow) {
  if (pos(r.eAlto) && pos(r.eAncho)) return { shape: 'Rectangular' as const, a: r.eAlto, b: r.eAncho };
  if (pos(r.eDiam)) return { shape: 'Circular' as const, d: r.eDiam };
  return null;
}
function fDims(r: DuctRow) {
  if (pos(r.fDiam)) return { shape: 'Circular' as const, d: r.fDiam };
  if (pos(r.fAlto) && pos(r.fAncho)) return { shape: 'Rectangular' as const, a: r.fAlto, b: r.fAncho };
  return null;
}

export function calcDuct(r: DuctRow, d: DesignData): DuctCalc {
  const velTeor = d.velTipos[r.tipo];
  const ge = eDims(r); const Ae = ge ? area(ge) : null;
  const qTeor = Ae ? Ae * velTeor * 3600 : null;
  let velEsq: number | null = null;
  if (Ae) velEsq = pos(r.eCaudal) ? r.eCaudal / 3600 / Ae : velTeor;
  const gf = fDims(r); const Af = gf ? area(gf) : null;
  const velForan = Af && pos(r.eCaudal) ? r.eCaudal / 3600 / Af : (Af ? 0 : null);
  const qForan = Af && velForan != null ? Math.round(Af * velForan * 3600 * 10) / 10 : null;
  let state: VelState = 'none';
  if (velForan && velForan > 0) {
    const tol = d.tolVel / 100;
    if (Math.abs(velForan - velTeor) <= tol * velTeor) state = 'equal';
    else state = velForan < velTeor ? 'low' : 'high';
  }
  return { velTeor, qTeor, velEsq, velForan, qForan, state };
}

/** Renumera la columna A (ID) tras insertar/eliminar. */
export const renumber = (rows: DuctRow[]): DuctRow[] => rows.map((r, i) => ({ ...r, id: i + 1 }));
