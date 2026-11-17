import { describe, it, expect } from 'vitest';
import { airProps } from '../engine/air';
import { colebrook, swameeJain } from '../engine/friction';
import { hydraulicDiameter, equivalentDiameter, area } from '../engine/geometry';
import { sizeDuct, unitLoss } from '../engine/sizing';
import { calcLosses } from '../engine/losses';
import { calcDuct } from '../engine/ducts';
import { calcGrille, foranTag } from '../engine/grilles';
import { defaultDesign, DEFAULT_ACCESSORIES, DEFAULT_MATERIALS } from '../engine/defaults';
import { CFM_TO_M3H } from '../engine/units';
import { LossRow, DuctRow } from '../engine/types';

describe('aire', () => {
  it('ν a 20 °C ≈ 1,51e-5', () => expect(airProps(20).nu).toBeCloseTo(1.51e-5, 7));
  it('ρ a 20 °C ≈ 1,204', () => expect(airProps(20).rho).toBeCloseTo(1.204, 3));
});
describe('fricción', () => {
  it('Colebrook ≈ Swamee-Jain (<1 %)', () => {
    const c = colebrook(1e5, 0.00015, 0.3), s = swameeJain(1e5, 0.00015, 0.3);
    expect(Math.abs(c - s) / c).toBeLessThan(0.01);
  });
  it('Colebrook liso Re=1e5 ≈ 0,018', () => expect(colebrook(1e5, 0, 0.3)).toBeCloseTo(0.0180, 3));
  it('laminar 64/Re', () => expect(colebrook(1000, 0.0001, 0.1)).toBeCloseTo(0.064, 5));
});
describe('geometría', () => {
  it('Dh circular = d', () => expect(hydraulicDiameter({ shape: 'Circular', d: 300 })).toBeCloseTo(0.3));
  it('Dh rect 400x200 = 2ab/(a+b)', () => expect(hydraulicDiameter({ shape: 'Rectangular', a: 200, b: 400 })).toBeCloseTo(0.26667, 4));
  it('Dh oval círculo degenerado = d (corrección vs Excel que daba d/2)', () => expect(hydraulicDiameter({ shape: 'Oval', a: 300, b: 300 })).toBeCloseTo(0.3, 5));
  it('De Huebscher 400x200', () => expect(equivalentDiameter({ shape: 'Rectangular', a: 200, b: 400 })).toBeCloseTo(0.30467, 4));
  it('área oval', () => expect(area({ shape: 'Oval', a: 200, b: 400 })).toBeCloseTo(Math.PI / 4 * 0.08, 6));
});
describe('dimensionado', () => {
  it('fricción igual cumple el objetivo (circular)', () => {
    const r = sizeDuct({ method: 'friccion', shape: 'Circular', q: 2000, roughness: 0.15, tC: 24, ratio: 2, step: 1, frictionTarget: 1 });
    expect(r.dpPerM).toBeGreaterThan(0.85); expect(r.dpPerM).toBeLessThan(1.05);
  });
  it('velocidad reducida rect', () => {
    const r = sizeDuct({ method: 'velocidad', shape: 'Rectangular', q: 3600, roughness: 0.15, tC: 24, ratio: 2, step: 10, velTarget: 8 });
    expect(r.velocity).toBeLessThanOrEqual(8.05); expect(r.velocity).toBeGreaterThan(6.5);
  });
  it('recuperación estática reduce la velocidad', () => {
    const r = sizeDuct({ method: 'recuperacion', shape: 'Circular', q: 3000, roughness: 0.15, tC: 24, ratio: 2, step: 1, v1: 12, regain: 0.75, length: 4 });
    expect(r.velocity).toBeLessThan(12);
  });
  it('unitLoss coherente', () => expect(unitLoss(3600, { shape: 'Circular', d: 400 }, 0.15, 24).dp).toBeGreaterThan(0));
});
describe('pérdidas de carga', () => {
  const d = defaultDesign();
  const mk = (p: Partial<LossRow>): LossRow => ({ uid: Math.random() + '', n1: 1, n2: null, n3: null, sistema: '1', nLinea: '1', tipo: 'Circular', accesorio: 'Conducto', caudal: 3600, alto: null, ancho: null, ovAlto: null, ovAncho: null, diam: 400, longitud: 5000, material: 'Acero galvanizado', ...p });
  it('ΔP conducto = f·L/D·ρv²/2', () => {
    const s = calcLosses([mk({})], d, DEFAULT_ACCESSORIES, DEFAULT_MATERIALS);
    const r = s.rows[0]; const v = 1 / (Math.PI / 4 * 0.16);
    expect(r.v).toBeCloseTo(v, 6);
    expect(r.dp).toBeCloseTo(r.f! * (5 / 0.4) * s.rho * v * v / 2, 6);
  });
  it('accesorio usa K', () => {
    const s = calcLosses([mk({ accesorio: 'Codo 90 radio largo' })], d, DEFAULT_ACCESSORIES, DEFAULT_MATERIALS);
    expect(s.rows[0].k).toBe(0.3); expect(s.rows[0].dp).toBeCloseTo(0.3 * s.rho * s.rows[0].v! ** 2 / 2, 6);
  });
  it('acumulado: ramal suma el total del padre y marca el máximo', () => {
    const rows = [mk({}), mk({ accesorio: 'Codo 90 radio largo' }), mk({ n2: 1, longitud: 2000 }), mk({ n2: 2, longitud: 8000 })];
    const s = calcLosses(rows, d, DEFAULT_ACCESSORIES, DEFAULT_MATERIALS);
    const main = s.rows[0].dp! + s.rows[1].dp!;
    expect(s.rows[1].dpTotal).toBeCloseTo(main, 6);
    expect(s.rows[2].idPadre).toBe('1.0'); expect(s.rows[2].dpTotal).toBeCloseTo(main + s.rows[2].dp!, 6);
    expect(s.max).toBeCloseTo(s.rows[3].dpTotal!, 6); expect(s.rows[3].isMax).toBe(true);
  });
  it('IDs como en la hoja', () => {
    const s = calcLosses([mk({ n2: 2, n3: 3 }), mk({ n2: 2 }), mk({})], d, DEFAULT_ACCESSORIES, DEFAULT_MATERIALS);
    expect(s.rows.map(r => r.idTramo)).toEqual(['1.2.3', '1.2', '1.0']);
    expect(s.rows.map(r => r.idPadre)).toEqual(['1.2', '1.0', 'VENTILADOR']);
  });
  it('ruido', () => {
    const s = calcLosses([mk({})], d, DEFAULT_ACCESSORIES, DEFAULT_MATERIALS); const r = s.rows[0];
    expect(r.noise).toBeCloseTo(-20 + 10 * Math.log10(r.area!) + 50 * Math.log10(r.v!) + 55, 6);
  });
});
describe('conductos y rejillas', () => {
  const d = defaultDesign();
  const row = (p: Partial<DuctRow>): DuctRow => ({ uid: 'x', id: 1, sistema: 1, tipo: 1, plenum: false, eAlto: 254, eAncho: 508, eDiam: null, eCaudal: 1000 * CFM_TO_M3H, fAlto: null, fAncho: null, fDiam: null, longitud: null, elemento: 'Conducto', equipo: '', bloque: '', funcional: false, detalle: false, soportado: false, ...p });
  it('velocidad teórica tipo 1 = 3000 fpm = 15,24 m/s', () => expect(calcDuct(row({}), d).velTeor).toBeCloseTo(15.24, 2));
  it('caudal teórico esquema', () => expect(calcDuct(row({}), d).qTeor).toBeCloseTo(0.129032 * 15.24 * 3600, 1));
  it('colores', () => {
    expect(calcDuct(row({ fAlto: 100, fAncho: 100 }), d).state).toBe('high');
    expect(calcDuct(row({ fAlto: 1000, fAncho: 1000 }), d).state).toBe('low');
  });
  it('tag Foran', () => { expect(foranTag('01R12')).toBe('0112'); expect(foranTag('ABC')).toBe('ABC'); });
  it('rejilla rojo/verde', () => {
    const g = { uid: 'g', nr: 1, sws: 510, idRejilla: 'ER1', descripcion: '', caudal: 3600, mfr: 'Munters' as const, partNo: '', area: 0.5, velReq: 2, alto: 500, ancho: 500 };
    expect(calcGrille(g).velReal).toBeCloseTo(4, 6); expect(calcGrille(g).state).toBe('high');
  });
});
