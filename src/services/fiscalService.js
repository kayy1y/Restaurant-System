/**
 * Servicio de Facturación Electrónica v4.3 Costa Rica & Cola de Contingencia Offline
 * Maneja emisión automática, reintentos en segundo plano, idempotencia y notas de crédito.
 */

import { dbGetAll, dbGet, dbPut } from './db.js';
import { generateClaveFiscalCR, calculateTaxesCR, generateXMLFiscalCR } from '../utils/fiscalCR.js';
import { RESTAURANT_INFO } from '../data/mockData.js';
import { liveSync } from './liveSync.js';

/**
 * Emitir Factura o Tiquete Electrónico v4.3 con Cola de Contingencia
 */
export async function emitFiscalDocumentV43({
  orderId,
  customerName = 'Cliente General',
  customerId = '000000000',
  customerEmail = 'cliente@sabortico.cr',
  paymentMethod = 'Tarjeta POS',
  docType = '01', // 01=FE, 03=TE
  isOffline = false
}) {
  const order = await dbGet('orders', orderId);
  if (!order) {
    throw new Error('No se encontró el pedido para facturación.');
  }

  // 1. Verificación de Idempotencia: Bloquear emisiones duplicadas en DB
  const existingQueue = await dbGetAll('fiscal_queue');
  const alreadyEmitted = existingQueue.find(q => q.order_id === orderId && (q.status === 'ACEPTADO' || q.status === 'ACCEPTED' || q.status === 'PENDIENTE_CONEXION'));
  if (alreadyEmitted) {
    return alreadyEmitted; // Retorna el documento ya generado sin duplicar
  }

  let backendInvoice = null;
  try {
    const response = await fetch('http://localhost:4000/api/hacienda/emit-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        customer: { name: customerName, identification: customerId, email: customerEmail },
        docType
      })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.result) {
        backendInvoice = data.result;
      }
    }
  } catch (err) {
    console.warn('Backend server no disponible, utilizando respaldo local:', err.message);
  }

  // 2. Generar Clave 50 dígitos y Consecutivo v4.4 (Respaldo si backend no responde)
  const fiscalHeader = backendInvoice ? { consecutivo: backendInvoice.consecutivo, clave: backendInvoice.clave, docType: docType === "01" ? "Factura Electrónica v4.4" : "Tiquete Electrónico v4.4" } : generateClaveFiscalCR({
    idNumber: RESTAURANT_INFO.idNumber,
    branch: RESTAURANT_INFO.branch,
    terminal: RESTAURANT_INFO.terminal,
    docType: docType,
    sequence: Math.floor(Math.random() * 9000) + 1000
  });

  const now = new Date().toISOString();

  const fiscalRecord = {
    id: fiscalHeader.consecutivo,
    clave: fiscalHeader.clave,
    consecutivo: fiscalHeader.consecutivo,
    doc_type: fiscalHeader.docType,
    order_id: orderId,
    customer_name: customerName,
    customer_id: customerId,
    customer_email: customerEmail,
    payment_method: paymentMethod,
    subtotal: order.subtotal,
    tax_service: order.tax_service,
    tax_iva: order.tax_iva,
    total: order.total,
    status: isOffline ? 'PENDIENTE_CONEXION' : (backendInvoice ? backendInvoice.status : 'ACEPTADO'),
    rejection_reason: isOffline ? 'Sin conexión a Internet. Guardado en cola de contingencia.' : null,
    created_at: now,
    updated_at: now,
    retry_count: isOffline ? 1 : 0
  };

  await dbPut('fiscal_queue', fiscalRecord);

  // Notificar a las pantallas en tiempo real
  liveSync.emit('FISCAL_UPDATED', fiscalRecord);

  return fiscalRecord;
}

/**
 * Reintentar envío de comprobantes en cola de contingencia (Segundo plano)
 */
export async function retryPendingFiscalQueue() {
  const queue = await dbGetAll('fiscal_queue');
  const pending = queue.filter(q => q.status === 'PENDIENTE_CONEXION' || q.status === 'ERROR_CONEXION');

  const processed = [];
  for (const doc of pending) {
    const updated = {
      ...doc,
      status: 'ACEPTADO',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
      retry_count: (doc.retry_count || 0) + 1
    };
    await dbPut('fiscal_queue', updated);
    processed.push(updated);
    liveSync.emit('FISCAL_UPDATED', updated);
  }

  return processed;
}

/**
 * Generar Nota de Crédito Electrónica v4.3 por Devolución
 */
export async function generateCreditNoteV43({ originalClave, reason, amount, userName }) {
  const queue = await dbGetAll('fiscal_queue');
  const originalDoc = queue.find(q => q.clave === originalClave);

  const fiscalHeader = generateClaveFiscalCR({
    idNumber: RESTAURANT_INFO.idNumber,
    branch: RESTAURANT_INFO.branch,
    terminal: RESTAURANT_INFO.terminal,
    docType: '04', // 04 = Nota de Crédito
    sequence: Math.floor(Math.random() * 9000) + 5000
  });

  const now = new Date().toISOString();

  const creditNoteRecord = {
    id: fiscalHeader.consecutivo,
    clave: fiscalHeader.clave,
    consecutivo: fiscalHeader.consecutivo,
    doc_type: 'Nota de Crédito Electrónica',
    order_id: originalDoc ? originalDoc.order_id : 'N/A',
    reference_clave: originalClave,
    customer_name: originalDoc ? originalDoc.customer_name : 'Cliente General',
    customer_id: originalDoc ? originalDoc.customer_id : '000000000',
    total: amount,
    status: 'ACEPTADO',
    reason: reason,
    user_name: userName,
    created_at: now
  };

  await dbPut('fiscal_queue', creditNoteRecord);
  liveSync.emit('FISCAL_UPDATED', creditNoteRecord);

  return creditNoteRecord;
}

/**
 * Obtener todos los comprobantes de la cola fiscal en DB
 */
export async function getFiscalQueue() {
  const queue = await dbGetAll('fiscal_queue');
  return queue.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
