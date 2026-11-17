import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, Text, Title3, Subtitle2 } from '@fluentui/react-components';
import { useStore } from '../store';
import { weight, WShape } from '../engine/weights';
import { parseNum } from './DataGrid';
import { uid } from '../engine/defaults';
import { WeightRow } from '../engine/types';

// Colores de la hoja: verde = dato manual, azul = constante, amarillo = calculado.
const C = { in: '#b9e6a5', const: '#9fd3f5', calc: '#fff3a6', head: '#00b0f0' };
const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const cell: React.CSSProperties = { padding: '3px 8px', color: '#111', borderBottom: '1px solid rgba(0,0,0,.12)' };

type K = 'alto' | 'ancho' | 'diam' | 'espesor' | 'longitud' | 'extra';
const FIELDS: Record<WShape, { k: K; label: string; unit: string }[]> = {
  Rectangular: [{ k: 'alto', label: 'Alto', unit: 'mm' }, { k: 'ancho', label: 'Ancho', unit: 'mm' }, { k: 'espesor', label: 'Espesor', unit: 'mm' }, { k: 'longitud', label: 'Longitud', unit: 'mm' }],
  Circular: [{ k: 'diam', label: 'Diámetro', unit: 'mm' }, { k: 'longitud', label: 'Longitud', unit: 'mm' }, { k: 'espesor', label: 'Espesor', unit: 'mm' }],
  Oval: [{ k: 'alto', label: 'Alto', unit: 'mm' }, { k: 'ancho', label: 'Ancho', unit: 'mm' }, { k: 'espesor', label: 'Espesor', unit: 'mm' }, { k: 'longitud', label: 'Longitud', unit: 'mm' }],
};

function Calc({ shape, rho, desc, onAdd }: { shape: WShape; rho: string; desc: string; onAdd: (r: WeightRow) => void }) {
  const [v, setV] = useState<Record<string, string>>({ espesor: '3', extra: '0' });
  const n = (k: K) => parseNum(v[k]) ?? 0;
  const R = useMemo(() => weight({ shape, alto: n('alto'), ancho: n('ancho'), diam: n('diam'), espesor: n('espesor'), longitud: n('longitud'), densidad: parseNum(rho) ?? 7850, extra: n('extra') }), [v, shape, rho]); // eslint-disable-line
  const ok = R.total > 0;
  const dims = shape === 'Circular' ? `Ø${n('diam')}` : `${n('alto')}×${n('ancho')}`;
  const Row = ({ label, color, children, unit, bold }: any) => (<tr style={{ background: color, fontWeight: bold ? 700 : 400 }}><td style={cell}>{label}</td><td style={{ ...cell, textAlign: 'right', width: 120 }}>{children}</td><td style={{ ...cell, textAlign: 'center', width: 70 }}>{unit}</td></tr>);
  return (
    <Card style={{ padding: 0, overflow: 'hidden', minWidth: 320 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead><tr><th colSpan={3} style={{ background: C.head, color: '#111', padding: 6 }}>CONDUCTO {shape.toUpperCase()}</th></tr>
          <tr style={{ background: '#3b6ea5', color: '#fff' }}><th style={{ ...cell, color: '#fff', textAlign: 'left' }}>Dimensión</th><th style={{ ...cell, color: '#fff' }}>Valor</th><th style={{ ...cell, color: '#fff' }}>Unidad</th></tr></thead>
        <tbody>
          {FIELDS[shape].map(f => (
            <Row key={f.k} label={f.label} color={C.in} unit={f.unit}><Input size="small" appearance="underline" value={v[f.k] ?? ''} onChange={(_, x) => setV(s => ({ ...s, [f.k]: x.value }))} style={{ width: 100, background: 'transparent', color: '#111' }} input={{ style: { textAlign: 'right', color: '#111' } }} /></Row>))}
          <Row label="Densidad" color={C.const} unit="kg/m³">{rho}</Row>
          <Row label="Perímetro" color={C.calc} unit="mm">{fmt(R.perimetro, 0)}</Row>
          <Row label="Área" color={C.calc} unit="mm²">{fmt(R.area, 0)}</Row>
          <Row label="Volumen" color={C.calc} unit="mm³">{fmt(R.volumen, 0)}</Row>
          <Row label="Peso" color={C.calc} unit="kg">{fmt(R.peso)}</Row>
          <Row label="Peso extra" color={C.in} unit="kg"><Input size="small" appearance="underline" value={v.extra ?? ''} onChange={(_, x) => setV(s => ({ ...s, extra: x.value }))} style={{ width: 100, background: 'transparent' }} input={{ style: { textAlign: 'right', color: '#111' } }} /></Row>
          <Row label="Peso total" color={C.calc} unit="kg" bold>{fmt(R.total)}</Row>
        </tbody>
      </table>
      <div style={{ padding: 8, textAlign: 'right' }}><Button disabled={!ok} onClick={() => onAdd({ uid: uid(), descripcion: desc, shape, dims, longitud: n('longitud'), espesor: n('espesor'), peso: R.peso, extra: n('extra'), total: R.total })}>Añadir al listado</Button></div>
    </Card>
  );
}

export function Module6() {
  const { project: p, replaceRows: _r } = useStore(); void _r;
  const weights = p.weights ?? [];
  const setW = (w: WeightRow[]) => useStore.setState(s => ({ project: { ...s.project, weights: w, updatedAt: Date.now() } }));
  const [rho, setRho] = useState('7850'); const [desc, setDesc] = useState('');
  const total = weights.reduce((s, r) => s + r.total, 0);
  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 10px', background: 'var(--hdr)', borderBottom: '1px solid var(--border)' };
  const td: React.CSSProperties = { padding: '5px 10px', borderBottom: '1px solid var(--border2)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <Card><Title3>Peso de tramos de conducto</Title3>
        <Text size={200} style={{ color: 'var(--subtle)' }}>Peso = perímetro × longitud × espesor × densidad. Verde: dato manual · azul: constante · amarillo: calculado (se actualiza al escribir). Dimensiones en mm.</Text>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Densidad (kg/m³)"><Input value={rho} onChange={(_, x) => setRho(x.value)} /></Field>
          <Field label="Descripción del tramo (para el listado)"><Input value={desc} onChange={(_, x) => setDesc(x.value)} style={{ minWidth: 280 }} /></Field></div></Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 16, alignItems: 'start' }}>
        {(['Rectangular', 'Circular', 'Oval'] as WShape[]).map(s => <Calc key={s} shape={s} rho={rho} desc={desc} onAdd={r => setW([...weights, r])} />)}
      </div>
      <Card><Subtitle2>Listado de tramos — peso total: {fmt(total)} kg</Subtitle2>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
          <thead><tr>{['Descripción', 'Tipo', 'Medidas (mm)', 'Longitud (mm)', 'Espesor (mm)', 'Peso (kg)', 'Extra (kg)', 'Total (kg)', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{weights.map(r => (<tr key={r.uid}><td style={td}>{r.descripcion || '—'}</td><td style={td}>{r.shape}</td><td style={td}>{r.dims}</td><td style={td}>{fmt(r.longitud, 0)}</td><td style={td}>{fmt(r.espesor, 1)}</td><td style={td}>{fmt(r.peso)}</td><td style={td}>{fmt(r.extra)}</td><td style={{ ...td, fontWeight: 600 }}>{fmt(r.total)}</td>
            <td style={td}><Button size="small" onClick={() => setW(weights.filter(x => x.uid !== r.uid))}>Quitar</Button></td></tr>))}
            {!weights.length && <tr><td colSpan={9} style={{ ...td, color: 'var(--subtle)' }}>Sin tramos. Calcula arriba y pulsa «Añadir al listado».</td></tr>}</tbody>
        </table></Card>
    </div>
  );
}
