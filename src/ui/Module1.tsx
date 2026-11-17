import { Card, Dropdown, Field, Input, Option, Textarea, Title3, Subtitle2, Text, Divider } from '@fluentui/react-components';
import { useStore } from '../store';
import { SHIP_TYPES, DesignData } from '../engine/types';
import { calcLosses } from '../engine/losses';
import { calcDuct } from '../engine/ducts';
import { calcGrille } from '../engine/grilles';
import { airProps } from '../engine/air';
import { useMemo } from 'react';

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 };

export function Module1() {
  const p = useStore(s => s.project); const set = useStore(s => s.setDesign); const d = p.design;
  const T = (k: keyof DesignData, label: string, type: 'text' | 'number' | 'date' = 'text') => (
    <Field label={label}><Input type={type} value={String(d[k] ?? '')} onChange={(_, v) => set({ [k]: type === 'number' ? (v.value === '' ? 0 : parseFloat(v.value.replace(',', '.'))) : v.value } as any)} /></Field>
  );
  const air = airProps(d.tIntVerano, d.presion);
  const sum = useMemo(() => {
    const dc = p.ducts.map(r => calcDuct(r, d)); const ls = calcLosses(p.losses, d, p.accessories, p.materials);
    return { duc: p.ducts.length, high: dc.filter(c => c.state === 'high').length, low: dc.filter(c => c.state === 'low').length, rej: p.grilles.length, rejHigh: p.grilles.map(calcGrille).filter(g => g.state === 'high').length, max: ls.max, tr: new Set(ls.rows.map(r => r.idTramo)).size, noise: ls.rows.filter(r => (r.noise ?? 0) >= 50).length };
  }, [p, d]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card><Title3>Proyecto</Title3>
          <div style={grid}>{T('nombre', 'Nombre')}{T('codigo', 'Código')}{T('cliente', 'Cliente')}{T('ingeniero', 'Ingeniero')}{T('fecha', 'Fecha', 'date')}
            <Field label="Tipo de buque"><Dropdown value={d.tipoBuque} selectedOptions={[d.tipoBuque]} onOptionSelect={(_, o) => set({ tipoBuque: o.optionValue as string })}>
              {SHIP_TYPES.map(t => <Option key={t} value={t}>{t}</Option>)}</Dropdown></Field></div></Card>
        <Card><Title3>Información general</Title3>
          <div style={grid}>{T('buque', 'Buque / designación')}{T('cliente', 'Cliente')}
            <Field label="Tipo de buque"><Dropdown value={d.tipoBuque} selectedOptions={[d.tipoBuque]} onOptionSelect={(_, o) => set({ tipoBuque: o.optionValue as string })}>
              {SHIP_TYPES.map(t => <Option key={t} value={t}>{t}</Option>)}</Dropdown></Field></div></Card>
        <Card><Title3>Condiciones de diseño</Title3>
          <div style={grid}>{T('tIntVerano', 'T interior verano (°C)', 'number')}{T('tExtVerano', 'T exterior verano (°C)', 'number')}{T('tIntInvierno', 'T interior invierno (°C)', 'number')}{T('tExtInvierno', 'T exterior invierno (°C)', 'number')}{T('presion', 'Presión atmosférica (Pa)', 'number')}</div>
          <Text size={200} style={{ color: '#616161' }}>Con la T interior de verano: ρ = {air.rho.toFixed(3)} kg/m³ · ν = {(air.nu * 1e6).toFixed(3)}·10⁻⁶ m²/s (se usan en todos los cálculos de pérdidas).</Text></Card>
        <Card><Title3>Consideraciones heredadas de otros buques</Title3>
          <div style={grid}>{T('buquePartida', 'Buque de partida')}{T('buqueSimilar', 'Buque similar')}</div>
          <Field label="Notas / criterios heredados"><Textarea rows={4} value={d.notasHerencia} onChange={(_, v) => set({ notasHerencia: v.value })} /></Field></Card>
      </div>
      <Card style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
        <Subtitle2>Resumen en tiempo real</Subtitle2><Divider />
        {([['Proyecto', d.nombre || '—'], ['Código', d.codigo || '—'], ['Buque', d.buque || '—'], ['Tipo', d.tipoBuque], ['Cliente', d.cliente || '—'], ['Ingeniero', d.ingeniero || '—'], ['Fecha', d.fecha],
          ['T int/ext verano', `${d.tIntVerano} / ${d.tExtVerano} °C`], ['T int/ext invierno', `${d.tIntInvierno} / ${d.tExtInvierno} °C`],
          ['Buque de partida', d.buquePartida || '—'], ['Buque similar', d.buqueSimilar || '—']] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}><span style={{ color: '#616161' }}>{k}</span><b style={{ textAlign: 'right' }}>{v}</b></div>))}
        <Divider />
        {([['Elementos de conducto', sum.duc], ['  V Foran > teórica', sum.high], ['  V Foran < teórica', sum.low], ['Rejillas exteriores', sum.rej], ['  V real > calculada', sum.rejHigh], ['Tramos de pérdidas', sum.tr], ['ΔP máxima (Pa)', sum.max.toFixed(1)], ['Elementos ≥ 50 dB', sum.noise]] as [string, any][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#616161', whiteSpace: 'pre' }}>{k}</span><b>{v}</b></div>))}
      </Card>
    </div>
  );
}
