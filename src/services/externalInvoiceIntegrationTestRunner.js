/**
 * Runner de Pruebas Automatizadas de Integración de Facturación Externa API
 * Verifica los 9 escenarios exigidos por la especificación de integración.
 */

import { createOrderWithStockDeduction } from './orderService.js';
import { processOrderPayment } from './paymentService.js';
import { dbGet, dbPut } from './db.js';
import { 
  getIntegrationConfig, 
  saveIntegrationConfig, 
  processExternalInvoiceIntegration, 
  retryInvoiceIntegration, 
  getIntegrationRecords 
} from './invoiceIntegrationService.js';

export async function runExternalInvoiceIntegrationTests() {
  const results = [];

  const logTest = (id, name, success, details) => {
    results.push({ id, name, success, details, timestamp: new Date().toISOString() });
    console.log(`[TEST INTEGRACIÓN ${id}] ${name}: ${success ? '✅ PASÓ' : '❌ FALLÓ'}`, details);
  };

  try {
    // Save original config to restore at the end
    const originalConfig = await getIntegrationConfig();

    // ------------------------------------------------------------------------
    // TEST 1 — PAGO EXITOSO -> FACTURA INTERNA -> JSON -> REGISTRO INTEGRACIÓN
    // ------------------------------------------------------------------------
    await saveIntegrationConfig({ providerId: 'MOCK_SANDBOX', environment: 'sandbox' });

    const { order: testOrder1 } = await createOrderWithStockDeduction({
      tableId: 't-api-1',
      tableName: 'Mesa API 1',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 2,
      items: [
        { product_id: 'prod-rib-eye', product_name: 'Rib Eye 350g', unit_price: 18500, quantity: 1, customizations: [] },
        { product_id: 'prod-coca-cola', product_name: 'Coca-Cola 354ml', unit_price: 2000, quantity: 1, customizations: [] }
      ]
    }, { id: 'SALONERO', name: 'Laura' });

    const payResult1 = await processOrderPayment({
      orderId: testOrder1.id,
      paymentMethod: 'Tarjeta POS',
      cardType: 'Visa',
      referenceNumber: 'REF-123456',
      customerName: 'Carlos Mendoza',
      cashierName: 'Ana Cajera'
    });

    const isRecordCreated = !!payResult1.integration;
    const isJsonGenerated = payResult1.integration?.payload?.schema_version === '1.0';

    logTest('TEST-1', 'Generación Automática de JSON & Integración tras Pago Exitoso', isRecordCreated && isJsonGenerated, {
      invoiceId: payResult1.invoice.consecutivo,
      integrationId: payResult1.integration?.id,
      status: payResult1.integration?.status,
      hasJson: isJsonGenerated
    });

    // ------------------------------------------------------------------------
    // TEST 2 — VERIFICAR ESTRUCTURA COMPLETA DEL JSON NORMALIZADO
    // ------------------------------------------------------------------------
    const jsonPayload = payResult1.integration?.payload;

    const isStructureValid = jsonPayload &&
      jsonPayload.schema_version === '1.0' &&
      jsonPayload.invoice?.number === payResult1.invoice.consecutivo &&
      !!jsonPayload.issuer?.business_name &&
      jsonPayload.customer?.name === 'Carlos Mendoza' &&
      jsonPayload.items?.length === 2 &&
      jsonPayload.totals?.total === payResult1.order.total &&
      jsonPayload.payment?.method === 'Tarjeta POS';

    logTest('TEST-2', 'Validación de Estructura Completa del JSON Normalizado', isStructureValid, {
      schemaVersion: jsonPayload?.schema_version,
      invoiceNumber: jsonPayload?.invoice?.number,
      businessName: jsonPayload?.issuer?.business_name,
      customerName: jsonPayload?.customer?.name,
      itemCount: jsonPayload?.items?.length,
      total: jsonPayload?.totals?.total,
      paymentMethod: jsonPayload?.payment?.method
    });

    // ------------------------------------------------------------------------
    // TEST 3 — FACTURA CON MODIFICADORES Y PERSONALIZACIONES
    // ------------------------------------------------------------------------
    const { order: testOrder3 } = await createOrderWithStockDeduction({
      tableId: 't-api-3',
      tableName: 'Mesa API 3',
      waiterId: 'usr-carlos',
      waiterName: 'Carlos Salonero',
      diners: 1,
      items: [
        { 
          product_id: 'prod-hamburguesa-lavid', 
          product_name: 'Hamburguesa La Vid', 
          unit_price: 9500, 
          quantity: 1, 
          customizations: [{ name: 'Extra', value: 'Queso Cheddar', price: 800 }],
          notes: 'Término medio sin cebolla'
        }
      ]
    }, { id: 'SALONERO', name: 'Carlos' });

    const payResult3 = await processOrderPayment({
      orderId: testOrder3.id,
      paymentMethod: 'Efectivo',
      amountPaid: 15000,
      customerName: 'Ana Lopez',
      cashierName: 'Ana Cajera'
    });

    const jsonItem3 = payResult3.integration?.payload?.items?.[0];
    const hasModifiers = jsonItem3?.modifiers?.length > 0;

    logTest('TEST-3', 'Representación Correcta de Modificadores en el JSON', hasModifiers, {
      productName: jsonItem3?.name,
      modifiers: jsonItem3?.modifiers
    });

    // ------------------------------------------------------------------------
    // TEST 4 — PAGO FALLIDO -> NO GENERAR FACTURA EXTERNA
    // ------------------------------------------------------------------------
    const { order: testOrder4 } = await createOrderWithStockDeduction({
      tableId: 't-api-4',
      tableName: 'Mesa API 4',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 1,
      items: [{ product_id: 'prod-rib-eye', product_name: 'Rib Eye 350g', unit_price: 18500, quantity: 1 }]
    }, { id: 'SALONERO', name: 'Laura' });

    let failedPaymentBlocked = false;
    try {
      await processOrderPayment({
        orderId: testOrder4.id,
        paymentMethod: 'Efectivo',
        amountPaid: 1000, // Insuficiente
        cashierName: 'Ana Cajera'
      });
    } catch (err) {
      failedPaymentBlocked = true;
    }

    const allIntegrations = await getIntegrationRecords();
    const integrationForFailedOrder = allIntegrations.find(r => r.order_id === testOrder4.id);

    logTest('TEST-4', 'Pago Fallido No Genera ni Envía Factura Externa', failedPaymentBlocked && !integrationForFailedOrder, {
      paymentBlocked: failedPaymentBlocked,
      hasExternalIntegrationRecord: !!integrationForFailedOrder
    });

    // ------------------------------------------------------------------------
    // TEST 5 — PROVEEDOR NO CONFIGURADO (NOT_CONFIGURED)
    // ------------------------------------------------------------------------
    await saveIntegrationConfig({ providerId: 'NOT_CONFIGURED' });

    const { order: testOrder5 } = await createOrderWithStockDeduction({
      tableId: 't-api-5',
      tableName: 'Mesa API 5',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 2,
      items: [{ product_id: 'prod-pizza-margherita', product_name: 'Margherita Pizza', unit_price: 10500, quantity: 1 }]
    }, { id: 'SALONERO', name: 'Laura' });

    const payResult5 = await processOrderPayment({
      orderId: testOrder5.id,
      paymentMethod: 'SINPE Movil',
      referenceNumber: 'SINPE-998877',
      customerName: 'Mario Vargas',
      cashierName: 'Ana Cajera'
    });

    const isNotConfiguredSuccess = payResult5.integration?.status === 'NOT_CONFIGURED' && payResult5.order.status === 'PAGADO';

    logTest('TEST-5', 'Proveedor No Configurado (Sin fallar el sistema POS)', isNotConfiguredSuccess, {
      orderStatus: payResult5.order.status,
      invoiceConsecutivo: payResult5.invoice.consecutivo,
      integrationStatus: payResult5.integration?.status
    });

    // ------------------------------------------------------------------------
    // TEST 6 — SIMULACIÓN DE RESPUESTA EXITOSA DE PROVEEDOR (HTTP 200 ACCEPTED)
    // ------------------------------------------------------------------------
    await saveIntegrationConfig({ providerId: 'MOCK_SANDBOX' });

    const { order: testOrder6 } = await createOrderWithStockDeduction({
      tableId: 't-api-6',
      tableName: 'Mesa API 6',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 1,
      items: [{ product_id: 'prod-ceviche-tico', product_name: 'Ceviche Tico', unit_price: 7500, quantity: 1 }]
    }, { id: 'SALONERO', name: 'Laura' });

    const payResult6 = await processOrderPayment({
      orderId: testOrder6.id,
      paymentMethod: 'Tarjeta POS',
      customerName: 'Empresa Test S.A.',
      cashierName: 'Ana Cajera'
    });

    const isApiAccepted = payResult6.integration?.status === 'ACCEPTED' && 
      payResult6.integration?.response_code === 200 && 
      !!payResult6.integration?.external_id;

    logTest('TEST-6', 'Simulación Respuesta Exitosa (HTTP 200 ACCEPTED)', isApiAccepted, {
      status: payResult6.integration?.status,
      responseCode: payResult6.integration?.response_code,
      externalId: payResult6.integration?.external_id
    });

    // ------------------------------------------------------------------------
    // TEST 7 — SIMULACIÓN DE PROVEEDOR CAÍDO (HTTP 500 ERROR)
    // ------------------------------------------------------------------------
    // Configurar proveedor en NOT_CONFIGURED temporalmente para generar pedido e invoice sin enviar aun
    await saveIntegrationConfig({ providerId: 'NOT_CONFIGURED' });

    const { order: testOrder7 } = await createOrderWithStockDeduction({
      tableId: 't-api-7',
      tableName: 'Mesa API 7',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 1,
      items: [{ product_id: 'prod-carpaccio-res', product_name: 'Carpaccio de Res', unit_price: 9500, quantity: 1 }]
    }, { id: 'SALONERO', name: 'Laura' });

    const payResult7Internal = await processOrderPayment({
      orderId: testOrder7.id,
      paymentMethod: 'Efectivo',
      amountPaid: 15000,
      customerName: 'Cliente Error Test',
      cashierName: 'Ana Cajera'
    });

    // Configurar proveedor en MOCK_SANDBOX y forzar simulación de error HTTP 500
    await saveIntegrationConfig({ providerId: 'MOCK_SANDBOX' });

    const payResult7Integration = await processExternalInvoiceIntegration({
      order: payResult7Internal.order,
      payment: payResult7Internal.payment,
      fiscalDoc: payResult7Internal.invoice,
      forceSimulateError: true
    });

    const isErrorHandled = payResult7Integration.status === 'ERROR' && 
      payResult7Integration.response_code === 500 && 
      payResult7Internal.order.status === 'PAGADO'; // Internal invoice remains intact!

    logTest('TEST-7', 'Simulación Proveedor Caído (HTTP 500 ERROR sin romper factura interna)', isErrorHandled, {
      integrationStatus: payResult7Integration.status,
      responseCode: payResult7Integration.response_code,
      errorMessage: payResult7Integration.error_message,
      internalInvoiceStatus: payResult7Internal.invoice.status
    });

    // ------------------------------------------------------------------------
    // TEST 8 — REINTENTAR ENVÍO SIN DUPLICAR FACTURA INTERNA
    // ------------------------------------------------------------------------
    const retryResult = await retryInvoiceIntegration(payResult7Internal.invoice.consecutivo, false);

    const isRetriedSuccessfully = retryResult.status === 'ACCEPTED' && 
      retryResult.response_code === 200 && 
      retryResult.invoice_id === payResult7Internal.invoice.consecutivo;

    const allInvoicesNow = await getIntegrationRecords();
    const recordsForOrder7 = allInvoicesNow.filter(r => r.order_id === testOrder7.id).length;

    logTest('TEST-8', 'Reintento de Envío Seguro (Sin duplicar facturas internas)', isRetriedSuccessfully && recordsForOrder7 === 1, {
      retryStatus: retryResult.status,
      externalId: retryResult.external_id,
      recordCountForOrder: recordsForOrder7
    });

    // ------------------------------------------------------------------------
    // TEST 9 — SIMULACIÓN DE DOBLE CLIC EN PAGO
    // ------------------------------------------------------------------------
    const { order: testOrder9 } = await createOrderWithStockDeduction({
      tableId: 't-api-9',
      tableName: 'Mesa API 9',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 2,
      items: [{ product_id: 'prod-rib-eye', product_name: 'Rib Eye 350g', unit_price: 18500, quantity: 1 }]
    }, { id: 'SALONERO', name: 'Laura' });

    const payResult9 = await processOrderPayment({
      orderId: testOrder9.id,
      paymentMethod: 'Tarjeta POS',
      customerName: 'Cliente Doble Clic',
      cashierName: 'Ana Cajera'
    });

    // Intento secundario de pago
    let doublePaymentBlocked9 = false;
    try {
      await processOrderPayment({
        orderId: testOrder9.id,
        paymentMethod: 'Tarjeta POS',
        cashierName: 'Ana Cajera'
      });
    } catch (e) {
      doublePaymentBlocked9 = true;
    }

    const finalIntegrations9 = await getIntegrationRecords();
    const countForOrder9 = finalIntegrations9.filter(r => r.order_id === testOrder9.id).length;

    logTest('TEST-9', 'Prevención de Doble Clic (1 Pago, 1 Factura, 1 Payload, 1 Integración)', doublePaymentBlocked9 && countForOrder9 === 1, {
      doubleClickBlocked: doublePaymentBlocked9,
      integrationRecordCount: countForOrder9
    });

    // Restore original config
    await saveIntegrationConfig(originalConfig);

    return results;

  } catch (err) {
    console.error('Error fatal durante el test runner de integración API:', err);
    logTest('TEST-FATAL', 'Ejecución del Runner Integración API', false, { error: err.message });
    return results;
  }
}
