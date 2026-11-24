import { useState } from 'react';
import { Card, Text, Title3 } from '@fluentui/react-components';
import { CODOS_ESPECIALES, deltaX } from '../engine/special';
import { parseNum } from './DataGrid';

// Colores de la hoja: verde = dato manual, amarillo = calculado.
const C = { in: '#b9e6a5', calc: '#fff3a6', head: '#00b0f0' };
const cell: React.CSSProperties = { padding: '3px 8px', color: '#111', borderBottom: '1px solid rgba(0,0,0,.12)' };
const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const Row = ({ label, color, children, unit, bold }: any) => (<tr style={{ background: color, fontWeight: bold ? 700 : 400 }}><td style={cell}>{label}</td><td style={{ ...cell, textAlign: 'right', width: 140 }}>{children}</td><td style={{ ...cell, textAlign: 'center', width: 70 }}>{unit}</td></tr>);
const field: React.CSSProperties = { width: 120, background: 'transparent', color: '#111', border: 'none', borderBottom: '1px solid #555', textAlign: 'right', fontSize: 13, padding: '2px 0' };

export function Module7() {
  const [dz, setDz] = useState(''); const [codo, setCodo] = useState('');
  const dx = codo ? deltaX(parseNum(dz) ?? NaN, +codo) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <Card><Title3>Cálculos especiales</Title3>
        <Text size={200} style={{ color: 'var(--subtle)' }}>Verde: dato manual · amarillo: calculado. Decimales con punto o coma.</Text></Card>
      <Card style={{ padding: 0, overflow: 'hidden', maxWidth: 460 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead><tr><th colSpan={3} style={{ background: C.head, color: '#111', padding: 6 }}>CODO PARA SALVAR DESNIVEL</th></tr></thead>
          <tbody>
            <Row label="ΔZ" color={C.in} unit="mm"><input value={dz} onChange={e => setDz(e.target.value)} inputMode="decimal" style={field} /></Row>
            <Row label="Codo de" color={C.in} unit="°"><select value={codo} onChange={e => setCodo(e.target.value)} style={field}>
              <option value="" style={{ color: '#111' }}></option>{CODOS_ESPECIALES.map(a => <option key={a} value={a} style={{ color: '#111' }}>{a}</option>)}</select></Row>
            <Row label="ΔX" color={C.calc} unit="mm" bold>{dx != null ? fmt(dx) : ''}</Row>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
