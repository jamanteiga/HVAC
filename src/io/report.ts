import { Project } from '../engine/types';
import { calcDuct } from '../engine/ducts';
import { calcGrille } from '../engine/grilles';
import { calcLosses } from '../engine/losses';
import { ELEMENT_TYPES } from '../engine/types';

export interface Section { title: string; head: string[]; body: string[][] }
const f = (v: number | null | undefined, d = 2) => (v == null || !Number.isFinite(v) ? '' : v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: d }));
const yn = (b: boolean) => (b ? 'Sí' : '');

export function buildReport(p: Project): { title: string; meta: [string, string][]; sections: Section[] } {
  const d = p.design;
  const dc = p.ducts.map(r => calcDuct(r, d));
  const gc = p.grilles.map(calcGrille);
  const ls = calcLosses(p.losses, d, p.accessories, p.materials);

  const pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)} %` : '—');
  const n = p.ducts.length;
  const resumen: Section = { title: 'Resumen de conductos', head: ['Concepto', 'Valor'], body: [
    ['Líneas / elementos', String(n)],
    ['Modelo funcional (Foran)', `${p.ducts.filter(r => r.funcional).length} (${pct(p.ducts.filter(r => r.funcional).length, n)})`],
    ['Modelado en detalle', `${p.ducts.filter(r => r.detalle).length} (${pct(p.ducts.filter(r => r.detalle).length, n)})`],
    ['Soportado', `${p.ducts.filter(r => r.soportado).length} (${pct(p.ducts.filter(r => r.soportado).length, n)})`],
    ['Velocidad Foran por debajo de la teórica', String(dc.filter(c => c.state === 'low').length)],
    ['Velocidad Foran igual a la teórica', String(dc.filter(c => c.state === 'equal').length)],
    ['Velocidad Foran por encima de la teórica', String(dc.filter(c => c.state === 'high').length)],
    ['Rejillas exteriores', String(p.grilles.length)],
    ['Rejillas con velocidad real > calculada', String(gc.filter(g => g.state === 'high').length)],
    ['Pérdida de carga máxima (Pa)', f(ls.max, 1)],
  ] };
  const porElemento: Section = { title: 'Conductos por tipo de elemento', head: ['Elemento', 'Cantidad', 'Longitud total (m)'],
    body: ELEMENT_TYPES.map(e => { const rs = p.ducts.filter(r => r.elemento === e); return [e, String(rs.length), f(rs.reduce((s, r) => s + (r.longitud ?? 0), 0) / 1000, 1)]; }) };
  const bloques = [...new Set(p.ducts.map(r => r.bloque || '(sin bloque)'))].sort();
  const porBloque: Section = { title: 'Conductos por bloque', head: ['Bloque', 'Elementos', 'Modelo funcional', 'Detalle', 'Soportado'],
    body: bloques.map(b => { const rs = p.ducts.filter(r => (r.bloque || '(sin bloque)') === b); return [b, String(rs.length), String(rs.filter(r => r.funcional).length), String(rs.filter(r => r.detalle).length), String(rs.filter(r => r.soportado).length)]; }) };
  const conductos: Section = { title: 'Listado de conductos', head: ['ID', 'Sist.', 'Tipo', 'Elemento', 'Q esq. (m³/h)', 'V esq. (m/s)', 'V teór. (m/s)', 'Alto F (mm)', 'Ancho F (mm)', 'Ø F (mm)', 'V Foran (m/s)', 'L (mm)', 'Equipo', 'Bloque', 'Func.', 'Det.', 'Sop.'],
    body: p.ducts.map((r, i) => [String(r.id), f(r.sistema, 0), String(r.tipo), r.elemento, f(r.eCaudal, 1), f(dc[i].velEsq), f(dc[i].velTeor), f(r.fAlto, 0), f(r.fAncho, 0), f(r.fDiam, 0), f(dc[i].velForan), f(r.longitud, 0), r.equipo, r.bloque, yn(r.funcional), yn(r.detalle), yn(r.soportado)]) };
  const rejillas: Section = { title: 'Rejillas exteriores', head: ['NR', 'SWS', 'ID', 'Descripción', 'Q (m³/h)', 'MFR', 'V calc. (m/s)', 'Alto (mm)', 'Ancho (mm)', 'V real (m/s)', 'Tag Foran'],
    body: p.grilles.map((r, i) => [String(r.nr), String(r.sws), r.idRejilla, r.descripcion, f(r.caudal, 1), r.mfr, f(gc[i].velCalc), f(r.alto, 0), f(r.ancho, 0), f(gc[i].velReal), gc[i].tag]) };
  const perdidas: Section = { title: 'Pérdidas de carga', head: ['Tramo', 'Padre', 'Accesorio', 'K', 'Q (m³/h)', 'V (m/s)', 'Dh (m)', 'f', 'ΔP (Pa)', 'ΔP total (Pa)', 'Ruido (dB)'],
    body: p.losses.map((r, i) => { const c = ls.rows[i]; return [c.idTramo, c.idPadre, r.accesorio, f(c.k, 2), f(r.caudal, 1), f(c.v), f(c.dh, 3), f(c.f, 4), f(c.dp, 1), f(c.dpTotal, 1), f(c.noise, 1)]; }) };

  return {
    title: `HVAC — ${d.nombre || 'Proyecto sin nombre'}`,
    meta: [['Código', d.codigo], ['Cliente', d.cliente], ['Buque', d.buque], ['Tipo de buque', d.tipoBuque], ['Ingeniero', d.ingeniero], ['Fecha', d.fecha]],
    sections: [resumen, porElemento, porBloque, conductos, rejillas, perdidas],
  };
}
