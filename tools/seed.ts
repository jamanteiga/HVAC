import { writeFileSync } from 'fs';
import { newProject, newDuct, newGrille, newLoss } from '../src/store';
import { CFM_TO_M3H } from '../src/engine/units';
const p = newProject();
p.design = { ...p.design, nombre: 'Corbeta BLOR – Ejemplo', codigo: 'GHN-0123', cliente: 'Armada', ingeniero: 'J. Manteiga', buque: 'BLOR-01', tipoBuque: 'BLOR', buquePartida: 'F-110', buqueSimilar: 'Hobart' };
const D = (o: any) => ({ ...newDuct(), ...o });
p.ducts = [
  D({ sistema: 1, tipo: 1, eAlto: 508, eAncho: 762, eCaudal: 5000 * CFM_TO_M3H, fAlto: 500, fAncho: 750, longitud: 3000, elemento: 'Conducto', equipo: 'AHU-01', bloque: 'B3', funcional: true }),
  D({ sistema: 1, tipo: 2, eAlto: 305, eAncho: 457, eCaudal: 2000 * CFM_TO_M3H, fAlto: 300, fAncho: 450, longitud: 1500, elemento: 'Codo', equipo: 'AHU-01', bloque: 'B3', funcional: true, detalle: true }),
  D({ sistema: 1, tipo: 3, eDiam: 254, eCaudal: 700 * CFM_TO_M3H, fDiam: 300, longitud: 800, elemento: 'Difusor', equipo: 'AHU-01', bloque: 'B4' }),
  D({ sistema: 2, tipo: 3, eDiam: 203, eCaudal: 600 * CFM_TO_M3H, fDiam: 200, elemento: 'Terminal', bloque: 'B4', funcional: true, detalle: true, soportado: true }),
].map((r, i) => ({ ...r, id: i + 1 }));
p.grilles = [{ ...newGrille(), nr: 1, idRejilla: 'ER01', descripcion: 'Engine room air intake', caudal: 20000, area: 2.5, velReq: 3.5, alto: 1200, ancho: 1500 }, { ...newGrille(), nr: 2, idRejilla: 'ER02', descripcion: 'Galley exhaust', caudal: 8000, mfr: 'Fabricated' as const, area: 1.2, velReq: 3, alto: 800, ancho: 900 }];
const L = (o: any) => ({ ...newLoss(), ...o });
p.losses = [
  L({ n1: 1, sistema: '1', nLinea: '1', tipo: 'Rectangular', accesorio: 'Conducto', caudal: 8500, alto: 500, ancho: 750, longitud: 6000 }),
  L({ n1: 1, tipo: 'Rectangular', accesorio: 'Codo 90 radio largo', caudal: 8500, alto: 500, ancho: 750 }),
  L({ n1: 1, tipo: 'Rectangular', accesorio: 'Silenciador naval', caudal: 8500, alto: 500, ancho: 750 }),
  L({ n1: 1, n2: 1, tipo: 'Circular', accesorio: 'Conducto', caudal: 2500, diam: 350, longitud: 9000 }),
  L({ n1: 1, n2: 1, n3: 1, tipo: 'Oval', accesorio: 'Difusor techo', caudal: 700, ovAlto: 200, ovAncho: 400 }),
  L({ n1: 1, n2: 2, tipo: 'Circular', accesorio: 'Rejilla', caudal: 1800, diam: 300, longitud: 2000 }),
];
writeFileSync('/tmp/seed.json', JSON.stringify(p));
console.log('ok');
