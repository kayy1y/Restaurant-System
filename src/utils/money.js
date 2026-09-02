/**
 * Utilidades de Precisión Financiera y Redondeo Seguro para GastroFlow OS
 * Previene errores de precisión en punto flotante (ej. 8999.999999999) y estandariza montos en Colones.
 */

export function roundMoney(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateTaxesAndTotals(subtotal, isTakeout = false) {
  const cleanSubtotal = roundMoney(subtotal);
  const taxIva = roundMoney(cleanSubtotal * 0.13);
  const taxService = isTakeout ? 0 : roundMoney(cleanSubtotal * 0.10);
  const total = roundMoney(cleanSubtotal + taxIva + taxService);

  return {
    subtotal: cleanSubtotal,
    taxIva,
    taxService,
    total
  };
}

export function formatColones(amount) {
  return `₡${roundMoney(amount).toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
