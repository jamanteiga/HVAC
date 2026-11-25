import { useState } from 'react';
import { Card, Text, Title3 } from '@fluentui/react-components';
import { CODOS_ESPECIALES, deltaX, recorrido } from '../engine/special';
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
  const [p, setP] = useState<Record<string, string>>({});
  const set = (k: string) => (e: any) => setP(o => ({ ...o, [k]: e.target.value }));
  const ks = ['x1', 'y1', 'z1', 'x2', 'y2', 'z2'], vals = ks.map(k => parseNum(p[k] ?? ''));
  const ok = vals.every(v => v != null);
  const [a1, setA1] = useState('45'), [a2, setA2] = useState('45');
  const r = ok ? recorrido({ x: vals[0]!, y: vals[1]!, z: vals[2]! }, { x: vals[3]!, y: vals[4]!, z: vals[5]! }, +a1, +a2) : null;
  const sel = (v: string, f: (x: string) => void) => <select value={v} onChange={e => f(e.target.value)} style={field}>{CODOS_ESPECIALES.map(a => <option key={a} value={a} style={{ color: '#111' }}>{a}</option>)}</select>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <Card><Title3>Cálculos especiales</Title3>
        <Text size={200} style={{ color: 'var(--subtle)' }}>Verde: dato manual · amarillo: calculado. Decimales con punto o coma.</Text></Card>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
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
      <Card style={{ padding: 0, overflow: 'hidden', width: 560, maxWidth: '100%' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead><tr><th colSpan={3} style={{ background: C.head, color: '#111', padding: 6 }}>CÁLCULO DISTANCIA B</th></tr></thead>
          <tbody>
            <tr><td colSpan={3} style={{ background: '#fff', padding: 8, textAlign: 'center' }}><img src="./img/calculo-distancia-b.png" alt="Esquema P1, P2, P3, A, B, β y γ" style={{ width: '100%', height: 'auto', display: 'block' }} /></td></tr>
            {['x1', 'y1', 'z1', 'x2', 'y2', 'z2'].map(k => <Row key={k} label={k[0].toUpperCase() + k[1] + (k[0] === 'z' ? ' (cota)' : '')} color={C.in} unit="mm"><input value={p[k] ?? ''} onChange={set(k)} inputMode="decimal" style={field} /></Row>)}
            <Row label="β" color={C.in} unit="°">{sel(a1, setA1)}</Row>
            <Row label="γ" color={C.in} unit="°">{sel(a2, setA2)}</Row>
            <Row label="ΔX horizontal (de la vertical de P2 a P1)" color={C.calc} unit="mm" bold>{r ? fmt(r.dx) : ''}</Row>
            <Row label="ΔZ (Z2 − Z1)" color={C.calc} unit="mm">{r ? fmt(r.dz) : ''}</Row>
            <Row label="Proyección horizontal codo P1 (ΔZ/2)" color={C.calc} unit="mm">{r ? fmt(r.h1) : ''}</Row>
            <Row label="Proyección horizontal codo P2 (ΔZ/2)" color={C.calc} unit="mm">{r ? fmt(r.h2) : ''}</Row>
            <Row label="Longitud inclinada desde P1" color={C.calc} unit="mm">{r ? fmt(r.L1) : ''}</Row>
            <Row label="Longitud inclinada desde P2" color={C.calc} unit="mm">{r ? fmt(r.L2) : ''}</Row>
            <Row label="Distancia" color={r && r.recto < 0 ? '#f4a7a7' : C.calc} unit="mm" bold>{r ? fmt(r.recto) : ''}</Row>
          </tbody>
        </table>
      </Card>
      </div>
    </div>
  );
}
