import ExcelJS from 'exceljs';
import { DuctRow, GrilleRow, LossRow, Shape } from '../engine/types';
import { CFM_TO_M3H, FPM_TO_MS, FT2_TO_M2, IN_TO_MM, num } from '../engine/units';
import { uid } from '../engine/defaults';
import { newDuct, newGrille, newLoss } from '../store';

const val = (c: ExcelJS.Cell): unknown => {
  const v: any = c.value;
  if (v && typeof v === 'object') {
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
};
const txt = (v: unknown) => (v == null ? '' : String(v).trim());
const yes = (v: unknown) => /^(s[ií]|true|1|x)$/i.test(txt(v));
const r1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10);

function findSheet(wb: ExcelJS.Workbook, name: string) {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return wb.worksheets.find(w => norm(w.name) === norm(name)) ?? wb.worksheets.find(w => norm(w.name).includes(norm(name)));
}
function firstDataRow(ws: ExcelJS.Worksheet, col = 1): number {
  for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) if (num(val(ws.getRow(r).getCell(col))) != null) return r;
  return 2;
}
const shape = (v: unknown): Shape => { const s = txt(v).toLowerCase(); return s.startsWith('rec') ? 'Rectangular' : s.startsWith('ov') ? 'Oval' : 'Circular'; };

export interface ImportResult<T> { rows: T[]; sheet: string }

export async function readWorkbook(file: File) { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); return wb; }

export function importDucts(wb: ExcelJS.Workbook): ImportResult<DuctRow> {
  const ws = findSheet(wb, 'HVAC RESUMEN'); if (!ws) throw new Error('No se encuentra la hoja "HVAC RESUMEN"');
  const rows: DuctRow[] = [];
  for (let r = firstDataRow(ws); r <= ws.rowCount; r++) {
    const row = ws.getRow(r); const g = (c: number) => val(row.getCell(c));
    if (num(g(1)) == null && !txt(g(3))) continue;
    const t = parseInt(txt(g(3)).match(/^\d/)?.[0] ?? '3', 10);
    const d = newDuct();
    rows.push({ ...d, uid: uid(), id: rows.length + 1,
      sistema: num(g(2)), tipo: (t >= 1 && t <= 4 ? t : 3) as DuctRow['tipo'], plenum: yes(g(6)),
      eAlto: r1(num(g(7)) != null ? num(g(7))! * IN_TO_MM : null), eAncho: r1(num(g(8)) != null ? num(g(8))! * IN_TO_MM : null), eDiam: r1(num(g(9)) != null ? num(g(9))! * IN_TO_MM : null),
      eCaudal: r1(num(g(11)) != null ? num(g(11))! * CFM_TO_M3H : null),
      fAlto: num(g(13)), fAncho: num(g(14)), fDiam: num(g(15)), longitud: num(g(18)),
      elemento: txt(g(19)) || 'Conducto', equipo: txt(g(20)), bloque: txt(g(21)),
      funcional: yes(g(22)), detalle: yes(g(23)), soportado: yes(g(24)) });
  }
  return { rows, sheet: ws.name };
}

export function importGrilles(wb: ExcelJS.Workbook): ImportResult<GrilleRow> {
  const ws = findSheet(wb, 'REJILLAS EXTERIORES'); if (!ws) throw new Error('No se encuentra la hoja "REJILLAS EXTERIORES"');
  const rows: GrilleRow[] = [];
  for (let r = firstDataRow(ws); r <= ws.rowCount; r++) {
    const row = ws.getRow(r); const g = (c: number) => val(row.getCell(c));
    if (!txt(g(3))) continue;
    const m = /mun/i.test(txt(g(6))) ? 'Munters' : 'Fabricated';
    const q = num(g(5)), a = num(g(9)), v = num(g(10));
    rows.push({ ...newGrille(), uid: uid(), nr: rows.length + 1, sws: num(g(2)) ?? 510, idRejilla: txt(g(3)), descripcion: txt(g(4)),
      caudal: r1(q != null ? q * CFM_TO_M3H : null), mfr: m, partNo: txt(g(7)),
      area: a != null ? +(a * FT2_TO_M2).toFixed(4) : null, velReq: v != null ? +(v * FPM_TO_MS).toFixed(3) : null,
      alto: num(g(13)), ancho: num(g(14)) });
  }
  return { rows, sheet: ws.name };
}

export function importLosses(wb: ExcelJS.Workbook): ImportResult<LossRow> {
  const ws = findSheet(wb, 'PERDIDAS DE CARGA'); if (!ws) throw new Error('No se encuentra la hoja "PERDIDAS DE CARGA"');
  const rows: LossRow[] = [];
  for (let r = firstDataRow(ws); r <= ws.rowCount; r++) {
    const row = ws.getRow(r); const g = (c: number) => val(row.getCell(c));
    const n1 = num(g(1)); if (n1 == null) continue;
    const q = num(g(11));
    rows.push({ ...newLoss(), uid: uid(), n1, n2: num(g(2)), n3: num(g(3)), sistema: txt(g(6)), nLinea: txt(g(7)), tipo: shape(g(8)),
      accesorio: txt(g(9)) || 'Conducto', caudal: q != null ? +(q * 3600).toFixed(1) : null,
      alto: num(g(13)), ancho: num(g(14)), ovAlto: num(g(15)), ovAncho: num(g(16)), diam: num(g(17)), longitud: num(g(18)),
      material: txt(g(22)) || 'Acero galvanizado' });
  }
  return { rows, sheet: ws.name };
}
