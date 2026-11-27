import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface V3D { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; beta: number }
const fmt = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function etiqueta(txt: string, color = '#111', esc = 1): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d')!; g.font = 'bold 64px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(txt, 256, 64); g.fillStyle = color; g.fillText(txt, 256, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(4 * esc, esc, 1); s.renderOrder = 10; return s;
}

/** Vista 3D (ejemplo) del esquema P1–P3–P2. Ejes: X rojo, Y verde, Z azul (cota). */
export function Vista3D({ d }: { d: V3D }) {
  const host = useRef<HTMLDivElement>(null);
  const orient = useRef<{ dir: THREE.Vector3; up: THREE.Vector3 } | null>(null);
  const api = useRef<{ vista: (v: 'planta' | 'alzado' | 'perfil' | 'iso') => void } | null>(null);

  useEffect(() => {
    const el = host.current!; const W = el.clientWidth || 600, H = 420;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W, H);
    renderer.setClearColor(0xf7f7f7); el.innerHTML = ''; el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 1, 1e6); cam.up.set(0, 0, 1);
    const ctl = new OrbitControls(cam, renderer.domElement); ctl.enableDamping = true;

    // coordenadas centradas en el punto medio (evita perder precisión con cifras grandes)
    const cx = (d.x1 + d.x2) / 2, cy = (d.y1 + d.y2) / 2, cz = (d.z1 + d.z1 + 2 * (d.z2 - d.z1)) / 2;
    const P = (x: number, y: number, z: number) => new THREE.Vector3(x - cx, y - cy, z - cz);
    const ZE = 2, zv = (z: number) => d.z1 + ZE * (z - d.z1);   // el desnivel se dibuja ×2 (solo visual)
    const dX = Math.abs(d.x2 - d.x1), dY = Math.abs(d.y2 - d.y1), b = d.beta * Math.PI / 180;
    const sx = d.x2 >= d.x1 ? 1 : -1, sy = d.y2 >= d.y1 ? 1 : -1;
    const x3 = d.x1 + sx * dY / Math.tan(b), B = dX - dY / Math.tan(b);
    const p1 = P(d.x1, d.y1, d.z1), p2 = P(d.x2, d.y2, zv(d.z2)), p3 = P(x3, d.y2, zv(d.z2));
    const L = Math.max(dX, dY, ZE * Math.abs(d.z2 - d.z1), 300), u = L / 40;   // unidad de tamaño para marcas y textos

    const linea = (pts: THREE.Vector3[], color: number, dash = false) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = dash ? new THREE.LineDashedMaterial({ color, dashSize: u * 1.5, gapSize: u }) : new THREE.LineBasicMaterial({ color });
      const l = new THREE.Line(g, m); if (dash) l.computeLineDistances(); scene.add(l); return l;
    };
    const punto = (p: THREE.Vector3, color: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(u * 0.7, 16, 12), new THREE.MeshBasicMaterial({ color })); m.position.copy(p); scene.add(m); };
    const txt = (t: string, p: THREE.Vector3, color?: string) => { const s = etiqueta(t, color, u * 5); s.position.copy(p); scene.add(s); };

    // tubo A (P1–P2) con grosor para que se lea como conducto
    const dir = new THREE.Vector3().subVectors(p2, p1), tubo = new THREE.Mesh(new THREE.CylinderGeometry(u * 0.35, u * 0.35, dir.length(), 12), new THREE.MeshBasicMaterial({ color: 0x1f6fd1 }));
    tubo.position.copy(p1).add(p2).multiplyScalar(0.5); tubo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); scene.add(tubo);

    linea([p1, p3], 0xe08a00, true);                      // recta a β desde P1 hasta P3
    linea([p3, p2], B < 0 ? 0xd00000 : 0x2e9e2e);         // B
    linea([p1, P(d.x1 - sx * L * 0.35, d.y1, d.z1)], 0x777777);    // horizontal de referencia por P1
    linea([p2, P(d.x2, d.y2, d.z1)], 0x888888, true);     // desnivel ΔZ
    // arco de β en el plano horizontal de P1
    const arc: THREE.Vector3[] = [], r = L * 0.12;
    for (let i = 0; i <= 24; i++) { const a = (b * i) / 24; arc.push(P(d.x1 - sx * r * Math.cos(a), d.y1 - sy * r * Math.sin(a), d.z1)); }
    linea(arc, 0xe08a00);
    // proyecciones de P2 y P3 sobre el plano XY de P1 (a la cota Z1): muestran cuánto suben sobre el plano
    const p2s = P(d.x2, d.y2, d.z1), p3s = P(x3, d.y2, d.z1);
    linea([p1, p3s], 0x999999, true); linea([p3s, p2s], 0x999999, true); linea([p1, p2s], 0x999999, true);
    linea([p3, p3s], 0x888888, true);
    const pm = (p: THREE.Vector3) => { const m = new THREE.Mesh(new THREE.SphereGeometry(u * 0.45, 12, 8), new THREE.MeshBasicMaterial({ color: 0x999999 })); m.position.copy(p); scene.add(m); };
    pm(p2s); pm(p3s);
    txt("P2'", p2s.clone().add(new THREE.Vector3(0, 0, -u * 2.5)), '#777'); txt("P3'", p3s.clone().add(new THREE.Vector3(0, 0, -u * 2.5)), '#777');
    punto(p1, 0x000000); punto(p2, 0x000000); punto(p3, B < 0 ? 0xd00000 : 0xe08a00);
    txt('P1', p1.clone().add(new THREE.Vector3(0, 0, u * 2.5))); txt('P2', p2.clone().add(new THREE.Vector3(0, 0, u * 2.5))); txt('P3', p3.clone().add(new THREE.Vector3(0, 0, u * 2.5)));
    txt('A', p1.clone().add(p2).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, u * 2.5)), '#1f6fd1');
    txt('B = ' + fmt(B), p3.clone().add(p2).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, -u * 2.5)), B < 0 ? '#d00000' : '#2e9e2e');
    txt('β ' + d.beta + '°', P(d.x1 - sx * r * 1.6 * Math.cos(b / 2), d.y1 - sy * r * 1.6 * Math.sin(b / 2), d.z1), '#e08a00');
    txt('ΔZ ' + fmt(d.z2 - d.z1) + ' (×' + ZE + ')', P(d.x2 + sx * u * 12, d.y2, (d.z1 + zv(d.z2)) / 2), '#555');

    // ejes (X rojo, Y verde, Z azul) en la esquina inferior del modelo
    const o = P(Math.min(d.x1, d.x2, x3) - L * 0.1, Math.min(d.y1, d.y2) - L * 0.1, Math.min(d.z1, zv(d.z2)));
    [[1, 0, 0, 0xff0000, 'X'], [0, 1, 0, 0x00a000, 'Y'], [0, 0, 1, 0x0050ff, 'Z']].forEach(([x, y, z, c, n]: any) => {
      const e = o.clone().add(new THREE.Vector3(x, y, z).multiplyScalar(L * 0.2)); linea([o, e], c); txt(n, e.clone().add(new THREE.Vector3(x, y, z).multiplyScalar(u * 2)), '#' + c.toString(16).padStart(6, '0'));
    });
    const rej = new THREE.GridHelper(L * 1.6, 16, 0xbbbbbb, 0xe0e0e0); rej.rotateX(Math.PI / 2); rej.position.set(0, 0, p1.z); scene.add(rej);
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.6, L * 1.6), new THREE.MeshBasicMaterial({ color: 0x9ec5ff, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false })); plano.position.set(0, 0, p1.z); scene.add(plano);

    // «Zoom todo»: encuadra todo el modelo (puntos, proyecciones, ejes) en la dirección de vista actual
    const caja = new THREE.Box3(); [p1, p2, p3, p2s, p3s, o, ...[[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(v => o.clone().add(new THREE.Vector3(...(v as [number, number, number])).multiplyScalar(L * 0.2)))].forEach(v => caja.expandByPoint(v));
    caja.expandByPoint(P(d.x2 + sx * u * 21, d.y2, (d.z1 + zv(d.z2)) / 2)); caja.expandByPoint(P(Math.min(d.x1, d.x2, x3) - u * 12, d.y1, d.z1));   // etiquetas laterales (ΔZ, β)
    const centro = caja.getCenter(new THREE.Vector3()), radio = caja.getBoundingSphere(new THREE.Sphere()).radius * 1.12;
    const vfov = cam.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * (W / H));
    const dist = radio / Math.sin(Math.min(vfov, hfov) / 2);
    const ajustar = (dir: THREE.Vector3, up: THREE.Vector3) => { cam.up.copy(up); cam.position.copy(centro).add(dir.clone().normalize().multiplyScalar(dist)); ctl.target.copy(centro); ctl.update(); };
    const vista = (v: 'planta' | 'alzado' | 'perfil' | 'iso') => {
      const dir = { planta: [0, 0, 1], alzado: [0, -1, 0.25], perfil: [1, 0, 0.25], iso: [0.9, -1, 1.1] }[v];
      ajustar(new THREE.Vector3(...(dir as [number, number, number])), new THREE.Vector3(...(v === 'planta' ? [0, 1, 0] : [0, 0, 1]) as [number, number, number]));
    };
    api.current = { vista };
    // al cambiar un dato se conserva la orientación que tenía el usuario y se vuelve a encuadrar todo
    ctl.addEventListener('change', () => { orient.current = { dir: cam.position.clone().sub(ctl.target), up: cam.up.clone() }; });
    if (orient.current) ajustar(orient.current.dir, orient.current.up); else vista('iso');

    let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); ctl.update(); renderer.render(scene, cam); }; loop();
    return () => { cancelAnimationFrame(raf); ctl.dispose(); renderer.dispose(); el.innerHTML = ''; };
  }, [d.x1, d.y1, d.z1, d.x2, d.y2, d.z2, d.beta]);

  const btn: React.CSSProperties = { padding: '3px 10px', border: '1px solid #888', borderRadius: 4, background: '#fff', color: '#111', cursor: 'pointer', fontSize: 12 };
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, padding: 6, flexWrap: 'wrap' }}>
        {(['iso', 'planta', 'alzado', 'perfil'] as const).map(v => <button key={v} style={btn} onClick={() => api.current?.vista(v)}>{{ iso: 'Isométrica', planta: 'Planta', alzado: 'Alzado', perfil: 'Perfil' }[v]}</button>)}
        <span style={{ fontSize: 11, color: '#555', alignSelf: 'center' }}>Arrastra para girar · rueda para zoom · botón derecho para desplazar</span>
      </div>
      <div ref={host} style={{ width: '100%', height: 420 }} />
    </div>
  );
}
