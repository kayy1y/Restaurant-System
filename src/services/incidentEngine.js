/**
 * Motor de Incidencias & Reglas de Negocio GastroFlow OS
 * Procesa cancelaciones, reclamos, devoluciones, corrección de cuentas y efectos en DB.
 */

import { dbGetAll, dbGet, dbPut } from './db.js';
import { recordStockMovement } from './inventoryService.js';
import { getProductRecipe } from './menuService.js';
import { liveSync } from './liveSync.js';

export const INCIDENT_CATEGORIES = [
  { id: 'PRODUCTO_FALTANTE', label: 'Faltó un producto del pedido', requiresAuth: false, stockEffect: 'REMOVER_O_REESTABLECER' },
  { id: 'PRODUCTO_INCORRECTO', label: 'Producto entregado incorrecto', requiresAuth: true, stockEffect: 'MERMA_O_REEMPLAZO' },
  { id: 'PRODUCTO_NO_PREPARADO', label: 'Producto no fue preparado por cocina', requiresAuth: true, stockEffect: 'REPOSICION' },
  { id: 'CLIENTE_RECHAZO', label: 'Cliente rechazó el plato o sabor', requiresAuth: true, stockEffect: 'DESPERDICIO' },
  { id: 'ERROR_SALONERO', label: 'Error de comanda del salonero', requiresAuth: true, stockEffect: 'MERMA' },
  { id: 'ERROR_COCINA', label: 'Error de preparación en cocina', requiresAuth: false, stockEffect: 'MERMA' },
  { id: 'DEVOLUCION_PAGO', label: 'Devolución de dinero al cliente', requiresAuth: true, stockEffect: 'NOTA_CREDITO_V43' },
  { id: 'COBRO_INCORRECTO', label: 'Cobro o monto incorrecto en cuenta', requiresAuth: border => true, stockEffect: 'AJUSTE_CUENTA' },
  { id: 'FACTURA_DATOS_INCORRECTOS', label: 'Factura con datos de cliente incorrectos', requiresAuth: true, stockEffect: 'REENVIO_O_NOTA' },
  { id: 'CORTESIA_AUTORIZADA', label: 'Platillo de cortesía autorizada', requiresAuth: true, stockEffect: 'DESPERDICIO_CORTESIA' },
  { id: 'OTRO', label: 'Otra incidencia (requiere justificación)', requiresAuth: true, stockEffect: 'AUDITORIA' }
];

/**
 * Reportar y Procesar Incidencia en DB con Reglas de Consecuencias
 */
export async function processIncident({
  orderId,
  productId,
  category,
  actionRequested = 'REEMPLAZAR',
  notes = '',
  userName = 'Empleado',
  managerPin = ''
}, currentRole) {
  const catConfig = INCIDENT_CATEGORIES.find(c => c.id === category) || INCIDENT_CATEGORIES[INCIDENT_CATEGORIES.length - 1];

  // Requiere autorización si la categoría lo exige y el rol no es Admin/Gerente
  if (catConfig.requiresAuth && currentRole.id !== 'ADMINISTRADOR' && currentRole.id !== 'gerente') {
    if (!managerPin || managerPin !== '9999') {
      throw new Error(`La incidencia '${catConfig.label}' requiere código PIN de autorización de Gerente o Administrador.`);
    }
  }

  const now = new Date().toISOString();
  const incidentId = `inc-${Date.now()}`;

  const incidentRecord = {
    id: incidentId,
    order_id: orderId,
    product_id: productId,
    category: category,
    category_label: catConfig.label,
    action_requested: actionRequested,
    notes: notes.trim(),
    user_name: userName,
    status: 'RESUELTO',
    created_at: now
  };

  await dbPut('incidents', incidentRecord);

  // Aplicar consecuencias transaccionales según el momento operativo
  const order = await dbGet('orders', orderId);
  if (order) {
    // 1. Si la orden está en cocina/preparación y se cancela o reemplaza
    if (category === 'PRODUCTO_NO_PREPARADO') {
      // Reponer inventario de la receta
      const recipeData = await getProductRecipe(productId);
      if (recipeData.hasRecipe) {
        for (const ing of recipeData.ingredients) {
          await recordStockMovement({
            itemId: ing.inventory_item_id,
            movementType: 'DEVOLUCION',
            qtyChanged: ing.quantity,
            reason: `Reposición por incidencia: ${catConfig.label}`,
            userName: userName
          });
        }
      }
    } else if (category === 'CLIENTE_RECHAZO' || category === 'ERROR_COCINA') {
      // Registrar merma desperdicio de cocina (No se repone stock)
      await dbPut('audit_logs', {
        id: `log-${Date.now()}`,
        timestamp: now,
        user_name: userName,
        role_id: currentRole.id,
        action: 'INCIDENCIA_DESPERDICIO',
        details: `Incidencia registrada en Pedido ${orderId}: ${catConfig.label}. Motivo: ${notes}`
      });
    }

    // Actualizar estado de orden si se requiere atención
    await dbPut('orders', {
      ...order,
      has_incident: true,
      incident_notes: notes
    });
  }

  // Notificar a las terminales en tiempo real
  liveSync.emit('INCIDENT_REPORTED', incidentRecord);

  return incidentRecord;
}

/**
 * Consultar Histórico de Incidencias en DB
 */
export async function getIncidentsHistory() {
  const incidents = await dbGetAll('incidents');
  return incidents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
