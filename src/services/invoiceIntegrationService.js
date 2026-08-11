/**
 * Arquitectura de Integración de Facturación Externa API - GastroFlow OS
 * Genera payloads JSON normalizados, administra proveedores (Mock, Hacienda, APIs externas),
 * gestiona colas de integración, idempotencia y reintentos automáticos.
 */

import { dbGet, dbPut, dbGetAll } from './db.js';
import { RESTAURANT_INFO } from '../data/mockData.js';
import { liveSync } from './liveSync.js';

// Idempotency lock in-memory guard to prevent duplicate API dispatches
const activeIntegrationLocks = new Set();

/**
 * Obtener Configuración del Proveedor Externo de Facturación
 */
export async function getIntegrationConfig() {
  try {
    const config = await dbGet('integration_config', 'default_provider_config');
    if (config) return config;
  } catch (err) {
    console.warn('Error leyendo integración config de DB:', err);
  }

  // Configuración por Defecto
  return {
    id: 'default_provider_config',
    providerId: 'NOT_CONFIGURED', // 'NOT_CONFIGURED', 'MOCK_SANDBOX', 'CR_HACIENDA_API'
    environment: 'sandbox',      // 'sandbox', 'production'
    apiBaseUrl: 'https://api.facturacion.cr/v1',
    apiKey: '',
    timeout: 10000,
    retries: 3,
    updated_at: new Date().toISOString()
  };
}

/**
 * Guardar Configuración Administrativa del Proveedor
 */
export async function saveIntegrationConfig(newConfig) {
  const current = await getIntegrationConfig();
  const updated = {
    ...current,
    ...newConfig,
    id: 'default_provider_config',
    updated_at: new Date().toISOString()
  };

  await dbPut('integration_config', updated);
  liveSync.emit('INTEGRATION_CONFIG_UPDATED', updated);
  return updated;
}

/**
 * Validar Estructura Crítica del JSON Normalizado
 */
export function validateNormalizedInvoice(payload) {
  const errors = [];

  if (!payload.schema_version) errors.push('Falta versión de esquema (schema_version).');
  if (!payload.invoice || !payload.invoice.number) errors.push('Falta el número de factura.');
  if (!payload.invoice.issued_at) errors.push('Falta la fecha/hora de emisión.');
  if (!payload.issuer || !payload.issuer.business_name) errors.push('Falta nombre del emisor.');
  if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('La factura debe contener al menos un producto en items.');
  }
  if (!payload.totals || typeof payload.totals.total !== 'number') {
    errors.push('Falta el importe total consolidado en totals.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Construir JSON Normalizado Estándar (schema_version: "1.0")
 */
export function buildNormalizedInvoicePayload(order, payment, fiscalDoc) {
  if (!order) throw new Error('Se requiere el objeto pedido para construir el JSON normalizado.');
  if (!fiscalDoc) throw new Error('Se requiere el comprobante fiscal interno para construir el JSON normalizado.');

  const now = fiscalDoc.created_at || new Date().toISOString();

  // Snapshot Histórico Inmutable de Productos y Modificadores
  const snapshotItems = (fiscalDoc.items_snapshot && fiscalDoc.items_snapshot.length > 0)
    ? fiscalDoc.items_snapshot
    : (order.items_snapshot || (order.items || []).filter(i => i.status !== 'RETIRADO_DE_CUENTA'));

  const items = snapshotItems.map((item, idx) => {
    const unitPrice = Number(item.unit_price || item.price || 0);
    const qty = Number(item.quantity || 1);
    const subtotal = Number(item.item_total || (unitPrice * qty));

    // Modificadores / Personalizaciones
    const modifiers = [];
    if (item.customizations && Array.isArray(item.customizations)) {
      item.customizations.forEach(c => {
        modifiers.push({
          name: typeof c === 'string' ? 'Especificación' : (c.name || 'Opción'),
          value: typeof c === 'string' ? c : (c.value || c.label || ''),
          price: c.price || 0
        });
      });
    }

    if (item.notes) {
      modifiers.push({
        name: 'Nota del Cliente',
        value: item.notes,
        price: 0
      });
    }

    return {
      line: idx + 1,
      product_id: item.product_id || `prod-${idx + 1}`,
      name: item.product_name || item.name || 'Producto',
      quantity: qty,
      unit_price: unitPrice,
      subtotal: subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      modifiers: modifiers
    };
  });

  const payload = {
    schema_version: '1.0',

    invoice: {
      internal_id: fiscalDoc.id || order.id,
      number: fiscalDoc.consecutivo,
      clave_fiscal: fiscalDoc.clave || null,
      order_id: order.id,
      payment_id: payment?.id || order.payment_id || `PAY-${order.id}`,
      table_id: order.table_id || null,
      table_name: order.table_name || null,
      issued_at: now,
      timezone: 'America/Costa_Rica',
      currency: 'CRC'
    },

    issuer: {
      business_name: RESTAURANT_INFO.name || 'La Vid Steak House & Pizza',
      legal_name: RESTAURANT_INFO.legalName || 'La Vid Steak House & Pizza S.A.',
      identification: RESTAURANT_INFO.idNumber || '3-101-889922',
      phone: RESTAURANT_INFO.phone || '+506 2479-9988',
      email: RESTAURANT_INFO.email || 'info@lavidsteakhouse.cr',
      address: RESTAURANT_INFO.address || 'La Fortuna, San Carlos, Alajuela, Costa Rica',
      location: 'La Fortuna, Costa Rica'
    },

    customer: {
      name: fiscalDoc.customer_name || payment?.customer_name || 'Consumidor Final',
      identification: fiscalDoc.customer_id || payment?.customer_id || '000000000',
      email: fiscalDoc.customer_email || payment?.customer_email || 'cliente@lavidsteakhouse.cr',
      phone: payment?.customer_phone || null,
      address: payment?.customer_address || null
    },

    items: items,

    totals: {
      subtotal: Number(fiscalDoc.subtotal || order.subtotal || 0),
      discount: 0,
      tax: Number(fiscalDoc.tax_iva || order.tax_iva || 0),
      service_charge: Number(fiscalDoc.tax_service || order.tax_service || 0),
      other_charges: 0,
      total: Number(fiscalDoc.total || order.total || 0)
    },

    payment: {
      method: payment?.payment_method || fiscalDoc.payment_method || order.payment_method || 'Efectivo',
      amount: Number(payment?.amount_paid || order.amount_paid || order.total || 0),
      change_given: Number(payment?.change_given || order.change_given || 0),
      reference: payment?.reference_number || fiscalDoc.reference_number || null
    }
  };

  const validation = validateNormalizedInvoice(payload);
  if (!validation.isValid) {
    console.warn('Advertencia de validación en JSON normalizado:', validation.errors);
  }

  return payload;
}

/**
 * Adaptadores de Proveedores Externos (Patrón Adapter)
 */
class MockProviderAdapter {
  async sendInvoice(payload, config) {
    // Simulación de latencia de red
    await new Promise(res => setTimeout(res, 200));

    if (config.simulateError) {
      return {
        success: false,
        responseCode: 500,
        errorMessage: 'Servidor del proveedor externo no responde (HTTP 500 Internal Server Error).',
        body: { error: 'INTERNAL_SERVER_ERROR', message: 'Servicio en mantenimiento temporal' }
      };
    }

    return {
      success: true,
      responseCode: 200,
      externalId: `EXT-MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      body: {
        status: 'ACCEPTED',
        message: 'Comprobante fiscal recibido y procesado exitosamente por API externa',
        received_at: new Date().toISOString()
      }
    };
  }
}

class CostaRicaHaciendaAdapter {
  async sendInvoice(payload, config) {
    if (typeof fetch === 'undefined') {
      return { success: false, responseCode: 500, errorMessage: 'Fetch API no disponible en este entorno.' };
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/recepcion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey || 'MOCK_TOKEN'}`
        },
        body: JSON.stringify(payload)
      });

      const bodyData = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          success: true,
          responseCode: response.status,
          externalId: bodyData.id || `HAC-${payload.invoice.number}`,
          body: bodyData
        };
      } else {
        return {
          success: false,
          responseCode: response.status,
          errorMessage: bodyData.message || `Error del servidor externo (HTTP ${response.status})`,
          body: bodyData
        };
      }
    } catch (err) {
      return {
        success: false,
        responseCode: 0,
        errorMessage: `Error de conexión HTTP: ${err.message}`,
        body: null
      };
    }
  }
}

const PROVIDER_ADAPTERS = {
  'MOCK_SANDBOX': new MockProviderAdapter(),
  'CR_HACIENDA_API': new CostaRicaHaciendaAdapter()
};

/**
 * Pipeline Transaccional Automático de Integración
 * Ejecuta: COBRO APROBADO -> FACTURA INTERNA -> JSON NORMALIZADO -> REGISTRO INTEGRACIÓN -> API EXTERNA (Si existe proveedor)
 */
export async function processExternalInvoiceIntegration({ order, payment, fiscalDoc, forceSimulateError = false }) {
  if (!fiscalDoc || !fiscalDoc.consecutivo) {
    throw new Error('No se puede procesar integración externa sin una factura interna válida.');
  }

  const invoiceId = fiscalDoc.id || fiscalDoc.consecutivo;
  const config = await getIntegrationConfig();
  const providerId = config.providerId || 'NOT_CONFIGURED';
  const idempotencyKey = `${invoiceId}_${providerId}`;

  // 1. Idempotencia y Prevención de Envíos Duplicados
  if (activeIntegrationLocks.has(idempotencyKey)) {
    console.log(`[INTEGRACIÓN API] Bloqueo idempotente activo para ${idempotencyKey}`);
    const existing = await getIntegrationRecordByInvoiceId(invoiceId);
    return existing;
  }

  activeIntegrationLocks.add(idempotencyKey);

  try {
    // Verificar si ya existe una integración exitosa previa
    const existingRecords = await getIntegrationRecords();
    const existing = existingRecords.find(r => r.idempotency_key === idempotencyKey);

    if (existing && existing.status === 'ACCEPTED') {
      console.log(`[INTEGRACIÓN API] Factura ${invoiceId} ya fue enviada y aceptada por ${providerId}.`);
      return existing;
    }

    const now = new Date().toISOString();
    const payload = buildNormalizedInvoicePayload(order, payment, fiscalDoc);

    const integrationRecord = existing || {
      id: `INT-${invoiceId}`,
      invoice_id: invoiceId,
      invoice_number: fiscalDoc.consecutivo,
      order_id: order.id,
      provider: providerId,
      payload: payload,
      external_id: null,
      status: providerId === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'PENDING',
      attempts: 0,
      last_attempt_at: null,
      response_code: null,
      response_body: null,
      error_message: null,
      idempotency_key: idempotencyKey,
      created_at: now,
      updated_at: now
    };

    // Guardar JSON y registro de integración localmente en IndexedDB
    await dbPut('invoice_integrations', integrationRecord);

    // 2. Si el proveedor NO está configurado, la factura interna funciona de forma fluida sin fallar
    if (providerId === 'NOT_CONFIGURED') {
      console.log(`[INTEGRACIÓN API] Proveedor NO configurado. JSON normalizado guardado como NOT_CONFIGURED para la factura ${fiscalDoc.consecutivo}.`);
      liveSync.emit('INVOICE_INTEGRATION_UPDATED', integrationRecord);
      return integrationRecord;
    }

    // 3. Ejecutar Envío a la API del Proveedor
    const adapter = PROVIDER_ADAPTERS[providerId] || PROVIDER_ADAPTERS['MOCK_SANDBOX'];
    
    integrationRecord.status = 'SENDING';
    integrationRecord.attempts += 1;
    integrationRecord.last_attempt_at = new Date().toISOString();
    await dbPut('invoice_integrations', integrationRecord);

    const apiConfig = { ...config, simulateError: forceSimulateError };
    const response = await adapter.sendInvoice(payload, apiConfig);

    if (response.success) {
      integrationRecord.status = 'ACCEPTED';
      integrationRecord.external_id = response.externalId;
      integrationRecord.response_code = response.responseCode;
      integrationRecord.response_body = response.body;
      integrationRecord.error_message = null;
    } else {
      integrationRecord.status = 'ERROR';
      integrationRecord.response_code = response.responseCode || 500;
      integrationRecord.response_body = response.body;
      integrationRecord.error_message = response.errorMessage || 'Error en comunicación con proveedor externo.';
    }

    integrationRecord.updated_at = new Date().toISOString();
    await dbPut('invoice_integrations', integrationRecord);

    liveSync.emit('INVOICE_INTEGRATION_UPDATED', integrationRecord);
    return integrationRecord;

  } finally {
    activeIntegrationLocks.delete(idempotencyKey);
  }
}

/**
 * Reintentar Envío de Factura Externa (Solo Admin o Proceso de Fondo)
 * Reutiliza la MISMA factura interna y la MISMA integración sin duplicar.
 */
export async function retryInvoiceIntegration(invoiceId, forceSimulateError = false) {
  const records = await getIntegrationRecords();
  const record = records.find(r => r.invoice_id === invoiceId || r.invoice_number === invoiceId);

  if (!record) {
    throw new Error(`No se encontró registro de integración para la factura ${invoiceId}.`);
  }

  if (record.status === 'ACCEPTED') {
    throw new Error(`La factura ${invoiceId} ya fue aceptada previamente por el proveedor externo (ID: ${record.external_id}).`);
  }

  const config = await getIntegrationConfig();
  const providerId = config.providerId === 'NOT_CONFIGURED' ? 'MOCK_SANDBOX' : config.providerId;
  const adapter = PROVIDER_ADAPTERS[providerId] || PROVIDER_ADAPTERS['MOCK_SANDBOX'];

  record.status = 'SENDING';
  record.attempts += 1;
  record.last_attempt_at = new Date().toISOString();
  await dbPut('invoice_integrations', record);

  const apiConfig = { ...config, simulateError: forceSimulateError };
  const response = await adapter.sendInvoice(record.payload, apiConfig);

  if (response.success) {
    record.status = 'ACCEPTED';
    record.external_id = response.externalId;
    record.response_code = response.responseCode;
    record.response_body = response.body;
    record.error_message = null;
  } else {
    record.status = 'ERROR';
    record.response_code = response.responseCode || 500;
    record.response_body = response.body;
    record.error_message = response.errorMessage || 'Error reintentando comunicación API.';
  }

  record.updated_at = new Date().toISOString();
  await dbPut('invoice_integrations', record);

  liveSync.emit('INVOICE_INTEGRATION_UPDATED', record);
  return record;
}

/**
 * Obtener todos los registros de integración
 */
export async function getIntegrationRecords() {
  try {
    return await dbGetAll('invoice_integrations');
  } catch (err) {
    return [];
  }
}

/**
 * Obtener Registro de Integración Específico por Invoice ID
 */
export async function getIntegrationRecordByInvoiceId(invoiceId) {
  const records = await getIntegrationRecords();
  return records.find(r => r.invoice_id === invoiceId || r.invoice_number === invoiceId) || null;
}
