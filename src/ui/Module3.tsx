import { useMemo, useState } from 'react';
import { Button, Card, Title3, Subtitle2, Spinner } from '@fluentui/react-components';
import { ArrowDownload24Regular, DocumentPdf24Regular, DocumentText24Regular, Table24Regular } from '@fluentui/react-icons';
import { useStore } from '../store';
import { buildReport } from '../io/report';
import { exportExcel, exportPdf, exportWord } from '../io/export';

export function Module3() {
  const p = useStore(s => s.project); const rep = useMemo(() => buildReport(p), [p]);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => unknown) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Title3 style={{ marginRight: 'auto' }}>Reportes</Title3>
        {busy && <Spinner size="tiny" />}
        <Button icon={<DocumentPdf24Regular />} onClick={() => run(() => exportPdf(p))}>Exportar PDF</Button>
        <Button icon={<Table24Regular />} onClick={() => run(() => exportExcel(p))}>Exportar Excel</Button>
        <Button icon={<DocumentText24Regular />} onClick={() => run(() => exportWord(p))}>Exportar Word</Button>
        <ArrowDownload24Regular />
      </Card>
      {rep.sections.slice(0, 3).map(s => (
        <Card key={s.title}><Subtitle2>{s.title}</Subtitle2>
          <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{s.head.map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 12px', background: '#f3f3f3', borderBottom: '1px solid #e0e0e0' }}>{h}</th>)}</tr></thead>
            <tbody>{s.body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '4px 12px', borderBottom: '1px solid #f0f0f0' }}>{c}</td>)}</tr>)}</tbody>
          </table></Card>))}
      <Card><Subtitle2>El informe exportado incluye además</Subtitle2>
        <div style={{ fontSize: 13 }}>Listado completo de conductos ({p.ducts.length}), rejillas exteriores ({p.grilles.length}) y pérdidas de carga ({p.losses.length}).</div></Card>
    </div>
  );
}
