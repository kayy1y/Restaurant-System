/**
 * Runner de Pruebas Automatizadas de Facturación, Pagos y Cobros - GastroFlow OS
 * Realiza verificaciones empíricas de los 8 escenarios exigidos por la especificación.
 */

import { createOrderWithStockDeduction, removeItemFromOrder } from './orderService.js';
import { processOrderPayment } from './paymentService.js';
import { getFiscalQueue, emitFiscalDocumentV43 } from './fiscalService.js';
import { dbGet, dbPut } from './db.js';

export async function runBillingFlowTests() {
  const results = [];

  const logTest = (id, name, success, details) => {
    results.push({ id, name, success, details, timestamp: new Date().toISOString() });
    console.log(`[TEST ${id}] ${name}: ${success ? '✅ PASÓ' : '❌ FALLÓ'}`, details);
  };

  try {
    // ------------------------------------------------------------------------
    // PRUEBA 1 — PAGO NORMAL & FACTURACIÓN AUTOMÁTICA
    // ------------------------------------------------------------------------
    const { order: testOrder1 } = await createOrderWithStockDeduction({
      tableId: 't-test-1',
      tableName: 'Mesa Prueba 1',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 2,
      items: [
        { product_id: 'prod-rib-eye', product_name: 'Rib Eye 350g', unit_price: 18500, quantity: 1, customizations: [] },
        { product_id: 'prod-ceviche-tico', product_name: 'Ceviche Tico', unit_price: 7500, quantity: 1, customizations: [] }
      ]
    }, { id: 'SALONERO', name: 'Laura' });

    const payResult1 = await processOrderPayment({
      orderId: testOrder1.id,
      paymentMethod: 'Tarjeta POS',
      cardType: 'Visa',
      referenceNumber: 'VOUCHER-987654',
      customerName: 'Juan Pérez',
      cashierName: 'Ana Cajera'
    });

    const isOrderPaid = payResult1.order.status === 'PAGADO' && payResult1.order.payment_status === 'CONFIRMADO';
    const isInvoiceCreated = payResult1.invoice && payResult1.invoice.consecutivo && payResult1.invoice.status === 'ACEPTADO';

    logTest('PRUEBA-1', 'Pago Normal & Facturación Automática', isOrderPaid && isInvoiceCreated, {
      orderId: testOrder1.id,
      invoiceConsecutivo: payResult1.invoice.consecutivo,
      total: payResult1.order.total,
      paymentMethod: 'Tarjeta POS'
    });

    // ------------------------------------------------------------------------
    // PRUEBA 2 — QUITAR PRODUCTO CON RECÁLCULO DINÁMICO & EXCLUSIÓN DE FACTURA
    // ------------------------------------------------------------------------
    const { order: testOrder2 } = await createOrderWithStockDeduction({
      tableId: 't-test-2',
      tableName: 'Mesa Prueba 2',
      waiterId: 'usr-carlos',
      waiterName: 'Carlos Salonero',
      diners: 3,
      items: [
        { product_id: 'prod-rib-eye', product_name: 'Rib Eye 350g', unit_price: 18500, quantity: 1 },
        { product_id: 'prod-carpaccio-res', product_name: 'Carpaccio de Res', unit_price: 9500, quantity: 1 },
        { product_id: 'prod-coca-cola', product_name: 'Coca-Cola 354ml', unit_price: 2000, quantity: 2 }
      ]
    }, { id: 'SALONERO', name: 'Carlos' });

    const totalBeforeRemove = testOrder2.total;

    // Quitar Carpaccio de Res (índice 1)
    const updatedOrder2 = await removeItemFromOrder({
      orderId: testOrder2.id,
      itemIndex: 1,
      writtenReason: 'Cliente canceló la entrada antes de preparar',
      userName: 'Ana Cajera',
      managerPin: '9999'
    });

    const totalAfterRemove = updatedOrder2.total;
    const isTotalRecalculated = totalAfterRemove < totalBeforeRemove;

    const payResult2 = await processOrderPayment({
      orderId: testOrder2.id,
      paymentMethod: 'Efectivo',
      amountPaid: 30000,
      customerName: 'Maria Rodriguez',
      cashierName: 'Ana Cajera'
    });

    const invoiceSnapshotItems = payResult2.invoice.items_snapshot || [];
    const containsRemovedItem = invoiceSnapshotItems.some(i => i.product_name === 'Carpaccio de Res');

    logTest('PRUEBA-2', 'Quitar Producto & Recálculo Dinámico', isTotalRecalculated && !containsRemovedItem, {
      totalBefore: totalBeforeRemove,
      totalAfter: totalAfterRemove,
      removedItemExcludedFromInvoice: !containsRemovedItem
    });

    // ------------------------------------------------------------------------
    // PRUEBA 3 — PAGO EN EFECTIVO & CÁLCULO DE CAMBIO (VUELTO)
    // ------------------------------------------------------------------------
    const { order: testOrder3 } = await createOrderWithStockDeduction({
      tableId: 't-test-3',
      tableName: 'Mesa Prueba 3',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 2,
      items: [
        { product_id: 'prod-pizza-margherita', product_name: 'Margherita Pizza', unit_price: 10500, quantity: 1 }
      ]
    }, { id: 'SALONERO', name: 'Laura' });

    const order3Total = testOrder3.total;
    const cashEntregado = order3Total + 5000;

    const payResult3 = await processOrderPayment({
      orderId: testOrder3.id,
      paymentMethod: 'Efectivo',
      amountPaid: cashEntregado,
      customerName: 'Pedro Gomez',
      cashierName: 'Ana Cajera'
    });

    const isChangeCorrect = payResult3.change === 5000;

    logTest('PRUEBA-3', 'Efectivo & Cálculo de Cambio (Vuelto)', isChangeCorrect, {
      totalToPay: order3Total,
      amountPaid: cashEntregado,
      changeGiven: payResult3.change
    });

    // ------------------------------------------------------------------------
    // PRUEBA 4 — FACTURA COMPLETA & CAMPOS FISCALES
    // ------------------------------------------------------------------------
    const isDocStructureValid = payResult1.invoice.consecutivo && 
      payResult1.invoice.clave && 
      payResult1.invoice.subtotal > 0 && 
      payResult1.invoice.tax_iva > 0 && 
      payResult1.invoice.items_snapshot.length > 0;

    logTest('PRUEBA-4', 'Estructura de Factura & Detalle Histórico', isDocStructureValid, {
      claveLength: payResult1.invoice.clave.length,
      subtotal: payResult1.invoice.subtotal,
      taxIva: payResult1.invoice.tax_iva,
      taxService: payResult1.invoice.tax_service,
      snapshotCount: payResult1.invoice.items_snapshot.length
    });

    // ------------------------------------------------------------------------
    // PRUEBA 5 — IDEMPOTENCIA / PROTECCIÓN CONTRA FACTURA DUPLICADA
    // ------------------------------------------------------------------------
    let doublePaymentBlocked = false;
    try {
      await processOrderPayment({
        orderId: testOrder1.id,
        paymentMethod: 'Tarjeta POS',
        cashierName: 'Ana Cajera'
      });
    } catch (e) {
      doublePaymentBlocked = e.message.includes('ya fue pagado') || e.message.includes('procesado');
    }

    const fiscalQueueAll = await getFiscalQueue();
    const invoiceCountForOrder1 = fiscalQueueAll.filter(f => f.order_id === testOrder1.id).length;

    logTest('PRUEBA-5', 'Prevención de Facturas Duplicadas (Idempotencia)', doublePaymentBlocked && invoiceCountForOrder1 === 1, {
      blockedError: doublePaymentBlocked,
      invoiceCountForOrder: invoiceCountForOrder1
    });

    // ------------------------------------------------------------------------
    // PRUEBA 6 — MANEJO DE ERROR Y PAGO INSUFICIENTE
    // ------------------------------------------------------------------------
    const { order: testOrder6 } = await createOrderWithStockDeduction({
      tableId: 't-test-6',
      tableName: 'Mesa Prueba 6',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 1,
      items: [{ product_id: 'prod-rib-eye', product_name: 'Rib Eye 350g', unit_price: 18500, quantity: 1 }]
    }, { id: 'SALONERO', name: 'Laura' });

    let insufficientPaymentBlocked = false;
    try {
      await processOrderPayment({
        orderId: testOrder6.id,
        paymentMethod: 'Efectivo',
        amountPaid: 5000, // Insuficiente
        cashierName: 'Ana Cajera'
      });
    } catch (e) {
      insufficientPaymentBlocked = e.message.includes('menor al total');
    }

    const unPaidOrder6 = await dbGet('orders', testOrder6.id);
    const isOrder6StillPending = unPaidOrder6.status !== 'PAGADO';

    logTest('PRUEBA-6', 'Manejo de Error / Rechazo de Pago Insuficiente', insufficientPaymentBlocked && isOrder6StillPending, {
      blockedInsufficientPayment: insufficientPaymentBlocked,
      orderStillPending: isOrder6StillPending
    });

    // ------------------------------------------------------------------------
    // PRUEBA 7 — INMUTABILIDAD DE PRECIO HISTÓRICO EN FACTURA
    // ------------------------------------------------------------------------
    // Alterar temporalmente un producto en el menú de productos
    const origProduct = await dbGet('menu_products', 'prod-rib-eye');
    if (origProduct) {
      await dbPut('menu_products', { ...origProduct, base_price: 99000 });
    }

    // Re-leer la factura generada previamente en Prueba 1
    const historicalInvoices = await getFiscalQueue();
    const historicalDoc1 = historicalInvoices.find(f => f.order_id === testOrder1.id);
    const snapshotPrice = historicalDoc1?.items_snapshot?.find(i => i.product_id === 'prod-rib-eye')?.unit_price;

    // Restaurar precio original
    if (origProduct) {
      await dbPut('menu_products', origProduct);
    }

    const isHistoricalImmutable = snapshotPrice === 18500;

    logTest('PRUEBA-7', 'Inmutabilidad de Precios Históricos en Factura', isHistoricalImmutable, {
      originalPriceOnSale: 18500,
      priceAfterMenuChange: snapshotPrice
    });

    // ------------------------------------------------------------------------
    // PRUEBA 8 — APARICIÓN INSTANTÁNEA EN APARTADO FACTURAS
    // ------------------------------------------------------------------------
    const latestInvoices = await getFiscalQueue();
    const foundInvoice1 = latestInvoices.some(i => i.consecutivo === payResult1.invoice.consecutivo);
    const foundInvoice2 = latestInvoices.some(i => i.consecutivo === payResult2.invoice.consecutivo);
    const foundInvoice3 = latestInvoices.some(i => i.consecutivo === payResult3.invoice.consecutivo);

    logTest('PRUEBA-8', 'Aparición Instantánea en Apartado Facturas', foundInvoice1 && foundInvoice2 && foundInvoice3, {
      invoicesInQueue: latestInvoices.length,
      allTestInvoicesFound: foundInvoice1 && foundInvoice2 && foundInvoice3
    });

    return results;
  } catch (err) {
    console.error('Error durante la ejecución del runner de facturación:', err);
    logTest('PRUEBA-FATAL', 'Ejecución del Runner', false, { error: err.message });
    return results;
  }
}
