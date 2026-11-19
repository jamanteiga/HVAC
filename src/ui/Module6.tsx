import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, Text, Title3 } from '@fluentui/react-components';
import { weight, perimeter, espesorTabla, spiroAislado, pesoSpiroAislado, WShape } from '../engine/weights';
import { parseNum } from './DataGrid';
import { SPIRO, spiroThickness } from '../engine/quick';

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

// Fila de la tabla: definida fuera de Calc para que no se vuelva a montar en cada pulsación (si no, el campo pierde el foco).
const Row = ({ label, color, children, unit, bold }: any) => (<tr style={{ background: color, fontWeight: bold ? 700 : 400 }}><td style={cell}>{label}</td><td style={{ ...cell, textAlign: 'right', width: 120 }}>{children}</td><td style={{ ...cell, textAlign: 'center', width: 70 }}>{unit}</td></tr>);

function Calc({ shape, rho, lmax, pmax, spiro }: { shape: WShape; rho: string; lmax: number; pmax: number; spiro?: boolean }) {
  const [v, setV] = useState<Record<string, string>>(spiro ? { diam: '200', extra: '0' } : { espesor: '3', extra: '0' });
  const [info, setInfo] = useState(''); const [ais, setAis] = useState(false); const est = false; const [man, setMan] = useState<string | null>(null); // espesor: tabla por defecto, editable a mano
  const auto = !spiro && shape !== 'Oval'; // circular y rectangular: espesor por defecto de tabla
  const n = (k: K) => k === 'espesor' && auto && man !== null ? (parseNum(man) ?? 0) : k === 'espesor' && auto ? (espesorTabla(shape === 'Circular' ? (parseNum(v.diam) ?? 0) : Math.max(parseNum(v.alto) ?? 0, parseNum(v.ancho) ?? 0), est) ?? 0) : k === 'espesor' && spiro ? (spiroThickness(parseNum(v.diam) ?? null) ?? 0) : parseNum(v[k]) ?? 0;
  const R = useMemo(() => { const base = weight({ shape, alto: n('alto'), ancho: n('ancho'), diam: n('diam'), espesor: n('espesor'), longitud: n('longitud'), densidad: parseNum(rho) ?? 7850, extra: n('extra') }); if (spiro && ais) { const peso = pesoSpiroAislado(parseNum(v.diam) ?? null, n('longitud')); return { ...base, peso, total: peso + n('extra') }; } return base; }, [v, shape, rho, est, man, ais]); // eslint-disable-line
  return (
    <Card style={{ padding: 0, overflow: 'hidden', minWidth: 320 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead><tr><th colSpan={3} style={{ background: C.head, color: '#111', padding: 6 }}>CONDUCTO {spiro ? 'ESPIRO (SPIRODUCT)' : shape.toUpperCase()}</th></tr>
          <tr style={{ background: '#3b6ea5', color: '#fff' }}><th style={{ ...cell, color: '#fff', textAlign: 'left' }}>Dimensión</th><th style={{ ...cell, color: '#fff' }}>Valor</th><th style={{ ...cell, color: '#fff' }}>Unidad</th></tr></thead>
        <tbody>
          {spiro && <Row label="Tipo de conducto" color={C.in} unit=""><select value={ais ? 'si' : 'no'} onChange={e => setAis(e.target.value === 'si')} style={{ width: 120, background: 'transparent', color: '#111', border: 'none', borderBottom: '1px solid #555', fontSize: 13 }}><option value="no" style={{ color: '#111' }}>Sin aislamiento</option><option value="si" style={{ color: '#111' }}>Con aislamiento</option></select></Row>}
          {FIELDS[shape].map(f => spiro && f.k === 'diam' ? (
            <Row key={f.k} label="Diámetro nominal" color={C.in} unit="mm"><select value={v.diam ?? ''} onChange={e => setV(s => ({ ...s, diam: e.target.value }))} style={{ width: 100, background: 'transparent', color: '#111', border: 'none', borderBottom: '1px solid #555', textAlign: 'right', fontSize: 13 }}>
              {SPIRO.map(x => <option key={x.di} value={x.di} style={{ color: '#111' }}>{x.di}</option>)}</select></Row>
          ) : spiro && f.k === 'espesor' ? (
            <Row key={f.k} label="Espesor (según tabla)" color={C.const} unit="mm"><Input size="small" appearance="underline" disabled readOnly value={String(n('espesor')).replace('.', ',')} style={{ width: 100, background: 'transparent' }} input={{ style: { textAlign: 'right', color: '#111', WebkitTextFillColor: '#111' } }} /></Row>
          ) : auto && f.k === 'espesor' ? (
            <Row key={f.k} label="Espesor" color={C.in} unit="mm"><Input size="small" appearance="underline" value={man ?? String(n('espesor')).replace('.', ',')} onChange={(_, x) => setMan(x.value === '' ? null : x.value)} style={{ width: 100, background: 'transparent', color: '#111' }} input={{ style: { textAlign: 'right', color: '#111' } }} /></Row>
          ) : (
            <Row key={f.k} label={f.label} color={C.in} unit={f.unit}><Input size="small" appearance="underline" value={v[f.k] ?? ''} onChange={(_, x) => setV(s => ({ ...s, [f.k]: x.value }))} style={{ width: 100, background: 'transparent', color: '#111' }} input={{ style: { textAlign: 'right', color: '#111' } }} /></Row>))}
          {spiro && ais && (() => { const a = spiroAislado(parseNum(v.diam) ?? null); return <><Row label="Ø exterior con aislamiento" color={C.const} unit="mm">{a ? fmt(a.De, 0) : '—'}</Row><Row label="Peso por metro lineal" color={C.const} unit="kg/m">{a ? fmt(a.kgm, 1) : '—'}</Row></>; })()}
          <Row label="Peso extra" color={C.in} unit="kg"><Input size="small" appearance="underline" value={v.extra ?? ''} onChange={(_, x) => setV(s => ({ ...s, extra: x.value }))} style={{ width: 100, background: 'transparent' }} input={{ style: { textAlign: 'right', color: '#111' } }} /></Row>
          <Row label="Peso" color={C.calc} unit="kg">{fmt(R.peso)}</Row>
          <Row label="Peso total" color={C.calc} unit="kg" bold>{fmt(R.total)}</Row>
        </tbody>
      </table>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {R.total > pmax + 1e-9 && <Text size={200} style={{ color: 'var(--over)' }}>El peso total ({fmt(R.total)} kg) supera el máximo de {fmt(pmax, 0)} kg.</Text>}
        {n('longitud') > lmax + 1e-9 && <Text size={200} style={{ color: 'var(--over)' }}>La longitud supera el máximo de {fmt(lmax, 0)} mm.</Text>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button appearance="primary" onClick={() => { setV(s => ({ ...s, longitud: String(lmax) })); setInfo(`Longitud fijada en ${fmt(lmax, 0)} mm (máxima).`); }}>Calcular peso (L = {fmt(lmax, 0)} mm)</Button>
          <Button onClick={() => {
            const k = spiro && ais ? (spiroAislado(parseNum(v.diam) ?? null)?.kgm ?? 0) / 1000 : perimeter({ shape, alto: n('alto'), ancho: n('ancho'), diam: n('diam') }) * n('espesor') * (parseNum(rho) ?? 7850) * 1e-9; // kg por mm de longitud
            if (!(k > 0)) { setInfo('Introduce las medidas y el espesor.'); return; }
            const free = pmax - n('extra');
            if (free <= 0) { setInfo(`El peso extra (${fmt(n('extra'))} kg) alcanza o supera el máximo de ${fmt(pmax, 0)} kg.`); return; }
            const raw = free / k, L = Math.floor(Math.min(raw, lmax));
            setV(s => ({ ...s, longitud: String(L) }));
            setInfo(raw > lmax ? `Para ${fmt(pmax, 0)} kg saldrían ${fmt(raw, 0)} mm; se limita a ${fmt(lmax, 0)} mm.` : `Longitud para ${fmt(pmax, 0)} kg totales (con extra): ${fmt(L, 0)} mm.`);
          }}>Calcular longitud (peso total {fmt(pmax, 0)} kg)</Button>
        </div>
        {info && <Text size={200} style={{ color: 'var(--subtle)' }}>{info}</Text>}
      </div>
    </Card>
  );
}

export function Module6() {
  const [rho, setRho] = useState('7850'); const [lmaxS, setLmaxS] = useState('1500'); const [pmaxS, setPmaxS] = useState('80');
  const lmax = parseNum(lmaxS) ?? 1500, pmax = parseNum(pmaxS) ?? 80;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <Card><Title3>Peso de tramos de conducto</Title3>
        <Text size={200} style={{ color: 'var(--subtle)' }}>Peso = perímetro × longitud × espesor × densidad (perímetro, área y volumen se calculan internamente). Verde: dato manual · azul: constante · amarillo: calculado. Dimensiones en mm; decimales con punto o coma.</Text>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Densidad (kg/m³)"><Input value={rho} onChange={(_, x) => setRho(x.value)} /></Field>
          <Field label="Longitud máx. de conducto (mm)"><Input value={lmaxS} onChange={(_, x) => setLmaxS(x.value)} /></Field>
          <Field label="Peso máx. del tramo (kg)"><Input value={pmaxS} onChange={(_, x) => setPmaxS(x.value)} /></Field>
</div></Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 16, alignItems: 'start' }}>
        {(['Rectangular', 'Circular', 'Oval'] as WShape[]).map(s => <Calc key={s} shape={s} rho={rho} lmax={lmax} pmax={pmax} />)}
        <Calc key="espiro" spiro shape="Circular" rho={rho} lmax={lmax} pmax={pmax} />
      </div>
    </div>
  );
}
