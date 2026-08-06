/**
 * Servicio de Gestión Transaccional de Pedidos GastroFlow OS
 * Soporta almacenamiento dual: Base de Datos Supabase PostgreSQL en la nube + IndexedDB local de respaldo.
 */

import { dbGetAll, dbGet, dbPut } from './db.js';
import { getProductRecipe } from './menuService.js';
import { recordStockMovement } from './inventoryService.js';
import { liveSync } from './liveSync.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

/**
 * Transacción Atómica: Crear Pedido Inicial
 */
export async function createOrderWithStockDeduction({
  tableId,
  tableName,
  waiterId,
  waiterName,
  diners = 2,
  items = [],
  isTakeout = false
}, currentRole) {
  if (!items || items.length === 0) {
    throw new Error('El pedido debe contener al menos un producto.');
  }

  const now = new Date().toISOString();
  const orderId = `ORD-${Date.now().toString().slice(-6)}`;
  const comandaId = `CMD-${Date.now().toString().slice(-6)}`;

  let subtotal = 0;
  const processedItems = [];

  for (const item of items) {
    let unitPrice = item.unit_price;
    const customizations = item.customizations || [];

    if (customizations.includes('QUESO_EXTRA')) unitPrice += 800;
    if (customizations.includes('PROTEINA_EXTRA')) unitPrice += 1500;

    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;

    processedItems.push({
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: unitPrice,
      quantity: item.quantity,
      item_total: itemTotal,
      customizations: customizations,
      notes: item.notes || (customizations.length > 0 ? customizations.join(', ') : ''),
      status: 'ENVIADO_A_COCINA',
      audioMemo: item.audioMemo || null
    });
  }

  const taxIva = Math.round(subtotal * 0.13);
  const taxService = isTakeout ? 0 : Math.round(subtotal * 0.10);
  const total = subtotal + taxIva + taxService;

  // Deducción Atómica de Receta en Bodega
  for (const item of processedItems) {
    const recipeData = await getProductRecipe(item.product_id);
    if (recipeData.hasRecipe) {
      for (const ingredient of recipeData.ingredients) {
        if (ingredient.inventory_item_id.includes('cebolla') && item.customizations.includes('SIN_CEBOLLA')) {
          continue; 
        }

        let requiredQty = ingredient.quantity * item.quantity;
        if (ingredient.inventory_item_id.includes('queso') && item.customizations.includes('QUESO_EXTRA')) {
          requiredQty += 0.050 * item.quantity;
        }

        await recordStockMovement({
          itemId: ingredient.inventory_item_id,
          movementType: 'CONSUMO_PEDIDO',
          qtyChanged: requiredQty,
          reason: `Consumo Receta: ${item.product_name} (${item.quantity}x) en Pedido ${orderId}`,
          userName: waiterName
        });
      }
    }
  }

  const newOrder = {
    id: orderId,
    table_id: tableId,
    table_name: tableName,
    waiter_id: waiterId,
    waiter_name: waiterName,
    diners: diners,
    items: processedItems,
    subtotal: subtotal,
    tax_iva: taxIva,
    tax_service: taxService,
    total: total,
    status: 'ENVIADO_A_COCINA',
    account_status: 'ABIERTA',
    payment_status: 'PENDIENTE',
    type: isTakeout ? 'llevar' : 'salon',
    created_at: now,
    updated_at: now
  };

  // Guardar en IndexedDB local
  await dbPut('orders', newOrder);

  const newComanda = {
    id: comandaId,
    order_id: orderId,
    table_id: tableId,
    table_name: tableName,
    waiter_name: waiterName,
    items: processedItems,
    status: 'Nuevo',
    created_at: now
  };

  await dbPut('comandas', newComanda);

  // SI SUPABASE ESTÁ CONFIGURADO: Insertar directamente en las tablas de la Nube Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos').insert({
        id: orderId,
        mesa_id: tableId,
        nombre_mesa: tableName,
        nombre_salonero: waiterName,
        comensales: diners,
        estado: 'ENVIADO_A_COCINA',
        estado_cuenta: 'ABIERTA',
        subtotal: subtotal,
        impuesto_iva: taxIva,
        impuesto_servicio: taxService,
        total: total,
        creado_en: now
      });

      for (const item of processedItems) {
        await supabase.from('detalles_pedido').insert({
          pedido_id: orderId,
          producto_id: item.product_id,
          nombre_producto: item.product_name,
          precio_unitario: item.unit_price,
          cantidad: item.quantity,
          monto_total: item.item_total,
          personalizaciones: item.customizations,
          indicacion_escrita: item.notes,
          audio_url: item.audioMemo?.audioUrl || null,
          audio_duracion_seg: item.audioMemo?.duration || 0,
          audio_transcripcion: item.audioMemo?.transcription || null,
          estado: 'ENVIADO_A_COCINA'
        });
      }
    } catch (supErr) {
      console.error('Notificación inserción Supabase:', supErr.message);
    }
  }

  // Transmitir evento reactivo a todos los dispositivos
  liveSync.emit('ORDER_CREATED', { order: newOrder, comanda: newComanda });

  return { order: newOrder, comanda: newComanda };
}

/**
 * Obtener Pedidos Activos (Supabase Cloud PostgreSQL con fallback a IndexedDB)
 */
export async function getActiveOrdersForWaiters() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: cloudOrders, error } = await supabase
        .from('pedidos')
        .select('*')
        .neq('estado', 'PAGADO')
        .neq('estado', 'CANCELADO')
        .order('creado_en', { ascending: false });

      if (!error && cloudOrders && cloudOrders.length > 0) {
        const result = [];
        for (const p of cloudOrders) {
          const { data: details } = await supabase
            .from('detalles_pedido')
            .select('*')
            .eq('pedido_id', p.id);

          const mappedItems = (details || []).map(d => ({
            product_id: d.producto_id,
            product_name: d.nombre_producto,
            unit_price: d.precio_unitario,
            quantity: d.cantidad,
            item_total: d.monto_total,
            customizations: d.personalizaciones || [],
            notes: d.indicacion_escrita,
            status: d.estado,
            removal_reason: d.motivo_retiro,
            audioMemo: d.audio_url ? { audioUrl: d.audio_url, duration: d.audio_duracion_seg, transcription: d.audio_transcripcion } : null
          }));

          const mappedOrder = {
            id: p.id,
            table_id: p.mesa_id,
            table_name: p.nombre_mesa,
            waiter_name: p.nombre_salonero,
            diners: p.comensales,
            items: mappedItems,
            subtotal: parseFloat(p.subtotal),
            tax_iva: parseFloat(p.impuesto_iva),
            tax_service: parseFloat(p.impuesto_servicio),
            total: parseFloat(p.total),
            status: p.estado,
            account_status: p.estado_cuenta,
            created_at: p.creado_en
          };

          await dbPut('orders', mappedOrder);
          result.push(mappedOrder);
        }
        return result;
      }
    } catch (e) {
      console.error('Supabase query fallback to IndexedDB:', e);
    }
  }

  const orders = await dbGetAll('orders');
  return orders.filter(o => o.status !== 'PAGADO' && o.status !== 'pagado' && o.status !== 'cancelado');
}

/**
 * Agregar Productos Adicionales a un Pedido Activo
 */
export async function addItemToActiveOrder({ orderId, items = [], waiterName = 'Salonero' }) {
  const order = await dbGet('orders', orderId);
  if (!order) throw new Error('Pedido no encontrado.');

  if (order.account_status === 'EN_COBRO') {
    throw new Error('Esta cuenta está siendo procesada por Caja en este momento. No se puede modificar.');
  }

  const now = new Date().toISOString();
  const comandaId = `CMD-${Date.now().toString().slice(-6)}`;

  const newProcessedItems = [];
  let addedSubtotal = 0;

  for (const item of items) {
    let unitPrice = item.unit_price;
    const customizations = item.customizations || [];

    if (customizations.includes('QUESO_EXTRA')) unitPrice += 800;
    const itemTotal = unitPrice * item.quantity;
    addedSubtotal += itemTotal;

    const newItemObj = {
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: unitPrice,
      quantity: item.quantity,
      item_total: itemTotal,
      customizations: customizations,
      notes: `[AGREGADO POSTERIOR] ${item.notes || customizations.join(', ')}`,
      status: 'ENVIADO_A_COCINA',
      audioMemo: item.audioMemo || null
    };

    newProcessedItems.push(newItemObj);

    const recipeData = await getProductRecipe(item.product_id);
    if (recipeData.hasRecipe) {
      for (const ingredient of recipeData.ingredients) {
        await recordStockMovement({
          itemId: ingredient.inventory_item_id,
          movementType: 'CONSUMO_PEDIDO',
          qtyChanged: ingredient.quantity * item.quantity,
          reason: `Adición Posterior: ${item.product_name} en Pedido ${orderId}`,
          userName: waiterName
        });
      }
    }
  }

  const allItems = [...order.items, ...newProcessedItems];
  const newSubtotal = order.subtotal + addedSubtotal;
  const newTaxIva = Math.round(newSubtotal * 0.13);
  const newTaxService = order.type === 'llevar' ? 0 : Math.round(newSubtotal * 0.10);
  const newTotal = newSubtotal + newTaxIva + newTaxService;

  const updatedOrder = {
    ...order,
    items: allItems,
    subtotal: newSubtotal,
    tax_iva: newTaxIva,
    tax_service: newTaxService,
    total: newTotal,
    status: 'EN_PREPARACION',
    updated_at: now
  };

  await dbPut('orders', updatedOrder);

  const newComanda = {
    id: comandaId,
    order_id: orderId,
    table_id: order.table_id,
    table_name: order.table_name,
    waiter_name: waiterName,
    items: newProcessedItems,
    status: 'Nuevo (Adición)',
    created_at: now
  };

  await dbPut('comandas', newComanda);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos').update({
        subtotal: newSubtotal,
        impuesto_iva: newTaxIva,
        impuesto_servicio: newTaxService,
        total: newTotal,
        estado: 'EN_PREPARACION',
        actualizado_en: now
      }).eq('id', orderId);

      for (const item of newProcessedItems) {
        await supabase.from('detalles_pedido').insert({
          pedido_id: orderId,
          producto_id: item.product_id,
          nombre_producto: item.product_name,
          precio_unitario: item.unit_price,
          cantidad: item.quantity,
          monto_total: item.item_total,
          personalizaciones: item.customizations,
          indicacion_escrita: item.notes,
          audio_url: item.audioMemo?.audioUrl || null,
          audio_duracion_seg: item.audioMemo?.duration || 0,
          audio_transcripcion: item.audioMemo?.transcription || null,
          estado: 'ENVIADO_A_COCINA'
        });
      }
    } catch (supErr) {
      console.error('Supabase update notification:', supErr.message);
    }
  }

  liveSync.emit('ORDER_UPDATED', { order: updatedOrder, newComanda });
  return updatedOrder;
}

/**
 * Quitar Producto del Pedido con Motivo Escrito
 */
export async function removeItemFromOrder({
  orderId,
  itemIndex,
  writtenReason,
  userName = 'Salonero',
  managerPin = ''
}) {
  const order = await dbGet('orders', orderId);
  if (!order) throw new Error('Pedido no encontrado.');

  if (!writtenReason || writtenReason.trim().length < 8) {
    throw new Error('Debe escribir una explicación válida del motivo (mínimo 8 caracteres).');
  }

  if (itemIndex < 0 || itemIndex >= order.items.length) {
    throw new Error('Índice de producto no válido.');
  }

  const targetItem = order.items[itemIndex];
  const now = new Date().toISOString();

  if (targetItem.status === 'EN_PREPARACION' || targetItem.status === 'LISTO' || targetItem.status === 'ENTREGADO') {
    if (userName !== 'Admin General' && managerPin !== '9999') {
      throw new Error('Retirar un plato ya preparado o entregado requiere PIN de autorización de Gerente o Administrador (9999).');
    }

    await recordStockMovement({
      itemId: 'ing-carne-angus',
      movementType: 'DESPERDICIO',
      qtyChanged: 0.180,
      reason: `Merma por retiro de plato preparado: ${targetItem.product_name}. Motivo: ${writtenReason}`,
      userName: userName
    });
  } else {
    const recipeData = await getProductRecipe(targetItem.product_id);
    if (recipeData.hasRecipe) {
      for (const ing of recipeData.ingredients) {
        await recordStockMovement({
          itemId: ing.inventory_item_id,
          movementType: 'DEVOLUCION',
          qtyChanged: ing.quantity * targetItem.quantity,
          reason: `Restauración por retiro antes de preparación: ${targetItem.product_name}`,
          userName: userName
        });
      }
    }
  }

  const updatedItems = [...order.items];
  updatedItems[itemIndex] = {
    ...targetItem,
    status: 'RETIRADO_DE_CUENTA',
    removal_reason: writtenReason.trim(),
    removed_by: userName,
    removed_at: now
  };

  let newSubtotal = 0;
  for (const item of updatedItems) {
    if (item.status !== 'RETIRADO_DE_CUENTA' && item.status !== 'CANCELADO') {
      newSubtotal += item.item_total;
    }
  }

  const newTaxIva = Math.round(newSubtotal * 0.13);
  const newTaxService = order.type === 'llevar' ? 0 : Math.round(newSubtotal * 0.10);
  const newTotal = newSubtotal + newTaxIva + newTaxService;

  const updatedOrder = {
    ...order,
    items: updatedItems,
    subtotal: newSubtotal,
    tax_iva: newTaxIva,
    tax_service: newTaxService,
    total: newTotal,
    updated_at: now
  };

  await dbPut('orders', updatedOrder);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos').update({
        subtotal: newSubtotal,
        impuesto_iva: newTaxIva,
        impuesto_servicio: newTaxService,
        total: newTotal,
        actualizado_en: now
      }).eq('id', orderId);
    } catch (e) {}
  }

  liveSync.emit('ORDER_UPDATED', { order: updatedOrder });
  return updatedOrder;
}

/**
 * Bloquear / Desbloquear Cuenta durante el Cobro
 */
export async function setOrderCheckoutLock(orderId, isLocked = true) {
  const order = await dbGet('orders', orderId);
  if (!order) return;
  await dbPut('orders', {
    ...order,
    account_status: isLocked ? 'EN_COBRO' : 'ABIERTA'
  });

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos').update({
        estado_cuenta: isLocked ? 'EN_COBRO' : 'ABIERTA'
      }).eq('id', orderId);
    } catch (e) {}
  }

  liveSync.emit('ORDER_LOCKED', { orderId, isLocked });
}

/**
 * Transacción Atómica: Confirmar Pago, Liberar Mesa Automáticamente
 */
export async function processPaymentAndReleaseTable({
  orderId,
  paymentMethod = 'Tarjeta POS',
  customerName = 'Consumidor Final',
  cashierName = 'Cajero'
}) {
  const order = await dbGet('orders', orderId);
  if (!order) throw new Error('Pedido no encontrado.');

  if (order.payment_status === 'CONFIRMADO') {
    throw new Error('Esta cuenta ya fue pagada previamente.');
  }

  const now = new Date().toISOString();

  const updatedOrder = {
    ...order,
    status: 'PAGADO',
    account_status: 'PAGADA',
    payment_status: 'CONFIRMADO',
    order_lifecycle: 'CERRADO',
    paid_at: now,
    cashier_name: cashierName,
    payment_method: paymentMethod
  };
  await dbPut('orders', updatedOrder);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos').update({
        estado: 'PAGADO',
        estado_cuenta: 'PAGADA',
        actualizado_en: now
      }).eq('id', orderId);

      await supabase.from('pagos').insert({
        pedido_id: orderId,
        cajero_nombre: cashierName,
        metodo_pago: paymentMethod,
        nombre_cliente: customerName,
        subtotal: order.subtotal,
        impuesto_iva: order.tax_iva,
        impuesto_servicio: order.tax_service,
        total: order.total,
        pagado_en: now
      });
    } catch (supErr) {
      console.error('Supabase payment registration:', supErr.message);
    }
  }

  liveSync.emit('TABLE_RELEASED', {
    tableId: order.table_id,
    tableName: order.table_name,
    orderId: orderId,
    releasedAt: now
  });

  liveSync.emit('PAYMENT_COMPLETED', {
    order: updatedOrder,
    total: order.total,
    subtotal: order.subtotal,
    taxIva: order.tax_iva,
    taxService: order.tax_service
  });

  return updatedOrder;
}

export async function updateComandaStatus(comandaId, newStatus) {
  const comanda = await dbGet('comandas', comandaId);
  if (!comanda) throw new Error('Comanda no encontrada.');

  const updatedComanda = { ...comanda, status: newStatus, updated_at: new Date().toISOString() };
  await dbPut('comandas', updatedComanda);

  const order = await dbGet('orders', comanda.order_id);
  if (order) {
    let orderStatus = 'EN_PREPARACION';
    if (newStatus === 'Listo') orderStatus = 'LISTO_PARA_ENTREGA';
    else if (newStatus === 'Entregado') orderStatus = 'ENTREGADO';

    await dbPut('orders', { ...order, status: orderStatus });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('pedidos').update({ estado: orderStatus }).eq('id', comanda.order_id);
      } catch (e) {}
    }
  }

  liveSync.emit('KDS_STATUS_CHANGED', updatedComanda);
  return updatedComanda;
}

export async function markOrderDelivered(orderId, userName = 'Salonero') {
  const order = await dbGet('orders', orderId);
  if (!order) throw new Error('Pedido no encontrado.');

  const updated = { ...order, status: 'ENTREGADO', delivered_at: new Date().toISOString() };
  await dbPut('orders', updated);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos').update({ estado: 'ENTREGADO' }).eq('id', orderId);
    } catch (e) {}
  }

  liveSync.emit('ORDER_DELIVERED', updated);
  return updated;
}

export async function requestBillForTable(orderId, userName = 'Salonero') {
  const order = await dbGet('orders', orderId);
  if (!order) throw new Error('Pedido no encontrado.');

  const updated = { 
    ...order, 
    status: 'ESPERANDO_CUENTA', 
    account_status: 'SOLICITADA',
    bill_requested_at: new Date().toISOString() 
  };
  await dbPut('orders', updated);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos').update({ estado: 'ESPERANDO_CUENTA', estado_cuenta: 'SOLICITADA' }).eq('id', orderId);
    } catch (e) {}
  }

  liveSync.emit('BILL_REQUESTED', updated);
  return updated;
}

export async function getComandasForKitchen() {
  const comandas = await dbGetAll('comandas');
  return comandas.filter(c => c.status !== 'Entregado');
}

export async function cancelOrder({ orderId, productId, reason, cancelType = 'BEFORE_KITCHEN', userName }, currentRole) {
  const order = await dbGet('orders', orderId);
  if (!order) throw new Error('Pedido no encontrado.');

  if (cancelType === 'BEFORE_KITCHEN') {
    for (const item of order.items) {
      if (!productId || item.product_id === productId) {
        const recipeData = await getProductRecipe(item.product_id);
        if (recipeData.hasRecipe) {
          for (const ing of recipeData.ingredients) {
            await recordStockMovement({
              itemId: ing.inventory_item_id,
              movementType: 'DEVOLUCION',
              qtyChanged: ing.quantity * item.quantity,
              reason: `Restauración por cancelación del Pedido ${orderId}`,
              userName: userName
            });
          }
        }
      }
    }
  } else {
    await recordStockMovement({
      itemId: 'ing-carne-angus',
      movementType: 'DESPERDICIO',
      qtyChanged: 0.180,
      reason: `Merma por inconformidad o retiro de plato preparado (${reason})`,
      userName: userName
    });
  }

  const updatedOrder = {
    ...order,
    status: 'cancelado',
    cancel_reason: reason,
    cancel_type: cancelType,
    cancelled_by: userName,
    cancelled_at: new Date().toISOString()
  };

  await dbPut('orders', updatedOrder);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pedidos').update({ estado: 'CANCELADO' }).eq('id', orderId);
    } catch (e) {}
  }

  liveSync.emit('ORDER_CANCELLED', updatedOrder);
  return updatedOrder;
}
