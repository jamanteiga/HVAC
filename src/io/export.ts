import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, WidthType, PageOrientation } from 'docx';
import { Project } from '../engine/types';
import { buildReport } from './report';

const fname = (p: Project, ext: string) => `HVAC_${(p.design.codigo || p.design.nombre || 'proyecto').replace(/[^\w-]+/g, '_')}.${ext}`;

export async function exportExcel(p: Project) {
  const rep = buildReport(p); const wb = new ExcelJS.Workbook(); wb.creator = 'HVAC';
  rep.sections.forEach((s, i) => {
    const ws = wb.addWorksheet(s.title.slice(0, 31));
    ws.addRow(i === 0 ? [rep.title] : [s.title]).font = { bold: true, size: 13 };
    if (i === 0) rep.meta.forEach(([k, v]) => ws.addRow([k, v]));
    ws.addRow([]);
    const h = ws.addRow(s.head); h.font = { bold: true }; h.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } }; });
    s.body.forEach(r => ws.addRow(r));
    ws.columns.forEach(c => { c.width = 16; });
    ws.getColumn(1).width = i === 0 ? 44 : 14;
  });
  saveAs(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fname(p, 'xlsx'));
}

export function exportPdf(p: Project) {
  const rep = buildReport(p); const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(15); doc.text(rep.title, 14, 15);
  doc.setFontSize(9); doc.text(rep.meta.map(([k, v]) => `${k}: ${v || '—'}`).join('   |   '), 14, 21);
  let y = 26;
  rep.sections.forEach((s, i) => {
    doc.setFontSize(11); if (i > 0 && y > 170) { doc.addPage(); y = 15; }
    doc.text(s.title, 14, y);
    autoTable(doc, { startY: y + 2, head: [s.head], body: s.body, styles: { fontSize: 7, cellPadding: 1.2 }, headStyles: { fillColor: [0, 103, 192] }, theme: 'grid', margin: { left: 14, right: 14 } });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 9;
  });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7); doc.text(`HVAC · ${i}/${n}`, 283, 203, { align: 'right' }); }
  doc.save(fname(p, 'pdf'));
}

export async function exportWord(p: Project) {
  const rep = buildReport(p);
  const cell = (t: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold, size: 14 })] })] });
  const kids: (Paragraph | Table)[] = [new Paragraph({ text: rep.title, heading: HeadingLevel.TITLE }),
    new Paragraph(rep.meta.map(([k, v]) => `${k}: ${v || '—'}`).join('  ·  '))];
  rep.sections.forEach(s => {
    kids.push(new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_2 }));
    kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: s.head.map(h => cell(h, true)) }), ...s.body.map(r => new TableRow({ children: r.map(c => cell(c)) }))] }));
  });
  const doc = new Document({ sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } }, children: kids }] });
  saveAs(await Packer.toBlob(doc), fname(p, 'docx'));
}
