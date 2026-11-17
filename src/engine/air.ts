// Propiedades del aire a partir de la temperatura de diseño.
export interface AirProps { rho: number; nu: number; mu: number }
export function airProps(tC: number, pPa = 101325): AirProps {
  const T = tC + 273.15;
  const rho = pPa / (287.05 * T);
  const mu = (1.458e-6 * Math.pow(T, 1.5)) / (T + 110.4); // Sutherland
  return { rho, mu, nu: mu / rho };
}
