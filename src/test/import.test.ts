import { it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { importDucts, importGrilles, importLosses } from '../io/importExcel';

it('importa las tres hojas con conversión de unidades', async () => {
  const wb = new ExcelJS.Workbook();
  const h = wb.addWorksheet('HVAC RESUMEN'); h.addRow(['ID']);
  const r = new Array(24).fill(null); r[0] = 1; r[1] = 2; r[2] = 1; r[5] = 'Si'; r[6] = 10; r[7] = 20; r[10] = 1000; r[12] = 250; r[13] = 500; r[17] = 3000; r[18] = 'Codo'; r[19] = 'AHU'; r[20] = 'B3'; r[21] = 'Si'; h.addRow(r);
  const g = wb.addWorksheet('REJILLAS EXTERIORES'); g.addRow(['NR']); g.addRow([1, 510, 'ER01', 'Intake', 1000, 'Munters', null, null, 10, 500, null, null, 400, 600]);
  const l = wb.addWorksheet('PERDIDAS DE CARGA'); l.addRow(['N1']); l.addRow([1, null, null, '1.0', 'VENTILADOR', 'S1', 'L1', 'Circular', 'Conducto', null, 0.5, null, null, null, null, null, 300, 2000, null, null, null, 'Aluminio']);
  const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.load(await wb.xlsx.writeBuffer() as any);
  const d = importDucts(wb2).rows[0]; expect(d.eAlto).toBeCloseTo(254, 0); expect(d.eCaudal).toBeCloseTo(1699, 0); expect(d.plenum).toBe(true); expect(d.funcional).toBe(true); expect(d.fAlto).toBe(250);
  const gr = importGrilles(wb2).rows[0]; expect(gr.caudal).toBeCloseTo(1699, 0); expect(gr.area).toBeCloseTo(0.929, 3); expect(gr.velReq).toBeCloseTo(2.54, 2);
  const lo = importLosses(wb2).rows[0]; expect(lo.caudal).toBe(1800); expect(lo.diam).toBe(300); expect(lo.longitud).toBe(2000); expect(lo.material).toBe('Aluminio');
});
