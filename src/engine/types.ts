export type Shape = 'Circular' | 'Rectangular' | 'Oval';
export type DuctTypeId = 1 | 2 | 3 | 4;
export type Mfr = 'Munters' | 'Fabricated';

export const SHIP_TYPES = ['Fragata', 'Buque aprovisionamiento', 'Corbeta', 'BAM', 'Patrullera', 'Submarino', 'Portaaeronaves', 'Buque de intervención', 'FSS', 'Alfa4000'] as const;

export interface Local { name: string; vTarget: number; vMin: number; vMax: number; nbq: boolean; overP: number } // m/s, m/s, m/s, sobrepresión Pa
export interface WeightRow { uid: string; descripcion: string; shape: 'Rectangular' | 'Circular' | 'Oval'; dims: string; longitud: number; espesor: number; peso: number; extra: number; total: number }
export const ELEMENT_TYPES = ['Codo', 'Conducto', 'Difusor', 'Plenum', 'Reducción', 'Te', 'Terminal'] as const;

export interface DesignData {
  // Proyecto
  nombre: string; codigo: string; cliente: string; ingeniero: string; fecha: string; tipoBuque: string;
  // Información general
  buque: string;
  // Condiciones de diseño
  tIntVerano: number; tExtVerano: number; tIntInvierno: number; tExtInvierno: number;
  presion: number; // Pa
  // Herencia
  buquePartida: string; buqueSimilar: string; notasHerencia: string;
  // Parámetros de dimensionado
  fricObjetivo: number;       // Pa/m
  regainFactor: number;       // recuperación estática
  regainV1: number;           // m/s velocidad inicial
  paso: number;               // mm redondeo de dimensiones
  relacionAspecto: number;    // ancho/alto
  tolVel: number;             // % tolerancia "igual"
  velTipos: Record<DuctTypeId, number>; // m/s
  locales?: Local[];          // undefined = locales por defecto
}

export interface DuctRow {
  uid: string;
  id: number;
  sistema: number | null;
  tipo: DuctTypeId;
  plenum: boolean;
  eAlto: number | null; eAncho: number | null; eDiam: number | null; // esquema, mm
  eCaudal: number | null;                                           // m³/h
  fAlto: number | null; fAncho: number | null; fDiam: number | null; // Foran, mm
  longitud: number | null;
  elemento: string;
  equipo: string; bloque: string;
  funcional: boolean; detalle: boolean; soportado: boolean;
}

export interface GrilleRow {
  uid: string;
  nr: number; sws: number; idRejilla: string; descripcion: string;
  caudal: number | null;   // m³/h
  mfr: Mfr; partNo: string;
  area: number | null;     // m²  (esquema)
  velReq: number | null;   // m/s (esquema)
  alto: number | null; ancho: number | null; // mm
}

export interface LossRow {
  uid: string;
  n1: number; n2: number | null; n3: number | null;
  sistema: string; nLinea: string;
  tipo: Shape;
  accesorio: string;
  caudal: number | null; // m³/h
  alto: number | null; ancho: number | null;
  ovAlto: number | null; ovAncho: number | null;
  diam: number | null;
  longitud: number | null; // mm
  material: string;
  local?: string;
}

export interface Accessory { name: string; k: number }
export interface Material { name: string; roughness: number; c: number }

export interface Project {
  id: string;
  design: DesignData;
  ducts: DuctRow[];
  grilles: GrilleRow[];
  losses: LossRow[];
  accessories: Accessory[];
  materials: Material[];
  ovalSizes?: { minor: number; major: number }[]; // undefined = tabla provisional
  circSizes?: number[];
  weights?: WeightRow[];
  updatedAt: number;
}
