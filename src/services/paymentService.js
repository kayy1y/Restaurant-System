/**
 * Servicio de Pagos Transaccional y Decoplado - GastroFlow OS
 * Preparado para integrar pasarelas de pago reales (SINPE, POS Físico, Pasarelas Web).
 * Maneja Idempotencia, Validación de Efectivo, Referencias de Tarjeta y Emisión Fiscal Automática.
 */

import { dbGet, dbPut, dbGetAll } from './db.js';
import { emitFiscalDocumentV43 } from './fiscalService.js';
import { liveSync } from './liveSync.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// Bloqueo de Idempotencia en Memoria para Evitar Cobros Duplicados por Doble Clic
const inFlightPayments = new Set();

/**
 * Procesar Pago Transaccional de Pedido
 */
export async function processOrderPayment({
  orderId,
  paymentMethod = 'Efectivo', // 'Efectivo', 'Tarjeta', 'SINPE', 'Otro'
  amountPaid = 0,             // Monto entregado por el cliente
  referenceNumber = '',       // Comprobante SINPE / Voucher Tarjeta
  cardType = '',              // 'Visa', 'Mastercard' (Sin datos sensibles)
  customerName = 'Consumidor Final',
  customerId = '000000000',
  customerEmail = 'cliente@lavidsteakhouse.cr',
  cashierName = 'Ana Cajera',
  notes = ''
}) {
  if (!orderId) {
    throw new Error('ID de pedido no especificado.');
  }

  // 1. Protección contra Doble Clic / Idempotencia
  if (inFlightPayments.has(orderId)) {
    throw new Error('El pago de esta cuenta ya está siendo procesado. Espere un momento.');
  }

  inFlightPayments.add(orderId);

  try {
    const order = await dbGet('orders', orderId);
    if (!order) {
      throw new Error(`No se encontró el pedido ${orderId}.`);
    }

    if (order.payment_status === 'CONFIRMADO' || order.status === 'PAGADO') {
      throw new Error(`El pedido ${orderId} ya fue pagado previamente.`);
    }

    // Filtrar únicamente los productos activos que no fueron retirados de la cuenta
    const activeItems = (order.items || []).filter(item => item.status !== 'RETIRADO_DE_CUENTA' && item.status !== 'CANCELADO');
    if (activeItems.length === 0) {
      throw new Error('No se puede cobrar un pedido sin productos activos.');
    }

    // 2. Recálculo Transaccional de Importes de Venta
    const subtotal = activeItems.reduce((sum, item) => sum + (item.item_total || (item.unit_price * item.quantity)), 0);
    const taxIva = Math.round(subtotal * 0.13);
    const taxService = order.type === 'llevar' ? 0 : Math.round(subtotal * 0.10);
    const totalToPay = subtotal + taxIva + taxService;

    // 3. Validación de Métodos de Pago
    let calculatedChange = 0;
    let finalAmountPaid = amountPaid;

    if (paymentMethod === 'Efectivo') {
      if (amountPaid < totalToPay) {
        throw new Error(`El monto recibido (₡${amountPaid.toLocaleString()}) es menor al total a pagar (₡${totalToPay.toLocaleString()}).`);
      }
      calculatedChange = amountPaid - totalToPay;
    } else {
      finalAmountPaid = totalToPay; // Tarjeta / SINPE cubren el total exacto
      calculatedChange = 0;
    }

    const now = new Date().toISOString();
    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 4. Registrar Registro de Pago
    const paymentRecord = {
      id: paymentId,
      order_id: orderId,
      table_id: order.table_id,
      table_name: order.table_name,
      payment_method: paymentMethod,
      amount_paid: finalAmountPaid,
      total_amount: totalToPay,
      change_given: calculatedChange,
      reference_number: referenceNumber.trim(),
      card_type: cardType,
      customer_name: customerName,
      customer_id: customerId,
      customer_email: customerEmail,
      cashier_name: cashierName,
      notes: notes,
      status: 'APROBADO',
      created_at: now
    };

    await dbPut('payments', paymentRecord);

    // 5. Copia Histórica Inmutable de Productos para la Factura (Snapshot)
    const itemsSnapshot = activeItems.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      item_total: item.item_total || (item.unit_price * item.quantity),
      customizations: item.customizations || [],
      notes: item.notes || ''
    }));

    // 6. Actualizar Estado de Pedido y Liberar Mesa
    const updatedOrder = {
      ...order,
      items: order.items, // Conserva historial con ítems retirados marcados
      items_snapshot: itemsSnapshot, // Snapshot limpio para la factura
      subtotal: subtotal,
      tax_iva: taxIva,
      tax_service: taxService,
      total: totalToPay,
      status: 'PAGADO',
      account_status: 'PAGADA',
      payment_status: 'CONFIRMADO',
      paid_at: now,
      cashier_name: cashierName,
      payment_method: paymentMethod,
      payment_id: paymentId,
      amount_paid: finalAmountPaid,
      change_given: calculatedChange
    };

    await dbPut('orders', updatedOrder);

    // 7. Emitir Factura Automáticamente
    const fiscalDoc = await emitFiscalDocumentV43({
      orderId: orderId,
      customerName: customerName,
      customerId: customerId,
      customerEmail: customerEmail,
      paymentMethod: paymentMethod,
      isOffline: false
    });

    // Guardar Snapshot Histórico en el registro de la factura fiscal
    const updatedFiscalDoc = {
      ...fiscalDoc,
      table_name: order.table_name,
      waiter_name: order.waiter_name,
      cashier_name: cashierName,
      items_snapshot: itemsSnapshot,
      amount_paid: finalAmountPaid,
      change_given: calculatedChange,
      reference_number: referenceNumber,
      payment_id: paymentId
    };

    await dbPut('fiscal_queue', updatedFiscalDoc);

    // Sync con Supabase si está activo
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
          subtotal: subtotal,
          impuesto_iva: taxIva,
          impuesto_servicio: taxService,
          total: totalToPay,
          pagado_en: now
        });
      } catch (supErr) {
        console.error('Supabase sync warning:', supErr.message);
      }
    }

    // Notificaciones en tiempo real
    liveSync.emit('TABLE_RELEASED', {
      tableId: order.table_id,
      tableName: order.table_name,
      orderId: orderId,
      releasedAt: now
    });

    liveSync.emit('PAYMENT_COMPLETED', {
      order: updatedOrder,
      payment: paymentRecord,
      invoice: updatedFiscalDoc
    });

    return {
      success: true,
      order: updatedOrder,
      payment: paymentRecord,
      invoice: updatedFiscalDoc,
      change: calculatedChange
    };
  } finally {
    inFlightPayments.delete(orderId);
  }
}
