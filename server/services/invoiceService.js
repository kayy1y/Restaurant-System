/**
 * Orquestador Principal del Sistema de Facturación Electrónica Directa Hacienda CR v4.4
 * Flujo: POS -> Datos -> Secuencia Atómica DB -> Clave 50d -> XML 4.4 -> Validación -> Firma P12 -> POST /recepcion -> GET status
 */

import { getHaciendaConfig } from '../config/haciendaConfig.js';
import { getNextAtomicConsecutive } from './consecutiveService.js';
import { generateHaciendaKeyV44 } from './haciendaKeyGenerator.js';
import { generateHaciendaXmlV44 } from './haciendaXmlService.js';
import { validateXmlV44 } from './xmlValidationService.js';
import { signXmlHaciendaV44 } from './haciendaSigner.js';
import { sendDocumentToHaciendaDirect, checkInvoiceStatusFromHaciendaDirect } from './haciendaApiClient.js';

// Almacenamiento server-side de envíos tributarios en base de datos
const invoiceSubmissionsDb = new Map();
const idempotencyLocks = new Set();

export async function processDirectHaciendaInvoice({
  order,
  payment,
  customer = {},
  docType = '01' // 01=Factura Electrónica, 03=Tiquete Electrónico, 04=Nota de Crédito
}) {
  const config = getHaciendaConfig();
  const orderId = order.id || order.order_id;
  const paymentId = payment ? (payment.id || payment.payment_id) : `PAY-${Date.now()}`;

  // 1. Control de Idempotencia en Base de Datos Server-Side
  const idempotencyKey = `PAY_LOCK_${orderId}_${paymentId}`;
  if (idempotencyLocks.has(idempotencyKey)) {
    const existing = invoiceSubmissionsDb.get(orderId);
    if (existing) return existing;
  }
  idempotencyLocks.add(idempotencyKey);

  try {
    // 2. Consecutivo Atómico Incremental de Base de Datos (SIN Math.random)
    const atomicConsecutive = await getNextAtomicConsecutive({
      branch: config.issuer.branch,
      terminal: config.issuer.terminal,
      docType
    });

    // 3. Clave Oficial de 50 Dígitos v4.4
    const keyData = generateHaciendaKeyV44({
      idNumber: config.issuer.idNumber,
      situacion: '1',
      consecutivo: atomicConsecutive.consecutivo,
      issueDate: new Date()
    });

    const invoiceMetadata = {
      internal_id: atomicConsecutive.consecutivo,
      number: atomicConsecutive.consecutivo,
      clave: keyData.clave,
      consecutivo: atomicConsecutive.consecutivo,
      order_id: orderId,
      payment_id: paymentId,
      issued_at: keyData.issuedAt
    };

    // 4. Generar XML Oficial v4.4
    const items = order.items_snapshot || order.items || [];
    const xmlUnsigned = generateHaciendaXmlV44({
      invoice: invoiceMetadata,
      issuer: config.issuer,
      customer,
      items,
      totals: {
        subtotal: order.subtotal,
        tax_iva: order.tax_iva,
        tax_service: order.tax_service,
        total: order.total
      },
      docType
    });

    // 5. Validación de Esquema XSD v4.4
    const validationResult = validateXmlV44(xmlUnsigned);
    if (!validationResult.isValid) {
      const failedRecord = {
        invoiceId: atomicConsecutive.consecutivo,
        clave: keyData.clave,
        consecutivo: atomicConsecutive.consecutivo,
        orderId,
        status: 'XML_INVALID',
        validationErrors: validationResult.errors,
        created_at: new Date().toISOString()
      };
      invoiceSubmissionsDb.set(orderId, failedRecord);
      return failedRecord;
    }

    // 6. Firma Criptográfica XAdES-BES PKCS#12 (.P12)
    const signatureResult = await signXmlHaciendaV44(xmlUnsigned, config);

    // 7. Envío Directo HTTP POST /recepcion (201 = RECIBIDO / PROCESSING)
    const sendResult = await sendDocumentToHaciendaDirect({
      config,
      signedXml: signatureResult.signedXml,
      clave: keyData.clave,
      fecha: keyData.issuedAt,
      emisorId: config.issuer.idNumber,
      emisorIdType: config.issuer.idType,
      receptorId: customer.identification || '000000000',
      receptorIdType: customer.idType || '01'
    });

    // 8. Consulta de Estado GET /recepcion/{clave}
    let statusCheck = { haciendaStatus: 'PROCESSING' };
    if (sendResult.httpStatus === 201 || sendResult.httpStatus === 200) {
      statusCheck = await checkInvoiceStatusFromHaciendaDirect({ config, clave: keyData.clave });
    }

    const finalRecord = {
      invoiceId: atomicConsecutive.consecutivo,
      clave: keyData.clave,
      consecutivo: atomicConsecutive.consecutivo,
      orderId,
      paymentId,
      status: statusCheck.haciendaStatus === 'ACEPTADO' ? 'ACCEPTED' : sendResult.status,
      haciendaStatus: statusCheck.haciendaStatus || 'PROCESSING',
      httpStatus: sendResult.httpStatus,
      xmlOriginal: xmlUnsigned,
      xmlSigned: signatureResult.signedXml,
      digestValue: signatureResult.digestValue,
      locationHeader: sendResult.location,
      attempts: 1,
      lastAttemptAt: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    invoiceSubmissionsDb.set(orderId, finalRecord);
    invoiceSubmissionsDb.set(keyData.clave, finalRecord);

    return finalRecord;

  } finally {
    idempotencyLocks.delete(idempotencyKey);
  }
}

export async function getDirectInvoiceStatus(clave) {
  const config = getHaciendaConfig();
  const existing = invoiceSubmissionsDb.get(clave);
  const statusResult = await checkInvoiceStatusFromHaciendaDirect({ config, clave });

  if (existing) {
    existing.haciendaStatus = statusResult.haciendaStatus;
    existing.status = statusResult.haciendaStatus === 'ACEPTADO' ? 'ACCEPTED' : existing.status;
    existing.checkedAt = new Date().toISOString();
  }

  return {
    existingRecord: existing || null,
    statusResult
  };
}

export function getHaciendaBackendHealth() {
  const config = getHaciendaConfig();
  return {
    status: 'OK',
    env: config.env,
    backendVersion: 'GastroFlow Direct Hacienda Engine v4.4',
    issuerConfigured: !!config.issuer.idNumber,
    issuerName: config.issuer.name,
    branch: config.issuer.branch,
    terminal: config.issuer.terminal,
    timestamp: new Date().toISOString()
  };
}
