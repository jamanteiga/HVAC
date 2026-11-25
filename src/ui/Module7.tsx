import { useEffect, useRef, useState } from 'react';
import { Card, Text, Title3 } from '@fluentui/react-components';
import { CODOS_ESPECIALES, deltaX, trianguloB } from '../engine/special';
import { parseNum } from './DataGrid';
import { parseCoords, combinarLecturas } from '../engine/ocr';

// Colores de la hoja: verde = dato manual, amarillo = calculado.
const C = { in: '#b9e6a5', calc: '#fff3a6', mid: '#d9c4f0', head: '#00b0f0' };
const cell: React.CSSProperties = { padding: '3px 8px', color: '#111', borderBottom: '1px solid rgba(0,0,0,.12)' };
const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const Row = ({ label, color, children, unit, bold }: any) => (<tr style={{ background: color, fontWeight: bold ? 700 : 400 }}><td style={cell}>{label}</td><td style={{ ...cell, textAlign: 'right', width: 140 }}>{children}</td><td style={{ ...cell, textAlign: 'center', width: 70 }}>{unit}</td></tr>);
const field: React.CSSProperties = { width: 120, background: 'transparent', color: '#111', border: 'none', borderBottom: '1px solid #555', textAlign: 'right', fontSize: 13, padding: '2px 0' };

export function Module7() {
  const [dz, setDz] = useState(''); const [codo, setCodo] = useState('');
  const dx = codo ? deltaX(parseNum(dz) ?? NaN, +codo) : null;
  const [p, setP] = useState<Record<string, string>>({});
  const set = (k: string) => (e: any) => { setOcrKeys(o => o.filter(x => x !== k)); setP(o => ({ ...o, [k]: e.target.value })); };
  const [ocrKeys, setOcrKeys] = useState<string[]>([]); const [estado, setEstado] = useState(''); const [vista, setVista] = useState<string | null>(null);
  const leer = async (f: File) => {
    setVista(URL.createObjectURL(f)); setEstado('Leyendo la imagen… (la primera vez tarda unos segundos)');
    try {
      const { createWorker } = await import('tesseract.js');
      const base = new URL('./ocr/', window.location.href).href;
      const w = await createWorker('eng', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base, gzip: true } as any);
      const bmp = await createImageBitmap(f), textos: string[] = [];
      // varias pasadas (escala/desenfoque/modo de página): en capturas de pantalla cada una acierta valores distintos
      const pasadas: [number, number, string][] = [[1.5, 1, '4'], [2.5, 1.5, '4'], [3, 2, '4'], [2, 1, '6'], [1.5, 1, '11'], [2.5, 1.5, '11'], [1, 0, '4']];
      let res = combinarLecturas([]), i = 0;
      for (const [esc, blur, psm] of pasadas) {
        i++; setEstado(`Leyendo la imagen… pasada ${i} de ${pasadas.length}`);
        const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * esc); cv.height = Math.round(bmp.height * esc);
        const g = cv.getContext('2d')!; g.filter = `grayscale(1) contrast(1.5) blur(${blur}px)`; g.drawImage(bmp, 0, 0, cv.width, cv.height);
        await w.setParameters({ tessedit_pageseg_mode: psm as any });
        try { textos.push((await w.recognize(cv)).data.text); } catch { continue; }
        res = combinarLecturas(textos); if (res.completo) break;
      }
      await w.terminate();
      let c = res.coords, avisos = res.avisos, ver = res.verificados;
      if (Object.keys(c).length < 6) { const alt = textos.map(parseCoords).sort((x, y) => Object.keys(y).length - Object.keys(x).length)[0] ?? {}; if (Object.keys(alt).length > Object.keys(c).length) { c = alt; avisos = []; ver = 0; } }
      const n = Object.keys(c).length;
      setP(o => ({ ...o, ...c })); setOcrKeys(Object.keys(c));
      setEstado(n === 6 ? 'Coordenadas leídas (marcadas en naranja)' + (avisos.length ? ' · ATENCIÓN: ' + avisos.join('; ') : (ver >= 2 ? ': coinciden con DX/DY/DZ.' : ': revísalas.')) : n > 0 ? `Solo se han leído ${n} de 6 valores: completa el resto a mano.` : 'No he encontrado coordenadas en la imagen.');
    } catch (e: any) { setEstado('Error al leer la imagen: ' + (e?.message ?? e)); }
  };
  const leerRef = useRef(leer); leerRef.current = leer;
  useEffect(() => {
    const h = (e: ClipboardEvent) => { const f = [...(e.clipboardData?.files ?? [])].find(x => x.type.startsWith('image/')); if (f) { e.preventDefault(); leerRef.current(f); } };
    window.addEventListener('paste', h); return () => window.removeEventListener('paste', h);
  }, []);
  const ks = ['x1', 'y1', 'z1', 'x2', 'y2', 'z2'], vals = ks.map(k => parseNum(p[k] ?? ''));
  const ok = vals.every(v => v != null);
  const [a1, setA1] = useState('45'), [a2, setA2] = useState('45');
  const r = ok ? trianguloB({ x: vals[0]!, y: vals[1]!, z: vals[2]! }, { x: vals[3]!, y: vals[4]!, z: vals[5]! }, +a1) : null;
  const sel = (v: string, f: (x: string) => void) => <select value={v} onChange={e => f(e.target.value)} style={field}>{CODOS_ESPECIALES.map(a => <option key={a} value={a} style={{ color: '#111' }}>{a}</option>)}</select>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <Card><Title3>Cálculos especiales</Title3>
        <Text size={200} style={{ color: 'var(--subtle)' }}>Verde: dato manual · violeta: cálculo intermedio · amarillo: resultado. Decimales con punto o coma.</Text></Card>
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
            <tr><td colSpan={3} style={{ background: '#fff', padding: '4px 8px 8px' }}>
              <div tabIndex={0} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = [...e.dataTransfer.files].find(x => x.type.startsWith('image/')); if (f) leer(f); }}
                style={{ border: '2px dashed #8a8a8a', borderRadius: 6, padding: 8, textAlign: 'center', color: '#333', fontSize: 12, background: '#fafafa' }}>
                {vista ? <img src={vista} alt="Coordenadas pegadas" style={{ maxWidth: '100%', maxHeight: 160, display: 'block', margin: '0 auto 6px' }} /> : null}
                Pega aquí (Ctrl+V) la imagen con las coordenadas de P1 y P2, o arrástrala · <label style={{ textDecoration: 'underline', cursor: 'pointer' }}>elegir archivo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) leer(f); e.target.value = ''; }} /></label>
                {estado && <div style={{ marginTop: 4, color: '#111', fontWeight: 600 }}>{estado}</div>}
              </div></td></tr>
            {['x1', 'y1', 'z1', 'x2', 'y2', 'z2'].map(k => <Row key={k} label={k[0].toUpperCase() + k[1] + (k[0] === 'z' ? ' (cota)' : '')} color={C.in} unit="mm"><input value={p[k] ?? ''} onChange={set(k)} inputMode="decimal" style={ocrKeys.includes(k) ? { ...field, outline: '2px solid #ff8c00' } : field} /></Row>)}
            <Row label="β" color={C.in} unit="°">{sel(a1, setA1)}</Row>
            <Row label="γ" color={C.in} unit="°">{sel(a2, setA2)}</Row>
            <Row label="ΔX = |X2 − X1|" color={C.mid} unit="mm">{r ? fmt(r.dX) : ''}</Row>
            <Row label="ΔY = |Y2 − Y1|" color={C.mid} unit="mm">{r ? fmt(r.dY) : ''}</Row>
            <Row label="ΔZ = Z2 − Z1" color={C.mid} unit="mm">{r ? fmt(r.dZ) : ''}</Row>
            <Row label="A (P1–P2 en planta)" color={C.mid} unit="mm">{r ? fmt(r.A) : ''}</Row>
            <Row label="Longitud P1–P3 (ΔY / sen β)" color={C.mid} unit="mm">{r ? fmt(r.longitud) : ''}</Row>
            <Row label="Proyección P1–P3 en X (ΔY / tan β)" color={C.mid} unit="mm">{r ? fmt(r.proyeccion) : ''}</Row>
            <Row label="Distancia B" color={C.calc} unit="mm" bold>{r ? <span style={{ color: r.B < 0 ? '#b00020' : undefined }}>{fmt(r.B)}</span> : ''}</Row>
            {r && r.B < 0 && <tr><td colSpan={3} style={{ ...cell, color: '#b00020', fontSize: 12 }}>β demasiado pequeño: P3 queda más allá de P2 (B negativo).</td></tr>}
          </tbody>
        </table>
      </Card>
      </div>
    </div>
  );
}
