import { DesignData, DuctTypeId } from './types';
import { FPM_TO_MS } from './units';
export * from './defaultsData';

export const DUCT_TYPE_TABLE: { id: DuctTypeId; label: string; fpm: number }[] = [
  { id: 1, label: 'Main trunk down the outside of modules', fpm: 3000 },
  { id: 2, label: 'Main supply inside spaces', fpm: 2500 },
  { id: 3, label: 'Branch ducting to diffusers', fpm: 2000 },
  { id: 4, label: 'Diffuser discharge opening', fpm: 1500 },
];

export const defaultDesign = (): DesignData => ({
  nombre: '', codigo: '', cliente: '', ingeniero: '', fecha: new Date().toISOString().slice(0, 10), tipoBuque: 'Buque militar',
  buque: '',
  tIntVerano: 24, tExtVerano: 35, tIntInvierno: 20, tExtInvierno: 5,
  presion: 101325,
  buquePartida: '', buqueSimilar: '', notasHerencia: '',
  fricObjetivo: 1.0, regainFactor: 0.75, regainV1: 15.24, paso: 10, relacionAspecto: 2, tolVel: 1,
  velTipos: Object.fromEntries(DUCT_TYPE_TABLE.map(t => [t.id, +(t.fpm * FPM_TO_MS).toFixed(3)])) as DesignData['velTipos'],
});

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
