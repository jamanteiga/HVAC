import { Button, MessageBar, MessageBarBody, Card, Dropdown, Field, Input, Option, Textarea, Title3, Subtitle2, Text, Divider } from '@fluentui/react-components';
import { useStore } from '../store';
import { SHIP_TYPES, DesignData } from '../engine/types';
import { calcLosses } from '../engine/losses';
import { calcDuct } from '../engine/ducts';
import { calcGrille } from '../engine/grilles';
import { airProps } from '../engine/air';
import { useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { DataGrid, numCol } from './DataGrid';
import { defaultLocales } from '../engine/defaults';
import { saveToFile, openFromFile, hasFileSystem, currentFileName } from '../io/file';

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 };

export function Module1() {
  const p = useStore(s => s.project); const set = useStore(s => s.setDesign); const d = p.design;
  const setProject = useStore(s => s.setProject); const [fmsg, setFmsg] = useState<{ t: 'success' | 'error' | 'info'; m: string } | null>(null);
  const run = async (fn: () => Promise<string | null>) => { try { const m = await fn(); if (m) setFmsg({ t: 'success', m }); } catch (e: any) { setFmsg({ t: 'error', m: e.message || String(e) }); } };
  const locales = d.locales ?? defaultLocales(); const [lsel, setLsel] = useState<string | null>(null);
  const lrows = locales.map((l, i) => ({ ...l, uid: String(i) }));
  const lcols: ColDef[] = [{ field: 'name', headerName: 'Local / zona', flex: 1, minWidth: 200, editable: true }, numCol('vTarget', 'v objetivo (m/s)', { d: 1, width: 130 }), numCol('vMin', 'v mín. (m/s)', { d: 1, width: 115 }), numCol('vMax', 'v máx. (m/s)', { d: 1, width: 115 }),
    { field: 'nbq', headerName: 'NBQ (sobrepresión)', width: 150, editable: true, cellDataType: 'boolean' }, numCol('overP', 'Sobrepresión (Pa)', { d: 0, width: 140 })];
  const upL = (id: string, f: string, v: any) => set({ locales: locales.map((l, i) => String(i) === id ? { ...l, [f]: v } : l) });
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
        <Card style={{ gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button appearance="primary" onClick={() => run(async () => { const n = await saveToFile(p); return n ? `Guardado en «${n}»` : null; })}>Guardar proyecto (.json)</Button>
            {hasFileSystem() && <Button onClick={() => run(async () => { const n = await saveToFile(p, true); return n ? `Guardado en «${n}»` : null; })}>Guardar como…</Button>}
            <Button onClick={() => run(async () => { const r = await openFromFile(); if (!r) return null; setProject(r.project); return `Abierto «${r.name}»`; })}>Abrir proyecto (.json)</Button>
            {currentFileName() && <Text size={200} style={{ color: 'var(--subtle)' }}>Fichero actual: {currentFileName()}</Text>}
          </div>
          <Text size={200} style={{ color: 'var(--subtle)' }}>{hasFileSystem() ? '«Guardar» sobrescribe el fichero abierto (la primera vez pregunta dónde). ' : 'Guardar descarga el .json a la carpeta de descargas; guárdalo donde quieras. '}Además, los cambios se guardan solos en este navegador.</Text>
          {fmsg && <MessageBar intent={fmsg.t}><MessageBarBody>{fmsg.m}</MessageBarBody></MessageBar>}
        </Card>
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
          <Text size={200} style={{ color: 'var(--subtle)' }}>Con la T interior de verano: ρ = {air.rho.toFixed(3)} kg/m³ · ν = {(air.nu * 1e6).toFixed(3)}·10⁻⁶ m²/s (se usan en todos los cálculos de pérdidas).</Text></Card>
        <Card><Title3>Locales y velocidades de diseño</Title3>
          <Text size={200} style={{ color: 'var(--subtle)' }}>Velocidad objetivo y rango por tipo de local (rango general de diseño 7–10 m/s). Valores de partida orientativos, editables. Los locales NBQ trabajan en ligera sobrepresión respecto a la atmosférica: se aplica a la densidad del aire en Pérdidas de carga (columna «Local»).</Text>
          <div style={{ height: 270 }}><DataGrid rows={lrows} columns={lcols} selectedId={lsel} onSelect={setLsel} message={`${locales.length} locales`}
            onChange={upL} onAdd={() => set({ locales: [...locales, { name: 'Nuevo local', vTarget: 8, vMin: 7, vMax: 10, nbq: false, overP: 0 }] })}
            onRemove={id => set({ locales: locales.filter((_, i) => String(i) !== id) })} /></div></Card>
        <Card><Title3>Consideraciones heredadas de otros buques</Title3>
          <div style={grid}>{T('buquePartida', 'Buque de partida')}{T('buqueSimilar', 'Buque similar')}</div>
          <Field label="Notas / criterios heredados"><Textarea rows={4} value={d.notasHerencia} onChange={(_, v) => set({ notasHerencia: v.value })} /></Field></Card>
      </div>
      <Card style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
        <Subtitle2>Resumen en tiempo real</Subtitle2><Divider />
        {([['Proyecto', d.nombre || '—'], ['Código', d.codigo || '—'], ['Buque', d.buque || '—'], ['Tipo', d.tipoBuque], ['Cliente', d.cliente || '—'], ['Ingeniero', d.ingeniero || '—'], ['Fecha', d.fecha],
          ['T int/ext verano', `${d.tIntVerano} / ${d.tExtVerano} °C`], ['T int/ext invierno', `${d.tIntInvierno} / ${d.tExtInvierno} °C`],
          ['Buque de partida', d.buquePartida || '—'], ['Buque similar', d.buqueSimilar || '—']] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}><span style={{ color: 'var(--subtle)' }}>{k}</span><b style={{ textAlign: 'right' }}>{v}</b></div>))}
        <Divider />
        {([['Elementos de conducto', sum.duc], ['  V Foran > teórica', sum.high], ['  V Foran < teórica', sum.low], ['Rejillas exteriores', sum.rej], ['  V real > calculada', sum.rejHigh], ['Tramos de pérdidas', sum.tr], ['ΔP máxima (Pa)', sum.max.toFixed(1)], ['Elementos ≥ 50 dB', sum.noise]] as [string, any][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--subtle)', whiteSpace: 'pre' }}>{k}</span><b>{v}</b></div>))}
      </Card>
    </div>
  );
}
