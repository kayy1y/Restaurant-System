// Colores y nombres compartidos entre mesas, cocina y reportes.
export function processState(value = '') {
  const state = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replaceAll(' ', '_');
  if (/CANCEL|RETIR|RECHAZ|AGOTAD/.test(state)) return { tone: 'danger', label: 'Cancelado / retirado' };
  if (/COBRO|CUENTA/.test(state)) return { tone: 'billing', label: 'En cobro' };
  if (/RESERV/.test(state)) return { tone: 'reserved', label: 'Reservada' };
  if (/DISPONIBLE/.test(state)) return { tone: 'ready', label: 'Disponible' };
  if (/LISTO/.test(state)) return { tone: 'ready', label: 'Listo para entregar' };
  if (/PAGADO|ENTREGADO|SERVIDO|COMPLET/.test(state)) return { tone: 'ready', label: 'Completado' };
  if (/PREPAR|PROCESO/.test(state)) return { tone: 'progress', label: 'En preparación' };
  if (/OCUP/.test(state)) return { tone: 'occupied', label: 'Ocupada' };
  return { tone: 'new', label: 'Pedido recibido' };
}
