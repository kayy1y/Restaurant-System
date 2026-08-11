/**
 * Cliente de Conexión HTTP Directa con la API del Ministerio de Hacienda de Costa Rica v1 (ATV v4.4)
 * Endpoints:
 * - POST /recepcion -> Envía comprobante firmado (HTTP 201 = RECEIVED / PROCESSING)
 * - GET /recepcion/{clave} -> Consulta estado de validación tributaria (ACCEPTED / REJECTED)
 */

import { getHaciendaBearerToken } from './haciendaAuthService.js';

export async function sendDocumentToHaciendaDirect({
  config,
  signedXml,
  clave,
  fecha,
  emisorId,
  emisorIdType = '02',
  receptorId = '000000000',
  receptorIdType = '01'
}) {
  const token = await getHaciendaBearerToken(config);
  const apiUrl = `${config.apiUrl}/recepcion`;

  const xmlBase64 = Buffer.from(signedXml, 'utf-8').toString('base64');

  const payload = {
    clave,
    fecha: fecha || new Date().toISOString(),
    emisor: {
      tipoIdentificacion: emisorIdType,
      numeroIdentificacion: emisorId || config.issuer.idNumber
    },
    receptor: {
      tipoIdentificacion: receptorIdType,
      numeroIdentificacion: receptorId
    },
    comprobanteXml: xmlBase64
  };

  // En ambiente de pruebas sin conexión real a Hacienda, simula la respuesta oficial HTTP 201
  if (config.env === 'test' && (!config.username || config.username.includes('YOUR_'))) {
    return {
      httpStatus: 201,
      status: 'PROCESSING', // HTTP 201 significa RECIBIDO / EN PROCESO, NO ACEPTADO
      location: `${apiUrl}/${clave}`,
      message: 'Comprobante recibido por el Ministerio de Hacienda para validación (HTTP 201 Created).',
      clave,
      receivedAt: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const locationHeader = response.headers.get('Location');
    const responseText = await response.text();

    if (response.status === 201 || response.status === 202) {
      return {
        httpStatus: response.status,
        status: 'PROCESSING', // 201 NO ES ACEPTADO; ES RECIBIDO EN PROCESO DE VALIDACIÓN
        location: locationHeader || `${apiUrl}/${clave}`,
        message: 'Comprobante recibido exitosamente en Hacienda ATV.',
        clave,
        rawResponse: responseText,
        receivedAt: new Date().toISOString()
      };
    } else {
      return {
        httpStatus: response.status,
        status: 'SEND_ERROR',
        message: `Error al enviar comprobante a Hacienda (HTTP ${response.status}): ${responseText}`,
        clave,
        rawResponse: responseText
      };
    }
  } catch (error) {
    return {
      httpStatus: 500,
      status: 'RETRY_PENDING',
      message: `Fallo de conexión o red hacia Hacienda API: ${error.message}`,
      clave
    };
  }
}

export async function checkInvoiceStatusFromHaciendaDirect({ config, clave }) {
  const token = await getHaciendaBearerToken(config);
  const apiUrl = `${config.apiUrl}/recepcion/${clave}`;

  // En Sandbox / Modo Pruebas sin conexión real, simula la consulta GET /recepcion/{clave}
  if (config.env === 'test' && (!config.username || config.username.includes('YOUR_'))) {
    return {
      clave,
      httpStatus: 200,
      haciendaStatus: 'ACEPTADO', // 'ACEPTADO', 'RECHAZADO', 'PROCESANDO'
      indEstado: 'aceptado',
      respuestaXml: '<RespuestaHacienda><Estado>ACEPTADO</Estado></RespuestaHacienda>',
      checkedAt: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        clave,
        httpStatus: response.status,
        haciendaStatus: 'ERROR_CONSULTA',
        message: `Error al consultar estado en Hacienda (HTTP ${response.status}): ${errorText}`
      };
    }

    const data = await response.json();
    const indEstado = (data['ind-estado'] || '').toLowerCase();

    let haciendaStatus = 'PROCESSING';
    if (indEstado === 'aceptado') haciendaStatus = 'ACCEPTED';
    if (indEstado === 'rechazado') haciendaStatus = 'REJECTED';

    return {
      clave,
      httpStatus: 200,
      haciendaStatus,
      indEstado,
      respuestaXml: data['respuesta-xml'] || null,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      clave,
      httpStatus: 500,
      haciendaStatus: 'ERROR_CONEXION',
      message: `Error de red al consultar estado: ${error.message}`
    };
  }
}
