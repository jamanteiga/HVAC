import { useMemo, useState } from 'react';
import { TabList, Tab, Card, Field, Input, Dropdown, Option, Button, Title3, Subtitle2, Text, MessageBar, MessageBarBody, Divider } from '@fluentui/react-components';
import { ColDef } from 'ag-grid-community';
import { useStore } from '../store';
import { DataGrid, calcCol, numCol, COLORS, parseNum, fmt, paint } from './DataGrid';
import { calcDuct, VelState } from '../engine/ducts';
import { calcGrille } from '../engine/grilles';
import { calcLosses } from '../engine/losses';
import { ELEMENT_TYPES, Shape } from '../engine/types';
import { DUCT_TYPE_TABLE, defaultLocales } from '../engine/defaults';
import { importDucts, importGrilles, importLosses, readWorkbook } from '../io/importExcel';
import { sizeDuct, Method } from '../engine/sizing';

const stateColor = (s: VelState) => (s === 'low' ? COLORS.blue : s === 'equal' ? COLORS.green : s === 'high' ? COLORS.red : undefined);
const boolCol = (field: string, h: string): ColDef => ({ field, headerName: h, width: 95, editable: true, cellDataType: 'boolean' });
const selCol = (field: string, h: string, values: any[], width = 120): ColDef => ({ field, headerName: h, width, editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values } });

/* ---------------- Conductos ---------------- */
function Ducts() {
  const { project: p, selected, setSelected, update, add, remove, replaceRows } = useStore();
  const d = p.design; const [msg, setMsg] = useState('');
  const rows = useMemo(() => p.ducts.map(r => ({ ...r, _c: calcDuct(r, d) })), [p.ducts, d]);
  const cols: ColDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, pinned: 'left', editable: false },
    numCol('sistema', 'Sistema', { d: 0, width: 85 }),
    { field: 'tipo', headerName: 'Tipo conducto', width: 110, editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: [1, 2, 3, 4] }, valueParser: x => parseInt(x.newValue, 10), tooltipValueGetter: x => DUCT_TYPE_TABLE.find(t => t.id === x.value)?.label },
    calcCol('V teórica (m/s)', x => x._c.velTeor),
    boolCol('plenum', 'Plenum'),
    numCol('eAlto', 'Alto esq. (mm)', { d: 1 }), numCol('eAncho', 'Ancho esq. (mm)', { d: 1 }), numCol('eDiam', 'Ø esq. (mm)', { d: 1 }),
    calcCol('Q teórico esq. (m³/h)', x => x._c.qTeor, { d: 0, width: 130 }),
    numCol('eCaudal', 'Q real esq. (m³/h)', { d: 1, width: 130 }),
    calcCol('V real esq. (m/s)', x => x._c.velEsq),
    numCol('fAlto', 'Alto Foran (mm)', { d: 0, width: 110 }), numCol('fAncho', 'Ancho Foran (mm)', { d: 0, width: 115 }), numCol('fDiam', 'Ø Foran (mm)', { d: 0, width: 105 }),
    calcCol('V Foran (m/s)', x => x._c.velForan, { width: 110, cellStyle: p => paint(stateColor(p.data._c.state)) }),
    calcCol('Q Foran (m³/h)', x => x._c.qForan, { d: 1, width: 115 }),
    numCol('longitud', 'Longitud (mm)', { d: 0, width: 110 }),
    selCol('elemento', 'Elemento', [...ELEMENT_TYPES]),
    { field: 'equipo', headerName: 'Equipo principal', width: 150, editable: true }, { field: 'bloque', headerName: 'Bloque', width: 100, editable: true },
    boolCol('funcional', '¿Modelo funcional?'), boolCol('detalle', '¿Modelado detalle?'), boolCol('soportado', '¿Soportado?'),
  ], []);
  return <DataGrid rows={rows} columns={cols} selectedId={selected.ducts} onSelect={id => setSelected('ducts', id)}
    onChange={(id, f, v) => update('ducts', id, { [f]: f === 'tipo' ? Number(v) : v })}
    onAdd={() => add('ducts')} onInsert={(id, w) => add('ducts', { uid: id, where: w })} onRemove={id => remove('ducts', id)}
    message={msg || `${rows.length} filas · ID renumerado automáticamente`}
    onImport={async f => { try { const r = importDucts(await readWorkbook(f)); if (!p.ducts.length || confirm(`Se reemplazarán las ${p.ducts.length} filas actuales por ${r.rows.length} importadas. ¿Continuar?`)) { replaceRows('ducts', r.rows); setMsg(`Importadas ${r.rows.length} filas de «${r.sheet}»`); } } catch (e: any) { setMsg(e.message); } }} />;
}

/* ---------------- Rejillas ---------------- */
function Grilles() {
  const { project: p, selected, setSelected, update, add, remove, replaceRows } = useStore(); const [msg, setMsg] = useState('');
  const rows = useMemo(() => p.grilles.map(r => ({ ...r, _c: calcGrille(r) })), [p.grilles]);
  const cols: ColDef[] = useMemo(() => [
    { field: 'nr', headerName: 'NR', width: 65, pinned: 'left', editable: false },
    numCol('sws', 'SWS', { d: 0, width: 80 }),
    { field: 'idRejilla', headerName: 'ID rejilla', width: 110, editable: true },
    { field: 'descripcion', headerName: 'Descripción (local / zona)', width: 240, editable: true },
    numCol('caudal', 'Q (m³/h)', { d: 1 }),
    selCol('mfr', 'MFR', ['Munters', 'Fabricated'], 110),
    { field: 'partNo', headerName: 'Part Nº', width: 100, editable: true },
    numCol('area', 'Área esq. (m²)', { d: 4, width: 110 }), numCol('velReq', 'V requerida (m/s)', { d: 2, width: 125 }),
    calcCol('V calculada (m/s)', x => x._c.velCalc, { width: 120 }),
    numCol('alto', 'Alto (mm)', { d: 0 }), numCol('ancho', 'Ancho (mm)', { d: 0 }),
    calcCol('Área real (m²)', x => x._c.areaReal, { d: 4 }),
    calcCol('V real (m/s)', x => x._c.velReal, { cellStyle: p => paint(p.data._c.state === 'high' ? COLORS.red : p.data._c.state === 'low' ? COLORS.green : undefined) }),
    calcCol('Tag Foran', x => x._c.tag, { type: undefined, width: 110 }),
  ], []);
  return <DataGrid rows={rows} columns={cols} selectedId={selected.grilles} onSelect={id => setSelected('grilles', id)}
    onChange={(id, f, v) => update('grilles', id, { [f]: v })}
    onAdd={() => add('grilles')} onInsert={(id, w) => add('grilles', { uid: id, where: w })} onRemove={id => remove('grilles', id)}
    message={msg || `${rows.length} filas`}
    onImport={async f => { try { const r = importGrilles(await readWorkbook(f)); if (!p.grilles.length || confirm(`Se reemplazarán las ${p.grilles.length} filas actuales por ${r.rows.length} importadas. ¿Continuar?`)) { replaceRows('grilles', r.rows); setMsg(`Importadas ${r.rows.length} filas de «${r.sheet}»`); } } catch (e: any) { setMsg(e.message); } }} />;
}

/* ---------------- Pérdidas de carga ---------------- */
function Losses() {
  const { project: p, selected, setSelected, update, add, remove, replaceRows } = useStore(); const [msg, setMsg] = useState('');
  const sum = useMemo(() => calcLosses(p.losses, p.design, p.accessories, p.materials), [p]);
  const rows = useMemo(() => p.losses.map((r, i) => ({ ...r, _c: sum.rows[i] })), [p.losses, sum]);
  const localNames = (p.design.locales ?? defaultLocales()).map(l => l.name);
  const accNames = useMemo(() => [...p.accessories.map(a => a.name)].sort((a, b) => a.localeCompare(b, 'es')), [p.accessories]);
  const cols: ColDef[] = useMemo(() => [
    numCol('n1', 'N1 Principal', { d: 0, width: 95, pinned: 'left' }), numCol('n2', 'N2 Ramal', { d: 0, width: 85, pinned: 'left' }), numCol('n3', 'N3 Derivación', { d: 0, width: 105, pinned: 'left' }),
    calcCol('ID tramo', x => x._c.idTramo, { type: undefined, width: 85 }), calcCol('ID padre', x => x._c.idPadre, { type: undefined, width: 105 }),
    { field: 'sistema', headerName: 'Sistema', width: 90, editable: true }, { field: 'nLinea', headerName: 'Nº línea', width: 85, editable: true },
    selCol('tipo', 'Tipo conducto', ['Circular', 'Rectangular', 'Oval'], 125),
    { field: 'local', headerName: 'Local', width: 190, editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['', ...localNames] } },
    { field: 'accesorio', headerName: 'Accesorio', width: 260, editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: accNames, allowTyping: true, filterList: true, searchType: 'matchAny' } },
    calcCol('K', x => x._c.k, { width: 70, cellStyle: p => (p.data._c.k == null ? paint(COLORS.warn, false) : undefined) }),
    numCol('caudal', 'Q (m³/h)', { d: 1 }), calcCol('V (m/s)', x => x._c.v),
    numCol('alto', 'Alto rect. (mm)', { d: 0, width: 110 }), numCol('ancho', 'Ancho rect. (mm)', { d: 0, width: 115 }),
    numCol('ovAlto', 'Alto oval (mm)', { d: 0, width: 110 }), numCol('ovAncho', 'Ancho oval (mm)', { d: 0, width: 115 }), numCol('diam', 'Ø (mm)', { d: 0, width: 85 }),
    numCol('longitud', 'Longitud (mm)', { d: 0, width: 110 }),
    calcCol('Área (m²)', x => x._c.area, { d: 4 }), calcCol('Dh (m)', x => x._c.dh, { d: 4 }), calcCol('De (m)', x => x._c.de, { d: 4 }),
    { field: 'material', headerName: 'Material', width: 170, editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: p.materials.map(m => m.name) } },
    calcCol('ε (mm)', x => x._c.rough, { d: 4, width: 80 }), calcCol('Reynolds', x => x._c.re, { d: 0 }), calcCol('f', x => x._c.f, { d: 5, width: 85 }),
    calcCol('ΔP (Pa)', x => x._c.dp, { d: 2 }),
    calcCol('ΔP total (Pa)', x => x._c.dpTotal, { d: 2, width: 115, cellStyle: p => (p.data._c.isMax ? paint(COLORS.orange) : undefined) }),
    calcCol('Ruido (dB)', x => x._c.noise, { d: 1, cellStyle: p => (p.data._c.noise == null ? undefined : paint(p.data._c.noise >= 50 ? COLORS.red : COLORS.softGreen, false)) }),
    calcCol('Avisos', x => x._c.warn ?? '', { type: undefined, width: 200 }),
  ], [accNames, p.materials, localNames.join('|')]);
  return <DataGrid rows={rows} columns={cols} selectedId={selected.losses} onSelect={id => setSelected('losses', id)}
    onChange={(id, f, v) => update('losses', id, { [f]: v })}
    onAdd={() => add('losses')} onInsert={(id, w) => add('losses', { uid: id, where: w })} onRemove={id => remove('losses', id)}
    message={msg || `ΔP máx. = ${sum.max.toFixed(1)} Pa · ρ = ${sum.rho.toFixed(3)} kg/m³ · ν = ${(sum.nu * 1e6).toFixed(2)}e-6 m²/s`}
    onImport={async f => { try { const r = importLosses(await readWorkbook(f)); if (!p.losses.length || confirm(`Se reemplazarán las ${p.losses.length} filas actuales por ${r.rows.length} importadas. ¿Continuar?`)) { replaceRows('losses', r.rows); setMsg(`Importadas ${r.rows.length} filas de «${r.sheet}»`); } } catch (e: any) { setMsg(e.message); } }} />;
}

/* ---------------- Dimensionado ---------------- */
function Sizing() {
  const { project: p, setDesign, selected, update } = useStore(); const d = p.design;
  const [m, setM] = useState<Method>('friccion'); const [shape, setShape] = useState<Shape>('Rectangular'); const [q, setQ] = useState(3600);
  const [mat, setMat] = useState('Acero galvanizado'); const [vt, setVt] = useState<1 | 2 | 3 | 4>(3); const [len, setLen] = useState(3); const [maxH, setMaxH] = useState('');
  const rough = p.materials.find(x => x.name === mat)?.roughness ?? 0.15;
  const res = useMemo(() => sizeDuct({ method: m, shape, q, roughness: rough, tC: d.tIntVerano, pPa: d.presion, ratio: d.relacionAspecto, step: d.paso, frictionTarget: d.fricObjetivo, velTarget: d.velTipos[vt], v1: d.regainV1, regain: d.regainFactor, length: len, maxHeight: parseNum(maxH) }), [m, shape, q, rough, d, vt, len, maxH]);
  const names: Record<Method, string> = { friccion: 'Fricción igual', velocidad: 'Velocidad reducida', recuperacion: 'Recuperación estática' };
  const num = (v: number, set: (n: number) => void) => <Input type="number" value={String(v)} onChange={(_, x) => set(parseNum(x.value) ?? 0)} />;
  const apply = (c: 'losses' | 'ducts') => {
    const id = selected[c]; if (!id) return;
    if (c === 'losses') update('losses', id, { tipo: shape, alto: shape === 'Rectangular' ? res.alto : null, ancho: shape === 'Rectangular' ? res.ancho : null, ovAlto: shape === 'Oval' ? res.alto : null, ovAncho: shape === 'Oval' ? res.ancho : null, diam: shape === 'Circular' ? res.diam : null, caudal: q, material: mat });
    else update('ducts', id, { fAlto: res.alto, fAncho: res.ancho, fDiam: res.diam, eCaudal: q });
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16, overflow: 'auto', height: '100%', alignContent: 'start' }}>
      <Card><Title3>Calculadora de dimensionado</Title3>
        <Field label="Método"><Dropdown value={names[m]} selectedOptions={[m]} onOptionSelect={(_, o) => setM(o.optionValue as Method)}>{(Object.keys(names) as Method[]).map(k => <Option key={k} value={k}>{names[k]}</Option>)}</Dropdown></Field>
        <Field label="Forma"><Dropdown value={shape} selectedOptions={[shape]} onOptionSelect={(_, o) => setShape(o.optionValue as Shape)}>{['Circular', 'Rectangular', 'Oval'].map(k => <Option key={k} value={k}>{k}</Option>)}</Dropdown></Field>
        <Field label="Caudal (m³/h)">{num(q, setQ)}</Field>
        <Field label="Material"><Dropdown value={mat} selectedOptions={[mat]} onOptionSelect={(_, o) => setMat(o.optionValue as string)}>{p.materials.map(x => <Option key={x.name} value={x.name}>{x.name}</Option>)}</Dropdown></Field>
        {m === 'velocidad' && <Field label="Tipo de conducto (velocidad objetivo)"><Dropdown value={`${vt} · ${d.velTipos[vt]} m/s`} selectedOptions={[String(vt)]} onOptionSelect={(_, o) => setVt(Number(o.optionValue) as any)}>{DUCT_TYPE_TABLE.map(t => <Option key={t.id} value={String(t.id)} text={`${t.id} · ${d.velTipos[t.id]} m/s`}>{t.id} · {t.label} ({d.velTipos[t.id]} m/s)</Option>)}</Dropdown></Field>}
        {m === 'recuperacion' && <Field label="Longitud del tramo (m)">{num(len, setLen)}</Field>}
        {shape !== 'Circular' && <Field label="Altura máxima (mm, opcional)"><Input value={maxH} onChange={(_, x) => setMaxH(x.value)} /></Field>}
        <Divider />
        <Subtitle2>Resultado</Subtitle2>
        <div style={{ fontSize: 14, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
          {res.diam != null && <><span>Diámetro</span><b>Ø {res.diam} mm</b></>}
          {res.alto != null && <><span>{shape === 'Oval' ? 'Eje menor × mayor' : 'Alto × ancho'}</span><b>{res.alto} × {res.ancho} mm</b></>}
          <span>Velocidad</span><b>{res.velocity.toFixed(2)} m/s</b><span>Pérdida unitaria</span><b>{res.dpPerM.toFixed(3)} Pa/m</b><span>Reynolds · f</span><b>{Math.round(res.re).toLocaleString('es-ES')} · {res.f.toFixed(4)}</b></div>
        {res.note && <MessageBar intent="warning"><MessageBarBody>{res.note}</MessageBarBody></MessageBar>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button appearance="primary" disabled={!selected.losses} onClick={() => apply('losses')}>Aplicar a fila seleccionada de Pérdidas</Button>
          <Button disabled={!selected.ducts} onClick={() => apply('ducts')}>Aplicar a fila seleccionada de Conductos (Foran)</Button></div>
      </Card>
      <Card><Title3>Parámetros de dimensionado</Title3>
        <Text size={200}>Entorno naval: valores por defecto de partida (editables). Los de velocidad provienen de la tabla de tipos de conducto.</Text>
        <Field label="Fricción igual — objetivo (Pa/m)">{num(d.fricObjetivo, v => setDesign({ fricObjetivo: v }))}</Field>
        <Field label="Recuperación estática — velocidad inicial (m/s)">{num(d.regainV1, v => setDesign({ regainV1: v }))}</Field>
        <Field label="Recuperación estática — factor de recuperación R">{num(d.regainFactor, v => setDesign({ regainFactor: v }))}</Field>
        <Field label="Relación de aspecto ancho/alto (rect. y oval)">{num(d.relacionAspecto, v => setDesign({ relacionAspecto: v }))}</Field>
        <Field label="Redondeo de dimensiones (mm)">{num(d.paso, v => setDesign({ paso: v || 1 }))}</Field>
        <Field label="Tolerancia «velocidad igual» (%)">{num(d.tolVel, v => setDesign({ tolVel: v }))}</Field>
        <Divider /><Subtitle2>Velocidad de diseño por tipo de conducto (m/s)</Subtitle2>
        {DUCT_TYPE_TABLE.map(t => <Field key={t.id} label={`${t.id} · ${t.label} (${t.fpm} fpm)`}>{num(d.velTipos[t.id], v => setDesign({ velTipos: { ...d.velTipos, [t.id]: v } }))}</Field>)}
      </Card>
    </div>
  );
}

/* ---------------- Tablas ---------------- */
function Tables() {
  const { project: p, setTables } = useStore(); const [sel, setSel] = useState<{ a: string | null; m: string | null }>({ a: null, m: null });
  const A = useMemo(() => p.accessories.map((a, i) => ({ ...a, uid: String(i) })), [p.accessories]);
  const M = useMemo(() => p.materials.map((a, i) => ({ ...a, uid: String(i) })), [p.materials]);
  const colsA: ColDef[] = [{ field: 'name', headerName: 'Accesorio', flex: 1, editable: true }, numCol('k', 'K', { d: 3 })];
  const colsM: ColDef[] = [{ field: 'name', headerName: 'Material', flex: 1, editable: true }, numCol('roughness', 'Rugosidad (mm)', { d: 4, width: 130 }), numCol('c', 'Coef. C', { d: 0 })];
  const ed = <T,>(arr: T[], id: string, f: string, v: any) => arr.map((x, i) => (String(i) === id ? { ...x, [f]: v } : x));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%' }}>
      <DataGrid rows={A} columns={colsA} selectedId={sel.a} onSelect={id => setSel(s => ({ ...s, a: id }))} message={`${A.length} accesorios`}
        onChange={(id, f, v) => setTables({ accessories: ed(p.accessories, id, f, v) })}
        onAdd={() => setTables({ accessories: [...p.accessories, { name: 'Nuevo accesorio', k: 0 }] })}
        onRemove={id => setTables({ accessories: p.accessories.filter((_, i) => String(i) !== id) })} />
      <DataGrid rows={M} columns={colsM} selectedId={sel.m} onSelect={id => setSel(s => ({ ...s, m: id }))} message={`${M.length} materiales`}
        onChange={(id, f, v) => setTables({ materials: ed(p.materials, id, f, v) })}
        onAdd={() => setTables({ materials: [...p.materials, { name: 'Nuevo material', roughness: 0.15, c: 120 }] })}
        onRemove={id => setTables({ materials: p.materials.filter((_, i) => String(i) !== id) })} />
    </div>
  );
}

export function Module2() {
  const [tab, setTab] = useState('ducts');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)}>
        <Tab value="ducts">Conductos</Tab><Tab value="grilles">Rejillas exteriores</Tab><Tab value="losses">Pérdidas de carga</Tab><Tab value="sizing">Dimensionado</Tab><Tab value="tables">Accesorios y materiales</Tab>
      </TabList>
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === 'ducts' && <Ducts />}{tab === 'grilles' && <Grilles />}{tab === 'losses' && <Losses />}{tab === 'sizing' && <Sizing />}{tab === 'tables' && <Tables />}
      </div>
    </div>
  );
}
void fmt;
