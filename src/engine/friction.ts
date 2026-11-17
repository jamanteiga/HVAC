/** Factor de fricción de Darcy. Colebrook-White iterativo (laminar: 64/Re). */
export function colebrook(re: number, eps_m: number, dh_m: number): number {
  if (!(re > 0) || !(dh_m > 0)) return NaN;
  if (re < 2300) return 64 / re;
  const rr = eps_m / (3.7 * dh_m);
  // semilla Swamee-Jain
  let x = 1 / Math.sqrt(0.25 / Math.pow(Math.log10(rr + 5.74 / Math.pow(re, 0.9)), 2));
  for (let i = 0; i < 60; i++) {
    const xn = -2 * Math.log10(rr + (2.51 * x) / re);
    if (Math.abs(xn - x) < 1e-12) { x = xn; break; }
    x = xn;
  }
  return 1 / (x * x);
}
/** Swamee-Jain explícita (para contraste / semilla). */
export function swameeJain(re: number, eps_m: number, dh_m: number): number {
  return 0.25 / Math.pow(Math.log10(eps_m / (3.7 * dh_m) + 5.74 / Math.pow(re, 0.9)), 2);
}
