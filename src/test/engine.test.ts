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
  it('Dh oval círculo degenerado = d', () => expect(hydraulicDiameter({ shape: 'Oval', a: 300, b: 300 })).toBeCloseTo(0.3, 5));
  it('De Huebscher 400x200', () => expect(equivalentDiameter({ shape: 'Rectangular', a: 200, b: 400 })).toBeCloseTo(0.30467, 4));
  it('área oval plano 400x200 = πb²/4 + b(a−b)', () => expect(area({ shape: 'Oval', a: 400, b: 200 })).toBeCloseTo((Math.PI * 200 * 200 / 4 + 200 * 200) / 1e6, 8));
  it('De oval plano degenerado = d', () => expect(equivalentDiameter({ shape: 'Oval', a: 300, b: 300 })).toBeCloseTo(0.3, 3));
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
import { circularOptions, rectOptions, ovalOptions, provisionalOval, R20_SERIES, parseOvalTable } from '../engine/quick';
describe('dimensionado rápido', () => {
  const ctx = { rough: 0.15, tC: 24 };
  it('circular: recomendado cumple v ≤ objetivo y el anterior no', () => {
    const o = circularOptions(3600, 8, R20_SERIES, ctx); const rec = o.find(x => x.best)!;
    expect(rec.v).toBeLessThanOrEqual(8); const k = o.indexOf(rec); expect(o[k - 1].v).toBeGreaterThan(8);
  });
  it('rectangular: lados múltiplos de 5 y v ≤ objetivo (exceso)', () => {
    const o = rectOptions(3600, 8, ctx, { min: 100, maxH: 600, stepH: 50, mode: 'exceso', maxRatio: 6 });
    expect(o.length).toBeGreaterThan(3);
    for (const r of o) { expect(r.a! % 5).toBe(0); expect(r.b! % 5).toBe(0); expect(r.v).toBeLessThanOrEqual(8 + 1e-9); }
  });
  it('rectangular: altura fija 200', () => {
    const o = rectOptions(3600, 8, ctx, { min: 100, maxH: 600, stepH: 50, mode: 'exceso', maxRatio: 6, fixH: 200 });
    expect(o[0].a).toBe(200); expect(o[0].b! % 5).toBe(0); expect(o[0].v).toBeLessThanOrEqual(8);
  });
  it('oval: usa la tabla y cumple velocidad', () => {
    const o = ovalOptions(3600, 8, provisionalOval(), ctx, { maxRatio: 6, mode: 'exceso' });
    expect(o.length).toBeGreaterThan(0); for (const r of o) expect(r.v).toBeLessThanOrEqual(8 + 1e-9);
  });
  it('parsea tabla pegada', () => expect(parseOvalTable('100 x 200\n150;300\n250\t500,5')).toEqual([{ minor: 100, major: 200 }, { minor: 150, major: 300 }, { minor: 250, major: 500.5 }]));
});

describe('rectangular relación máx. 1:3,5', () => {
  it('ninguna alternativa supera 3,5', () => {
    const o = rectOptions(3600, 8, { rough: 0.15, tC: 24 }, { min: 100, maxH: 1000, stepH: 5, mode: 'exceso', maxRatio: 3.5 });
    expect(o.length).toBeGreaterThan(5); for (const r of o) expect(Math.max(r.a!, r.b!) / Math.min(r.a!, r.b!)).toBeLessThanOrEqual(3.5 + 1e-9);
  });
});

import { weight } from '../engine/weights';
describe('pesos (valores de la hoja de ejemplo)', () => {
  it('rectangular 402×932×3, L1108, +10,36', () => { const r = weight({ shape: 'Rectangular', alto: 402, ancho: 932, espesor: 3, longitud: 1108, densidad: 7850, extra: 10.36 });
    expect(r.perimetro).toBe(2668); expect(r.area).toBe(2956144); expect(r.volumen).toBe(8868432); expect(r.peso).toBeCloseTo(69.62, 2); expect(r.total).toBeCloseTo(79.98, 2); });
  it('circular Ø410×3, L1999', () => { const r = weight({ shape: 'Circular', diam: 410, espesor: 3, longitud: 1999, densidad: 7850, extra: 0 });
    expect(Math.round(r.perimetro)).toBe(1288); expect(Math.round(r.area)).toBe(2574818); expect(r.peso).toBeCloseTo(60.64, 2); });
  it('oval 1000×1000×2, L1217 ≈ 60 kg', () => { const r = weight({ shape: 'Oval', alto: 1000, ancho: 1000, espesor: 2, longitud: 1217, densidad: 7850, extra: 20 });
    expect(r.peso).toBeCloseTo(60, 1); expect(r.total).toBeCloseTo(80, 1); });
});
import { defaultLocales } from '../engine/defaults';
it('local NBQ aumenta ligeramente ρ y ΔP', () => {
  const d = { ...defaultDesign(), locales: defaultLocales() };
  const row: LossRow = { uid: 'x', n1: 1, n2: null, n3: null, sistema: '', nLinea: '', tipo: 'Circular', accesorio: 'Codo 90 radio largo', caudal: 3600, alto: null, ancho: null, ovAlto: null, ovAncho: null, diam: 400, longitud: null, material: 'Acero galvanizado' };
  const a = calcLosses([row], d, DEFAULT_ACCESSORIES, DEFAULT_MATERIALS).rows[0].dp!, b = calcLosses([{ ...row, local: 'Ciudadela NBQ' }], d, DEFAULT_ACCESSORIES, DEFAULT_MATERIALS).rows[0].dp!;
  expect(b).toBeGreaterThan(a); expect(b / a).toBeLessThan(1.001);
});

describe('longitud para peso máximo', () => {
  const k = weight({ shape: 'Rectangular', alto: 402, ancho: 932, espesor: 3, longitud: 1, densidad: 7850, extra: 0 }).peso; // kg/mm
  it('rect 402×932×3, extra 10,36, máx. 80 kg → ≈1108 mm (coincide con la hoja: 79,98 kg a 1108 mm)', () => expect((80 - 10.36) / k).toBeGreaterThan(1108));
  it('con extra 0 y 80 kg → ≈1273 mm (menor que 1500, manda el peso)', () => expect(80 / k).toBeCloseTo(1273, 0));
});

import { parseProject } from '../io/file';
describe('fichero .json', () => {
  it('lee un proyecto guardado y completa campos que falten', () => {
    const p = parseProject(JSON.stringify({ app: 'HVAC', version: 1, project: { id: 'a', design: { nombre: 'X' }, ducts: [], grilles: [], losses: [] } }));
    expect(p.design.nombre).toBe('X'); expect(p.design.tIntVerano).toBe(24); expect(p.accessories.length).toBeGreaterThan(100);
  });
  it('rechaza ficheros que no son proyectos', () => expect(() => parseProject('{"a":1}')).toThrow());
});

import { spiroThickness, SPIRO_SERIES, CRITERIOS_VEL } from '../engine/quick';
describe('Spiroduct y criterios', () => {
  it('espesores de la tabla', () => { expect(spiroThickness(200)).toBe(0.5); expect(spiroThickness(224)).toBe(0.8); expect(spiroThickness(355)).toBeNull(); });
  it('serie por defecto', () => { expect(SPIRO_SERIES.slice(0, 3)).toEqual([80, 100, 125]); expect(SPIRO_SERIES).toContain(300); expect(SPIRO_SERIES).not.toContain(90); expect(SPIRO_SERIES).toContain(355); });
  it('7 criterios', () => expect(CRITERIOS_VEL.length).toBe(7));
});

import { espesorTabla } from '../engine/weights';
describe('Tabla 1A-1 espesores', () => {
  it('no estanco', () => { expect([100, 150, 151, 300, 301, 450, 451, 760, 761, 2000].map(d => espesorTabla(d, false))).toEqual([1, 1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5]); });
  it('estanco', () => { expect([100, 150, 151, 300, 301, 450, 451, 761].map(d => espesorTabla(d, true))).toEqual([2, 2, 2.5, 2.5, 3, 3, 3, 3]); });
  it('sin dimensión', () => expect(espesorTabla(0, false)).toBeNull());
});

import { deHuebscher } from '../engine/quick';
describe('Huebscher', () => { it('200x400 ≈ 304,7 mm', () => expect(deHuebscher(200, 400)).toBeCloseTo(304.67, 1)); });

import { deDarcy } from '../engine/quick';
describe('Ø equivalente por igualdad de pérdida (Darcy-Weisbach)', () => {
  it('con la misma pérdida unitaria y caudal', () => {
    const ctx = { rough: 0.15, tC: 24 }; const d = deDarcy(2414, 200, 400, ctx);
    const r = unitLoss(2414, { shape: 'Rectangular', a: 200, b: 400 }, 0.15, 24).dp, c = unitLoss(2414, { shape: 'Circular', d }, 0.15, 24).dp;
    expect(Math.abs(c - r) / r).toBeLessThan(1e-6); expect(d).toBeGreaterThan(290); expect(d).toBeLessThan(320);
  });
});

describe('Rectangular de 50 en 50 desde medida inicial', () => {
  it('lados = 110 + 50k', () => {
    const o = rectOptions(2414, 10, { rough: 0.15, tC: 24 }, { series: { start: 110, step: 50 }, min: 100, maxH: 1000, stepH: 50, mode: 'exceso', maxRatio: 3.5 });
    expect(o.length).toBeGreaterThan(0);
    for (const r of o) { expect((r.a! - 110) % 50).toBe(0); expect((r.b! - 110) % 50).toBe(0); expect(r.v).toBeLessThanOrEqual(10 + 1e-9); }
  });
});

import { pesoSpiroAislado, spiroAislado } from '../engine/weights';
describe('Espiro aislado', () => {
  it('100 mm → 11,2 kg por 1000 mm; 315 mm → 30,1 kg', () => {
    expect(pesoSpiroAislado(100, 1000)).toBeCloseTo(11.2, 6);
    expect(pesoSpiroAislado(315, 1000)).toBeCloseTo(30.1, 6);
    expect(pesoSpiroAislado(200, 1500)).toBeCloseTo(30.9, 6);
    expect(spiroAislado(180)?.De).toBe(200);
  });
});

import { deltaX } from '../engine/special';
describe('Cálculos especiales', () => {
  it('ΔX = ΔZ / sen(codo) · π', () => {
    expect(deltaX(100, 30)).toBeCloseTo(100 / 0.5 * Math.PI, 6);
    expect(deltaX(250, 45)).toBeCloseTo(250 / Math.sin(Math.PI / 4) * Math.PI, 6);
    expect(deltaX(-1, 45)).toBeNull();
  });
});
