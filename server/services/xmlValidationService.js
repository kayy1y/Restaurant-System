/**
 * Validador de Esquema y Reglas de Negocio XML Costa Rica v4.4
 * Previene envíos con XMLs malformados, namespaces incorrectos o campos faltantes.
 */

export function validateXmlV44(xmlString) {
  const errors = [];

  if (!xmlString || typeof xmlString !== 'string') {
    return { isValid: false, errors: ['El XML es nulo o vacío.'] };
  }

  // 1. Validar Namespace v4.4
  if (!xmlString.includes('xml-schemas/v4.4/')) {
    errors.push('El XML no contiene el namespace oficial de Comprobantes Electrónicos v4.4 del Ministerio de Hacienda.');
  }

  // 2. Validar Nodos Requeridos
  const requiredTags = [
    'Clave',
    'CodigoActividadEmisor',
    'NumeroConsecutivo',
    'FechaEmision',
    'Emisor',
    'Receptor',
    'CondicionVenta',
    'MedioPago',
    'DetalleServicio',
    'LineaDetalle',
    'CodigoCABYS',
    'ResumenFactura',
    'TotalComprobante'
  ];

  requiredTags.forEach(tag => {
    if (!xmlString.includes(`<${tag}>`) && !xmlString.includes(`<${tag} `)) {
      errors.push(`Nodo XML requerido ausente: <${tag}>`);
    }
  });

  // 3. Validar Longitud de Clave (50 dígitos exactos)
  const claveMatch = xmlString.match(/<Clave>(\d+)<\/Clave>/);
  if (claveMatch) {
    if (claveMatch[1].length !== 50) {
      errors.push(`La <Clave> debe tener exactamente 50 dígitos (obtenidos: ${claveMatch[1].length}).`);
    }
  } else {
    errors.push('No se encontró el elemento <Clave> numérico en el XML.');
  }

  // 4. Validar Longitud de Consecutivo (20 dígitos exactos)
  const consecutivoMatch = xmlString.match(/<NumeroConsecutivo>(\d+)<\/NumeroConsecutivo>/);
  if (consecutivoMatch) {
    if (consecutivoMatch[1].length !== 20) {
      errors.push(`El <NumeroConsecutivo> debe tener exactamente 20 dígitos (obtenidos: ${consecutivoMatch[1].length}).`);
    }
  } else {
    errors.push('No se encontró el elemento <NumeroConsecutivo> numérico en el XML.');
  }

  // 5. Validar presencia de código CAByS de 13 dígitos
  const cabysMatch = xmlString.match(/<CodigoCABYS>(\d+)<\/CodigoCABYS>/);
  if (cabysMatch) {
    if (cabysMatch[1].length !== 13) {
      errors.push(`El <CodigoCABYS> debe ser de 13 dígitos numéricos (obtenidos: ${cabysMatch[1].length}).`);
    }
  } else {
    errors.push('No se encontró el código CAByS en las líneas de detalle del XML.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
