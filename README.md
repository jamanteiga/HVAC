# ShipHVAC
SPA React + TypeScript + Vite · Fluent UI (estilo Windows 11) · AG Grid · Firebase (Auth + Firestore).

## Uso
- `npm install` · `npm run dev` · `npm run build` (salida en `dist/`, válido para GitHub Pages) · `npm test`
- Firebase: copia `.env.example` a `.env`, rellena las claves, publica `firestore.rules`. Sin `.env` la app guarda en el navegador (modo local).

## Unidades
Interfaz en mm, m/s, m³/h, Pa. La importación convierte pulgadas→mm, CFM→m³/h, fpm→m/s, ft²→m².

## Decisiones de cálculo
- Fricción: Colebrook-White iterativo (laminar 64/Re). ρ y ν se calculan con la T interior de verano (Módulo 1).
- Diámetro hidráulico oval corregido (4A/P, elipse con perímetro de Ramanujan); el de la hoja original daba la mitad.
- Pérdidas: una fila por accesorio, agrupadas por ID TRAMO (N1.N2.N3). ΔP total de una fila = total al final del tramo padre + acumulado del tramo hasta esa fila.
- Métodos de dimensionado: fricción igual, velocidad reducida, recuperación estática.
- Tabla de accesorios: «Junta flexible» duplicada → la segunda se llama «Junta flexible (2)».
