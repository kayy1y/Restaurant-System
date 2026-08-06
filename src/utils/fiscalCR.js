// Generador de Clave y Consecutivo Fiscal según Anexo Técnico v4.3 Ministerio de Hacienda Costa Rica

/**
 * Genera la clave de 50 dígitos para Costa Rica v4.3
 * Estructura:
 * - Código País: 506 (3 dígitos)
 * - Día, Mes, Año: DDMMAA (6 dígitos)
 * - Cédula Emisor: 12 dígitos (relleno ceros a la izquierda)
 * - Situación comprobante: 1 (Normal), 2 (Sin Internet), 3 (Sin contingencia)
 * - Consecutivo: 20 dígitos (Sucursal 3 + Terminal 5 + TipoDoc 2 + Secuencia 10)
 * - Código Seguridad: 8 dígitos numéricos aleatorios
 */
export function generateClaveFiscalCR({
  idNumber = "3101987654",
  branch = "001",
  terminal = "00001",
  docType = "01", // 01=FE, 03=TE, 04=NC, 05=ND
  sequence = 1
}) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const dateStr = `${day}${month}${year}`;

  const cleanId = idNumber.replace(/[^0-9]/g, '').padStart(12, '0');
  const situacion = "1"; // Normal

  const seqStr = String(sequence).padStart(10, '0');
  const consecutivo = `${branch}${terminal}${docType}${seqStr}`;

  const securityCode = String(Math.floor(10000000 + Math.random() * 90000000));

  const clave = `506${dateStr}${cleanId}${situacion}${consecutivo}${securityCode}`;

  return {
    clave,
    consecutivo,
    docType: docType === "01" ? "Factura Electrónica" : docType === "03" ? "Tiquete Electrónico" : "Nota de Crédito",
    formattedDate: `${now.toLocaleDateString('es-CR')} ${now.toLocaleTimeString('es-CR')}`
  };
}

/**
 * Calcula Impuesto IVA (13%) e Impuesto de Servicio Ley 5635 (10%)
 */
export function calculateTaxesCR(subtotal, isTableService = true) {
  const serviceTax = isTableService ? Math.round(subtotal * 0.10) : 0; // 10% Ley 5635
  const baseForIVA = subtotal;
  const ivaTax = Math.round(baseForIVA * 0.13); // 13% IVA
  const total = subtotal + serviceTax + ivaTax;

  return {
    subtotal,
    serviceTax,
    ivaTax,
    total
  };
}

/**
 * Genera el XML en formato oficial v4.3 del Ministerio de Hacienda de Costa Rica
 */
export function generateXMLFiscalCR(invoice, restaurantInfo) {
  return `<?xml version="1.0" encoding="utf-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica"
  xmlns:xsi="http://www.w3.org/2000/svg"
  xsi:schemaLocation="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica">
  <Clave>${invoice.clave}</Clave>
  <CodigoActividad>551001</CodigoActividad>
  <NumeroConsecutivo>${invoice.consecutivo}</NumeroConsecutivo>
  <FechaEmision>${invoice.date}</FechaEmision>
  <Emisor>
    <Nombre>${restaurantInfo.legalName}</Nombre>
    <Identificacion>
      <Tipo>02</Tipo>
      <Numero>${restaurantInfo.idNumber}</Numero>
    </Identificacion>
    <Ubicacion>
      <Provincia>1</Provincia>
      <Canton>01</Canton>
      <Distrito>01</Distrito>
      <OtrasSenas>${restaurantInfo.address}</OtrasSenas>
    </Ubicacion>
    <CorreoElectronico>${restaurantInfo.email}</CorreoElectronico>
  </Emisor>
  <Receptor>
    <Nombre>${invoice.customerName || "Cliente General"}</Nombre>
    <Identificacion>
      <Tipo>01</Tipo>
      <Numero>${invoice.customerId || "000000000"}</Numero>
    </Identificacion>
    <CorreoElectronico>${invoice.customerEmail || "cliente@servicio.cr"}</CorreoElectronico>
  </Receptor>
  <CondicionVenta>01</CondicionVenta>
  <MedioPago>${invoice.paymentMethod}</MedioPago>
  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>CRC</CodigoMoneda>
      <TipoCambio>1.00</TipoCambio>
    </CodigoTipoMoneda>
    <TotalServGravados>${invoice.subtotal}</TotalServGravados>
    <TotalGravado>${invoice.subtotal}</TotalGravado>
    <TotalVenta>${invoice.subtotal}</TotalVenta>
    <TotalImpuesto>${invoice.ivaTax + invoice.serviceTax}</TotalImpuesto>
    <TotalComprobante>${invoice.total}</TotalComprobante>
  </ResumenFactura>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <DigestValue>A98f12kKsl984j1h2s9K19==</DigestValue>
    </SignedInfo>
    <SignatureValue>SIMULATED_RSA_SHA256_COSTA_RICA_HACIENDA_v4.3_KEY</SignatureValue>
  </Signature>
</FacturaElectronica>`;
}
