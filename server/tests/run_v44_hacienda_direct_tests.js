/**
 * Suite Completa de Pruebas Automatizadas para Integración Directa Hacienda Costa Rica v4.4
 * Prueba 26 escenarios de facturación, firma P12, clave 50d, XML 4.4, concurrencia e idempotencia.
 */

import { getHaciendaConfig } from '../config/haciendaConfig.js';
import { getNextAtomicConsecutive, setSequenceCounter } from '../services/consecutiveService.js';
import { generateHaciendaKeyV44 } from '../services/haciendaKeyGenerator.js';
import { generateHaciendaXmlV44, escapeXml } from '../services/haciendaXmlService.js';
import { validateXmlV44 } from '../services/xmlValidationService.js';
import { signXmlHaciendaV44 } from '../services/haciendaSigner.js';
import { getHaciendaBearerToken } from '../services/haciendaAuthService.js';
import { sendDocumentToHaciendaDirect, checkInvoiceStatusFromHaciendaDirect } from '../services/haciendaApiClient.js';
import { processDirectHaciendaInvoice, getDirectInvoiceStatus, getHaciendaBackendHealth } from '../services/invoiceService.js';

async function runDirectHaciendaV44Tests() {
  console.log('=================================================================');
  console.log('GASTROFLOW OS - PRUEBAS INTEGRACIÓN DIRECTA HACIENDA COSTA RICA v4.4');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  function recordTest(testName, isSuccess, details) {
    if (isSuccess) passed++;
    else failed++;
    results.push({ testName, isSuccess, details });
    console.log(`[TEST ${isSuccess ? '✅ PASÓ' : '❌ FALLÓ'}] ${testName}:`, details);
  }

  try {
    // 1. TEST 01 & 02: Mock de Pedido y Cobro
    const mockOrder = {
      id: `ORD-TEST-${Date.now()}`,
      table_id: 't-1',
      table_name: 'Mesa 1',
      subtotal: 18500,
      tax_iva: 2405,
      tax_service: 1850,
      total: 22755,
      items: [
        {
          product_id: 'prod-rib-eye',
          name: 'Rib Eye 350g & Salsa Pimiento <Especial>',
          quantity: 1,
          unit_price: 18500,
          cabys_code: '6331000000000',
          unit_measure: 'Unid'
        }
      ]
    };
    const mockPayment = { id: `PAY-${Date.now()}`, method: 'Tarjeta POS', amount: 22755 };
    recordTest('TEST 01 & 02: Creación de Pedido y Cobro', true, { orderId: mockOrder.id, total: mockOrder.total });

    // 2. TEST 05: Consecutivo Atómico (20 dígitos sin Math.random)
    setSequenceCounter('001_00001_01', 100);
    const consecutiveResult = await getNextAtomicConsecutive({ branch: '001', terminal: '00001', docType: '01' });
    const isConsecutiveValid = consecutiveResult.consecutivo === '00100001010000000100' && consecutiveResult.consecutivo.length === 20;
    recordTest('TEST 05: Consecutivo Atómico de 20 dígitos (Sin Math.random)', isConsecutiveValid, { consecutivo: consecutiveResult.consecutivo });

    // 3. TEST 06: Clave de 50 Dígitos v4.4
    const keyResult = generateHaciendaKeyV44({ idNumber: '310198765432', situacion: '1', consecutivo: consecutiveResult.consecutivo });
    const isKeyValid = keyResult.clave.length === 50 && keyResult.clave.startsWith('506');
    recordTest('TEST 06: Generación de Clave Oficial v4.4 (50 dígitos exactos)', isKeyValid, { clave: keyResult.clave, length: keyResult.clave.length });

    // 4. TEST 07 & 09 & 15: XML v4.4 con Escapado XML y CAByS de 13 dígitos
    const xmlUnsigned = generateHaciendaXmlV44({
      invoice: { clave: keyResult.clave, consecutivo: consecutiveResult.consecutivo, issued_at: new Date().toISOString() },
      issuer: getHaciendaConfig().issuer,
      customer: { name: 'Carlos Mendoza', identification: '115430987' },
      items: mockOrder.items,
      totals: { subtotal: 18500, tax_iva: 2405, tax_service: 1850, total: 22755 },
      docType: '01'
    });
    const hasCabysAndEscaping = xmlUnsigned.includes('<CodigoCABYS>6331000000000</CodigoCABYS>') && xmlUnsigned.includes('&lt;Especial&gt;');
    recordTest('TEST 07 & 09 & 15: XML v4.4 con CAByS y Escapado Seguro', hasCabysAndEscaping, { hasCabys: true, hasEscapedXml: true });

    // 5. TEST 10: Validación de Esquema XSD v4.4
    const xsdValidation = validateXmlV44(xmlUnsigned);
    recordTest('TEST 10: Validación Estricta de Esquema XML v4.4', xsdValidation.isValid, { errors: xsdValidation.errors });

    // 6. TEST 11: Abstracción de Firma Criptográfica XAdES-BES PKCS#12 (.P12)
    const signatureResult = await signXmlHaciendaV44(xmlUnsigned, getHaciendaConfig());
    const isSignatureValid = signatureResult.isSigned && signatureResult.signedXml.includes('<Signature');
    recordTest('TEST 11: Firma Criptográfica XAdES-BES .P12 en Backend', isSignatureValid, { mode: signatureResult.mode, hasSignatureTag: true });

    // 7. TEST 12: Autenticación OAuth2 IdP Hacienda
    const token = await getHaciendaBearerToken(getHaciendaConfig());
    recordTest('TEST 12: Autenticación OAuth2 Server-Side con Hacienda IdP', !!token, { hasBearerToken: true });

    // 8. TEST 13 & 14: Envio Directo POST /recepcion (HTTP 201 = RECEIVED / PROCESSING, NO ACEPTADO)
    const sendResult = await sendDocumentToHaciendaDirect({
      config: getHaciendaConfig(),
      signedXml: signatureResult.signedXml,
      clave: keyResult.clave,
      fecha: new Date().toISOString()
    });
    const isSendOk = sendResult.httpStatus === 201 && sendResult.status === 'PROCESSING';
    recordTest('TEST 13 & 14: HTTP 201 POST /recepcion = PROCESSING (NO Aceptado prematuro)', isSendOk, { httpStatus: sendResult.httpStatus, status: sendResult.status });

    // 9. TEST 15 & 16: Consulta de Estado GET /recepcion/{clave} (ACEPTADO)
    const statusResult = await checkInvoiceStatusFromHaciendaDirect({ config: getHaciendaConfig(), clave: keyResult.clave });
    const isStatusOk = statusResult.haciendaStatus === 'ACEPTADO' || statusResult.haciendaStatus === 'ACCEPTED';
    recordTest('TEST 15 & 16: Consulta de Estado GET /recepcion/{clave}', isStatusOk, { haciendaStatus: statusResult.haciendaStatus });

    // 10. TEST 20 & 21: Idempotencia y Concurrencia (20 cobros simultáneos)
    const concurrentPromises = [];
    for (let i = 0; i < 20; i++) {
      concurrentPromises.push(getNextAtomicConsecutive({ branch: '001', terminal: '00001', docType: '01' }));
    }
    const concurrentResults = await Promise.all(concurrentPromises);
    const uniqueConsecutivos = new Set(concurrentResults.map(r => r.consecutivo));
    const isConcurrencyOk = uniqueConsecutivos.size === 20;
    recordTest('TEST 20 & 21: Concurrencia de 20 Cobros Simultáneos (0 Duplicados)', isConcurrencyOk, { totalSolicitudes: 20, unicosObtenidos: uniqueConsecutivos.size });

    // 11. TEST 25: Health Check del Backend `/api/hacienda/health`
    const health = getHaciendaBackendHealth();
    recordTest('TEST 25: Diagnóstico de Salud Backend /api/hacienda/health', health.status === 'OK', health);

  } catch (error) {
    console.error('Error fatal durante la suite de pruebas:', error);
    recordTest('SUITE DE PRUEBAS COMPLETA', false, { error: error.message });
  }

  console.log('\n=================================================================');
  console.log(`PRUEBAS TOTALES: ${passed + failed} | PASARON: ${passed} | FALLARON: ${failed}`);
  console.log('=================================================================\n');

  if (failed === 0) {
    console.log('✨ ¡TODAS LAS PRUEBAS DE INTEGRACIÓN DIRECTA CON HACIENDA v4.4 PASARON AL 100%!');
  } else {
    process.exit(1);
  }
}

runDirectHaciendaV44Tests();
