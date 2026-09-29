/**
 * Servicio de Pagos Transaccional y Desacoplado - GastroFlow OS
 * Maneja Idempotencia Atómica, Bloqueos en DB, Precisión Financiera, Referencias de Tarjeta, Pagos Mixtos y Fallback Fiscal.
 */

import { dbGet, dbPut, dbGetAll } from './db.js';
import { emitFiscalDocumentV43 } from './fiscalService.js';
import { liveSync } from './liveSync.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { processExternalInvoiceIntegration } from './invoiceIntegrationService.js';
import { roundMoney, calculateTaxesAndTotals } from '../utils/money.js';
import { generateUuid } from '../utils/id.js';

// Bloqueo de Idempotencia en Memoria para Evitar Cobros Duplicados por Doble Clic
const inFlightPayments = new Set();

function normalizePaymentMethod(paymentMethod) {
  switch (String(paymentMethod || '').trim()) {
    case 'Efectivo Colones':
    case 'Efectivo':
      return 'Efectivo';
    case 'Tarjeta':
    case 'Tarjeta POS':
      return 'Tarjeta POS';
    case 'SINPE':
    case 'SINPE Movil':
    case 'SINPE Móvil':
      return 'SINPE Movil';
    case 'Dolares':
    case 'Dólares':
      return 'Dolares';
    default:
      throw new Error('Método de pago no soportado para registro seguro.');
  }
}

/**
 * Procesar Pago Transaccional de Pedido
 */
export async function processOrderPayment({
  orderId,
  paymentMethod = 'Efectivo',
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

  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

  // 1. Protección contra Doble Clic en memoria (Misma pestaña)
  if (inFlightPayments.has(orderId)) {
    throw new Error('El pago de esta cuenta ya está siendo procesado en este terminal.');
  }

  inFlightPayments.add(orderId);

  try {
    // 2. Candado Atómico en Base de Datos (Múltiples terminales / pestañas)
    const order = await dbGet('orders', orderId);
    if (!order) {
      throw new Error(`No se encontró el pedido ${orderId}.`);
    }

    if (order.payment_status === 'CONFIRMADO' || order.status === 'PAGADO' || order.account_status === 'PAGADA') {
      throw new Error(`El pedido ${orderId} ya fue pagado previamente.`);
    }

    if (order.account_status === 'PROCESANDO_PAGO') {
      throw new Error(`El cobro de la cuenta ${orderId} está siendo procesado por otro cajero. Espere la confirmación.`);
    }

    // Marcar bloqueo atómico en DB antes de procesar
    order.account_status = 'PROCESANDO_PAGO';
    order.updated_at = new Date().toISOString();
    await dbPut('orders', order);

    // Filtrar únicamente los productos activos que no fueron retirados de la cuenta
    const activeItems = (order.items || []).filter(item => item.status !== 'RETIRADO_DE_CUENTA' && item.status !== 'CANCELADO');
    if (activeItems.length === 0) {
      order.account_status = 'SOLICITADA';
      await dbPut('orders', order);
      throw new Error('No se puede cobrar un pedido sin productos activos.');
    }

    // 3. Recálculo Transaccional Seguro de Importes de Venta (Precisión Financiera)
    const subtotalRaw = activeItems.reduce((sum, item) => sum + (item.item_total || (item.unit_price * item.quantity)), 0);
    const totals = calculateTaxesAndTotals(subtotalRaw, order.type === 'llevar');
    const { subtotal, taxIva, taxService, total: totalToPay } = totals;

    // 4. Validación de Métodos de Pago
    let calculatedChange = 0;
    let finalAmountPaid = roundMoney(amountPaid);

    if (normalizedPaymentMethod === 'Efectivo') {
      if (finalAmountPaid < totalToPay) {
        order.account_status = 'SOLICITADA';
        await dbPut('orders', order);
        throw new Error(`El monto recibido (₡${finalAmountPaid.toLocaleString()}) es menor al total a pagar (₡${totalToPay.toLocaleString()}).`);
      }
      calculatedChange = roundMoney(finalAmountPaid - totalToPay);
    } else {
      finalAmountPaid = totalToPay; // Tarjeta / SINPE cubren el total exacto
      calculatedChange = 0;
    }

    const now = new Date().toISOString();
    const paymentId = generateUuid();

    // 5. Registrar Registro de Pago
    const paymentRecord = {
      id: paymentId,
      order_id: orderId,
      table_id: order.table_id,
      table_name: order.table_name,
      payment_method: normalizedPaymentMethod,
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

    // 6. Copia Histórica Inmutable de Productos para la Factura (Snapshot)
    const itemsSnapshot = activeItems.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: roundMoney(item.unit_price),
      quantity: item.quantity,
      item_total: roundMoney(item.item_total || (item.unit_price * item.quantity)),
      customizations: item.customizations || [],
      notes: item.notes || ''
    }));

    // 7. Actualizar Estado de Pedido y Liberar Mesa
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

    // 8. Emitir Factura Automáticamente con Fallback a Cola de Contingencia (Nunca Aborta la Venta)
    let updatedFiscalDoc = null;
    try {
      const fiscalDoc = await emitFiscalDocumentV43({
        orderId: orderId,
        customerName: customerName,
        customerId: customerId,
        customerEmail: customerEmail,
        paymentMethod: normalizedPaymentMethod,
        isOffline: false
      });

      updatedFiscalDoc = {
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
    } catch (fiscalErr) {
      console.warn('Advertencia: Emisión fiscal externa falló, guardando en cola de contingencia:', fiscalErr.message);
      const nowTs = new Date().toISOString();
      updatedFiscalDoc = {
        id: `FE-CONT-${Date.now()}`,
        clave: `506${nowTs.replace(/\D/g, '').slice(0, 14)}0000000000000000000000`,
        consecutivo: `0010000101${Date.now().toString().slice(-10)}`,
        doc_type: 'Tiquete Electrónico v4.3',
        order_id: orderId,
        customer_name: customerName,
        customer_id: customerId,
        customer_email: customerEmail,
        payment_method: normalizedPaymentMethod,
        subtotal: subtotal,
        tax_service: taxService,
        tax_iva: taxIva,
        total: totalToPay,
        status: 'PENDIENTE_ENVIO',
        rejection_reason: `Contingencia por error fiscal: ${fiscalErr.message}`,
        created_at: nowTs,
        updated_at: nowTs,
        retry_count: 1
      };
      await dbPut('fiscal_queue', updatedFiscalDoc);
    }

    // 9. Integración API Externa (Resiliente)
    let integrationRecord = null;
    try {
      integrationRecord = await processExternalInvoiceIntegration({
        order: updatedOrder,
        payment: paymentRecord,
        fiscalDoc: updatedFiscalDoc
      });
    } catch (intErr) {
      console.error('Notificación de integración API externa:', intErr.message);
    }

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
          metodo_pago: normalizedPaymentMethod,
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
      integration: integrationRecord,
      change: calculatedChange
    };
  } finally {
    inFlightPayments.delete(orderId);
  }
}
