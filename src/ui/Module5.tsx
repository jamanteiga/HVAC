import { useMemo, useState } from 'react';
import { Card, Field, Input, Dropdown, Option, TabList, Tab, Title3, Subtitle2, Text, MessageBar, MessageBarBody, Textarea, Button } from '@fluentui/react-components';
import { ColDef } from 'ag-grid-community';
import { useStore } from '../store';
import { DataGrid, numCol, parseNum } from './DataGrid';
import { defaultLocales } from '../engine/defaults';
import { circularOptions, rectOptions, rectCheck, circCheck, deDarcy, ovalOptions, provisionalOval, R20_SERIES, SPIRO_SERIES, SPIRO, spiroThickness, CRITERIOS_VEL, requiredArea, parseOvalTable, Opt } from '../engine/quick';

const f = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 12px', background: 'var(--hdr)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '5px 12px', borderBottom: '1px solid var(--border2)', whiteSpace: 'nowrap' };

const GRN = 'rgba(46,160,67,0.45)';
const YEL = 'rgba(255,214,0,0.45)', RED = 'rgba(224,36,36,0.5)';
/** Fondo de la relación: normal ≤ lim; amarillo > lim; rojo > 3,5. */
const ratioBg = (extra: string | undefined, lim?: number) => { if (lim == null) return undefined; const x = parseFloat(extra ?? ''); return x > 3.5 + 1e-9 ? RED : x > lim + 1e-9 ? YEL : undefined; };

function Result({ rows, kind, vt, lim, dBg }: { rows: Opt[]; kind: 'circ' | 'dim'; vt: number; lim?: number; dBg?: (d: number) => string | undefined }) {
  if (!rows.length) return <MessageBar intent="warning"><MessageBarBody>Sin resultados con estos límites.</MessageBarBody></MessageBar>;
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
        <thead><tr><th style={th}>{kind === 'circ' ? 'Ø interior (mm)' : 'Interior (mm)'}</th>{kind === 'dim' && <th style={th}>Relación</th>}{kind === 'circ' && <th style={th}>Espesor e (mm)</th>}<th style={th}>Área (m²)</th><th style={th}>v real (m/s)</th><th style={th}>Desv. vs objetivo</th><th style={th}>ΔP (Pa/m)</th><th style={th}>Nota</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i} style={{ background: r.best ? 'var(--best)' : undefined, fontWeight: r.best ? 600 : 400 }}>
            <td style={{ ...td, background: kind === 'circ' && dBg ? dBg(r.d ?? 0) : undefined }}>{kind === 'circ' ? `Ø ${r.d}` : `${r.a} × ${r.b}`}</td>{kind === 'dim' && <td style={{ ...td, background: ratioBg(r.extra, lim) }}>{r.extra}</td>}
            {kind === 'circ' && <td style={td}>{spiroThickness(r.d) ?? '—'}</td>}
            <td style={td}>{f(r.area, 4)}</td>
            <td style={{ ...td, color: r.v > vt * 1.0000001 ? 'var(--over)' : undefined }}>{f(r.v)}</td>
            <td style={td}>{r.dev >= 0 ? '+' : ''}{f(r.dev * 100, 1)} %</td><td style={td}>{f(r.dp, 3)}</td><td style={td}>{r.label}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

export function Module5() {
  const { project: p, setTables } = useStore();
  const [q, setQ] = useState('3600'); const [v, setV] = useState('8'); const [loc, setLoc] = useState(''); const [mat, setMat] = useState('Acero galvanizado');
  const [crit, setCrit] = useState(''); const [mode, setMode] = useState<'exceso' | 'proximo'>('exceso'); const [tab, setTab] = useState('circ');
  const [rratio, setRratio] = useState('2'); const [oratio, setOratio] = useState('6');
  const [spD, setSpD] = useState(''); const [circD, setCircD] = useState('');  // Ø del diagrama: único para todos los tipos de conducto
  const [diagD, setDiagD] = useState('');
  const [fixH, setFixH] = useState(''); const [fixW, setFixW] = useState('');
  const [omax, setOmax] = useState(''); const [paste, setPaste] = useState(''); const [sel, setSel] = useState<string | null>(null);
  const locales = p.design.locales ?? defaultLocales(); const L = locales.find(l => l.name === loc); const C = CRITERIOS_VEL.find(c => c.name === crit);
  const rng = C ? { name: C.name, min: C.vMin, max: C.vMax } : L ? { name: L.name, min: L.vMin, max: L.vMax } : { name: '', min: 7, max: 10 };
  const Q = parseNum(q) ?? 0, V = parseNum(v) ?? 0;
  const rRaw = parseNum(rratio); const RR = Math.min(rRaw && rRaw >= 1 ? rRaw : 2, 3.5); const rOver = !!rRaw && rRaw > 3.5;
  const valid = Q > 0 && V > 0;
  const ctx = useMemo(() => ({ rough: p.materials.find(m => m.name === mat)?.roughness ?? 0.15, tC: p.design.tIntVerano, p: p.design.presion }), [p.materials, mat, p.design]);
  const circS = p.circSizes ?? SPIRO_SERIES; const ovalT = p.ovalSizes ?? provisionalOval(); const provisional = !p.ovalSizes;
  const A = valid ? requiredArea(Q, V) : 0;
  const circ = useMemo(() => valid ? circularOptions(Q, V, circS, ctx) : [], [Q, V, circS, ctx, valid]);
  const hN = parseNum(fixH) ?? 0, wN = parseNum(fixW) ?? 0; const both = hN > 0 && wN > 0;
  const DD = parseNum(diagD) ?? 0; const dReq = valid ? Math.sqrt((4 * A) / Math.PI) * 1000 : 0;
  const bgFor = (dd: number) => (d: number) => dd > 0 ? (d > dd + 1e-9 ? RED : GRN) : undefined; // verde si ≤ Ø del diagrama, rojo si lo supera
  const DC = DD, DS = DD; const dBg = bgFor(DD), dBgC = bgFor(DC), dBgS = bgFor(DS);
  const cD = parseNum(circD) ?? 0; const cchk = valid && cD > 0 ? circCheck(Q, V, ctx, cD) : null;
  const spRows = useMemo(() => valid ? SPIRO.map(x => ({ ...circCheck(Q, V, ctx, x.di), e: x.e })) : [], [Q, V, ctx, valid]);
  const spBest = spRows.findIndex(r => r.v <= V * (1 + 1e-9));
  const spSel = spRows.find(r => String(r.d) === spD) ?? null;
  const reqLineFor = (dd: number, bg: (d: number) => string | undefined) => valid && ( <Text style={{ background: bg(dReq), padding: '4px 8px', borderRadius: 4, width: 'fit-content' }}>Caudal y velocidad → área necesaria <b>{f(A, 4)} m²</b> · Ø hidráulico necesario <b>{f(dReq, 2)} mm</b>{dd > 0 && <> · diagrama <b>{f(dd, 0)} mm</b> ({dReq > dd + 1e-9 ? 'lo supera' : 'dentro'})</>}</Text>);
  const reqLine = reqLineFor(DD, dBg);
  const deqR = valid && both ? deDarcy(Q, hN, wN, ctx) : 0;
  const chk = valid && both ? rectCheck(Q, V, ctx, hN, wN, 3.5) : null;
  const rect = useMemo(() => valid ? rectOptions(Q, V, ctx, { min: 100, maxH: 1000, stepH: 50, mode, fixH: both ? null : parseNum(fixH), fixW: both ? null : parseNum(fixW), maxRatio: RR }) : [], [Q, V, ctx, rratio, mode, fixH, fixW, both, valid]);
  const oval = useMemo(() => valid ? ovalOptions(Q, V, ovalT, ctx, { maxMinor: parseNum(omax), maxRatio: parseNum(oratio) ?? 6, mode }) : [], [Q, V, ovalT, ctx, omax, oratio, mode, valid]);
  const num = (val: string, set: (s: string) => void) => <Input value={val} onChange={(_, x) => set(x.value)} />;
  const ovalRows = useMemo(() => ovalT.map((t, i) => ({ ...t, uid: String(i) })), [ovalT]);
  const ovalCols: ColDef[] = [numCol('minor', 'Eje menor (mm)', { d: 0, flex: 1 }), numCol('major', 'Eje mayor (mm)', { d: 0, flex: 1 })];
  const best = (r: Opt[]) => r.find(x => x.best);
  const bc = best(circ), br = best(rect), bo = best(oval);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <Card>
        <Title3>Dimensionado rápido — medidas interiores</Title3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
          <Field label="Caudal (m³/h)">{num(q, setQ)}</Field>
          <Field label="Relación máx. rectangular (1:x)" validationState={rOver ? 'warning' : 'none'} validationMessage={rOver ? 'Máximo 1:3,5 (se aplica 3,5)' : undefined}>{num(rratio, setRratio)}</Field>
          <Field label="Local (velocidad de diseño)"><Dropdown value={loc || '— libre —'} selectedOptions={[loc]} onOptionSelect={(_, o) => { const n = (o.optionValue as string) ?? ''; setLoc(n); setCrit(''); const l = locales.find(x => x.name === n); if (l) setV(String(l.vTarget)); }}>
            <Option value="">— libre —</Option>{locales.map(l => <Option key={l.name} value={l.name}>{l.name}</Option>)}</Dropdown></Field>
          <Field label="Criterio de velocidad (5.4.0.1)"><Dropdown value={crit || '— ninguno —'} selectedOptions={[crit]} onOptionSelect={(_, o) => { const n = (o.optionValue as string) ?? ''; setCrit(n); const c = CRITERIOS_VEL.find(x => x.name === n); if (c) { setV(String(c.vTarget)); setLoc(''); } }}>
            <Option value="">— ninguno —</Option>{CRITERIOS_VEL.map(c => <Option key={c.name} value={c.name}>{c.name}</Option>)}</Dropdown></Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Field label="Velocidad (m/s)">{num(v, setV)}</Field>
            <div style={{ display: 'flex', gap: 4 }}>{[7, 8, 9, 10].map(x => <Button key={x} size="small" appearance={V === x ? 'primary' : 'secondary'} onClick={() => setV(String(x))}>{x}</Button>)}</div></div>
          <Field label="Material (para ΔP)"><Dropdown value={mat} selectedOptions={[mat]} onOptionSelect={(_, o) => setMat(o.optionValue as string)}>{p.materials.map(m => <Option key={m.name} value={m.name}>{m.name}</Option>)}</Dropdown></Field>
          <Field label="Criterio de redondeo"><Dropdown value={mode === 'exceso' ? 'Sin superar la velocidad' : 'Medida más próxima'} selectedOptions={[mode]} onOptionSelect={(_, o) => setMode(o.optionValue as any)}>
            <Option value="exceso">Sin superar la velocidad</Option><Option value="proximo">Medida más próxima</Option></Dropdown></Field>
        </div>
        {valid && (V < rng.min - 1e-9 || V > rng.max + 1e-9) && <MessageBar intent="warning"><MessageBarBody>{rng.name ? `Para «${rng.name}» el rango es ${rng.min > 0 ? `${rng.min}–` : 'máx. '}${rng.max} m/s.` : `La velocidad ${f(V, 1)} m/s está fuera del rango habitual 7–10 m/s.`}</MessageBarBody></MessageBar>}
        {L?.nbq && <Text size={200} style={{ color: 'var(--subtle)' }}>Local NBQ en sobrepresión de {L.overP} Pa respecto a la atmosférica (efecto despreciable en el dimensionado rápido).</Text>}
        {valid && <Text>Área necesaria: <b>{f(A, 4)} m²</b> · Ø equivalente exacto: <b>{f(Math.sqrt((4 * A) / Math.PI) * 1000, 1)} mm</b></Text>}
        {valid && <Text size={200} style={{ color: 'var(--text)' }}>
          Recomendado → Circular: <b>{bc ? `Ø ${bc.d}` : '—'}</b> · Rectangular (más próximo): <b>{br ? `${br.a} × ${br.b}` : '—'}</b> · Oval (más próximo): <b>{bo ? `${bo.a} × ${bo.b}` : '—'}</b></Text>}
      </Card>
      {Q > 0 && <Card><Subtitle2>Comparativa 7 – 10 m/s (mismo caudal)</Subtitle2>
        <table style={{ borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['v (m/s)', 'Área (m²)', 'Circular', 'Rectangular (más próx.)', 'Oval (más próx.)'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{[7, 8, 9, 10].map(x => { const c = circularOptions(Q, x, circS, ctx).find(o => o.best); const r = rectOptions(Q, x, ctx, { min: 100, maxH: 1000, stepH: 50, mode, maxRatio: RR }).find(o => o.best); const o = ovalOptions(Q, x, ovalT, ctx, { maxMinor: parseNum(omax), maxRatio: parseNum(oratio) ?? 6, mode }).find(z => z.best);
            return <tr key={x} style={{ background: x === V ? 'var(--best)' : undefined }}><td style={td}>{x}</td><td style={td}>{f(requiredArea(Q, x), 4)}</td><td style={td}>{c ? `Ø ${c.d}` : '—'}</td><td style={td}>{r ? `${r.a} × ${r.b}` : '—'}</td><td style={td}>{o ? `${o.a} × ${o.b}` : '—'}</td></tr>; })}</tbody></table></Card>}
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)}>
        <Tab value="circ">Circular (Ø normalizados)</Tab><Tab value="espiro">Espiro (Spiroduct)</Tab><Tab value="rect">Rectangular (múltiplos de 5)</Tab><Tab value="oval">Oval plano (normalizados)</Tab><Tab value="tablas">Tablas normalizadas</Tab>
      </TabList>
      {tab === 'circ' && <Card><Subtitle2>Diámetros interiores normalizados</Subtitle2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}><Field label="Ø del diagrama (mm)">{num(diagD, setDiagD)}</Field><Field label="Diámetro interior manual (mm, opc.)">{num(circD, setCircD)}</Field></div>
        {reqLineFor(DC, dBgC)}
        {cchk && <div style={{ overflow: 'auto' }}><table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th style={th}>Ø interior (mm)</th><th style={th}>Espesor e (mm)</th><th style={th}>Área (m²)</th><th style={th}>v real (m/s)</th><th style={th}>ΔP (Pa/m)</th><th style={th}>Nota</th></tr></thead>
          <tbody><tr style={{ background: 'var(--best)', fontWeight: 600 }}><td style={{ ...td, background: dBgC(cD) }}>Ø {f(cD, cD % 1 ? 1 : 0)}</td><td style={td}>{spiroThickness(cD) ?? '—'}</td><td style={td}>{f(cchk.area, 4)}</td>
            <td style={{ ...td, color: cchk.v > rng.max + 1e-9 ? 'var(--over)' : undefined }}>{f(cchk.v)}</td><td style={td}>{f(cchk.dp, 3)}</td><td style={td}>{cchk.label}</td></tr></tbody></table></div>}
        {cchk && <Subtitle2>Normalizados</Subtitle2>}
        <Result rows={circ} kind="circ" vt={V} dBg={dBgC} /></Card>}
      {tab === 'espiro' && <Card><Subtitle2>Conducto espiro Spiroduct — acero galvanizado</Subtitle2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          <Field label="Ø del diagrama (mm)">{num(diagD, setDiagD)}</Field><Field label="Diámetro interior (lista normalizada)"><Dropdown value={spD ? `Ø ${spD}` : '— elegir —'} selectedOptions={[spD]} onOptionSelect={(_, o) => setSpD((o.optionValue as string) ?? '')}>
            <Option value="">— elegir —</Option>{SPIRO.map(x => <Option key={x.di} value={String(x.di)}>{`Ø ${x.di}`}</Option>)}</Dropdown></Field></div>
        {reqLineFor(DS, dBgS)}
        {spSel && <Text style={{ background: dBgS(spSel.d ?? 0) ?? 'var(--best)', padding: '6px 10px', borderRadius: 4, width: 'fit-content', fontWeight: 600 }}>Ø {spSel.d} · espesor {String(spSel.e).replace('.', ',')} mm · área {f(spSel.area, 4)} m² · v real <span style={{ color: spSel.v > rng.max + 1e-9 ? 'var(--over)' : undefined }}>{f(spSel.v)} m/s</span> · ΔP {f(spSel.dp, 3)} Pa/m</Text>}
        {!valid ? <MessageBar intent="warning"><MessageBarBody>Introduce caudal y velocidad.</MessageBarBody></MessageBar> : <div style={{ overflow: 'auto' }}><table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
          <thead><tr><th style={th}>Ø interior (mm)</th><th style={th}>Espesor e (mm)</th><th style={th}>Área (m²)</th><th style={th}>v real (m/s)</th><th style={th}>Desv. vs objetivo</th><th style={th}>ΔP (Pa/m)</th><th style={th}>Nota</th></tr></thead>
          <tbody>{spRows.map((r, i) => (<tr key={i} style={{ background: i === spBest ? 'var(--best)' : String(r.d) === spD ? 'var(--hdr)' : undefined, fontWeight: i === spBest ? 600 : 400 }}>
            <td style={{ ...td, background: dBgS(r.d ?? 0) }}>Ø {r.d}</td><td style={td}>{String(r.e).replace('.', ',')}</td><td style={td}>{f(r.area, 4)}</td>
            <td style={{ ...td, color: r.v > V * 1.0000001 ? 'var(--over)' : undefined }}>{f(r.v)}</td><td style={td}>{r.dev >= 0 ? '+' : ''}{f(r.dev * 100, 1)} %</td><td style={td}>{f(r.dp, 3)}</td><td style={td}>{i === spBest ? 'Recomendado (v ≤ objetivo)' : ''}</td></tr>))}</tbody></table>
          {spBest < 0 && <MessageBar intent="warning"><MessageBarBody>Ningún Spiroduct de la tabla (hasta Ø315) cumple la velocidad con este caudal; usa el circular normalizado.</MessageBarBody></MessageBar>}</div>}
      </Card>}
      {tab === 'rect' && <Card><Subtitle2>Rectangular — ambos lados terminados en 0 o 5</Subtitle2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          <Field label="Ø hidráulico del diagrama (mm)">{num(diagD, setDiagD)}</Field>
          <Field label="Alto (mm)">{num(fixH, setFixH)}</Field><Field label="Ancho (mm)">{num(fixW, setFixW)}</Field></div>
        <Text size={200} style={{ color: 'var(--subtle)' }}>Indica alto y ancho para calcular la velocidad con el caudal; con solo uno se calcula el otro lado; sin ninguno se muestran alternativas.</Text>
        {reqLine}
        {chk && <div style={{ overflow: 'auto' }}><table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th style={th}>Interior (mm)</th><th style={th}>Relación</th><th style={th}>Área (m²)</th><th style={th}>Ø hidráulico, igual pérdida de carga (mm)</th><th style={th}>v real (m/s)</th><th style={th}>ΔP (Pa/m)</th><th style={th}>Nota</th></tr></thead>
          <tbody><tr style={{ background: 'var(--best)', fontWeight: 600 }}><td style={td}>{hN} × {wN}</td><td style={{ ...td, background: ratioBg(chk.extra, RR) }}>{chk.extra}</td><td style={td}>{f(chk.area, 4)}</td><td style={{ ...td, background: dBg(deqR) }}>{f(deqR, 2)}</td>
            <td style={{ ...td, color: chk.v > rng.max + 1e-9 ? 'var(--over)' : undefined }}>{f(chk.v)}</td><td style={td}>{f(chk.dp, 3)}</td><td style={td}>{chk.label}</td></tr></tbody></table></div>}
        {chk && ratioBg(chk.extra, RR) && <MessageBar intent={ratioBg(chk.extra, RR) === RED ? 'error' : 'warning'}><MessageBarBody>{ratioBg(chk.extra, RR) === RED ? 'La relación supera el límite 1:3,5.' : `La relación supera 1:${f(RR, 1)} (normal); el límite es 1:3,5.`}</MessageBarBody></MessageBar>}
        {chk && chk.v > rng.max + 1e-9 && <MessageBar intent="warning"><MessageBarBody>La velocidad {f(chk.v, 1)} m/s supera el máximo de {rng.max} m/s.</MessageBarBody></MessageBar>}
        {chk && <Subtitle2>Alternativas</Subtitle2>}
        <Result rows={rect} kind="dim" vt={V} lim={RR} /></Card>}
      {tab === 'oval' && <Card><Subtitle2>Oval plano — menor eje a cada medida normalizada</Subtitle2>
        {provisional && <MessageBar intent="warning"><MessageBarBody>Tabla PROVISIONAL (eje menor R20 × eje mayor en pasos de 50). Sustitúyela por la del fabricante en «Tablas normalizadas».</MessageBarBody></MessageBar>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          <Field label="Eje menor máx. (mm, opc.)">{num(omax, setOmax)}</Field><Field label="Relación máx. mayor/menor">{num(oratio, setOratio)}</Field></div>
        <Result rows={oval} kind="dim" vt={V} />
        <Text size={200} style={{ color: 'var(--subtle)' }}>Área oval plano = π·b²/4 + b·(a − b), con b = eje menor y a = eje mayor.</Text></Card>}
      {tab === 'tablas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, minHeight: 440 }}>
          <Card><Subtitle2>Diámetros circulares (mm)</Subtitle2>
            <Textarea rows={6} value={circS.join(', ')} onChange={(_, x) => { const a = x.value.split(/[\s,;]+/).map(s => parseFloat(s.replace(',', '.'))).filter(n => n > 0); if (a.length) setTables({ circSizes: a }); }} />
            <Button onClick={() => setTables({ circSizes: SPIRO_SERIES })}>Restaurar tabla Spiroduct (80–315) + R20 desde 355</Button></Card>
          <Card style={{ minHeight: 0 }}><Subtitle2>Oval plano — tabla normalizada ({ovalT.length} medidas)</Subtitle2>
            <Textarea rows={3} placeholder="Pega aquí desde Excel: eje menor ⇥ eje mayor (una medida por línea)" value={paste} onChange={(_, x) => setPaste(x.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button appearance="primary" disabled={!parseOvalTable(paste).length} onClick={() => { setTables({ ovalSizes: parseOvalTable(paste) }); setPaste(''); }}>Reemplazar tabla con lo pegado</Button>
              <Button disabled={!parseOvalTable(paste).length} onClick={() => { setTables({ ovalSizes: [...ovalT, ...parseOvalTable(paste)] }); setPaste(''); }}>Añadir lo pegado</Button></div>
            <div style={{ height: 260 }}>
              <DataGrid rows={ovalRows} columns={ovalCols} selectedId={sel} onSelect={setSel} message={`${ovalT.length} filas`}
                onChange={(id, fld, val) => setTables({ ovalSizes: ovalT.map((t, i) => String(i) === id ? { ...t, [fld]: val } : t) })}
                onAdd={() => setTables({ ovalSizes: [...ovalT, { minor: 100, major: 200 }] })}
                onRemove={id => setTables({ ovalSizes: ovalT.filter((_, i) => String(i) !== id) })} /></div></Card>
        </div>)}
    </div>
  );
}
