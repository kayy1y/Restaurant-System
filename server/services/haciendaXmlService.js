/**
 * Generador Oficial de XML Comprobantes Electrónicos Costa Rica VERSIÓN 4.4
 * Cumple estrictamente con esquemas XSD v4.4 del Ministerio de Hacienda.
 * Incluye escapado XML seguro, redondeo tributario de 2 decimales y soporte CAByS.
 */

export function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatDecimal(val, decimals = 2) {
  const num = Number(val) || 0;
  return num.toFixed(decimals);
}

/**
 * Genera el XML oficial v4.4 para Factura o Tiquete Electrónico
 */
export function generateHaciendaXmlV44({
  invoice,
  issuer,
  customer,
  items = [],
  totals,
  docType = '01' // 01=FE, 03=TE, 04=NC
}) {
  const docRoot = docType === '03' ? 'TiqueteElectronico' : docType === '04' ? 'NotaCreditoElectronica' : 'FacturaElectronica';
  const namespace = `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/${docRoot.toLowerCase()}`;

  const formattedDate = new Date(invoice.issued_at || Date.now()).toISOString();

  let lineItemsXml = '';
  items.forEach((item, index) => {
    const lineNum = index + 1;
    const qty = formatDecimal(item.quantity || 1, 3);
    const unitPrice = formatDecimal(item.unit_price || item.price || 0, 5);
    const lineSubtotal = formatDecimal((item.unit_price || item.price || 0) * (item.quantity || 1), 2);
    const cabys = item.cabys_code || item.cabys || '6331000000000';
    const unitMeasure = item.unit_measure || 'Unid';
    const description = escapeXml(item.name || item.product_name || 'Consumo Restaurante');

    const lineIva = Math.round(Number(lineSubtotal) * 0.13 * 100) / 100;
    const lineTotal = formatDecimal(Number(lineSubtotal) + lineIva, 2);

    lineItemsXml += `
    <LineaDetalle>
      <NumeroLinea>${lineNum}</NumeroLinea>
      <CodigoCABYS>${escapeXml(cabys)}</CodigoCABYS>
      <Cantidad>${qty}</Cantidad>
      <UnidadMedida>${escapeXml(unitMeasure)}</UnidadMedida>
      <Detalle>${description}</Detalle>
      <PrecioUnitario>${unitPrice}</PrecioUnitario>
      <MontoTotal>${lineSubtotal}</MontoTotal>
      <SubTotal>${lineSubtotal}</SubTotal>
      <BaseImponible>${lineSubtotal}</BaseImponible>
      <Impuesto>
        <Codigo>01</Codigo>
        <CodigoTarifa>08</CodigoTarifa>
        <Tarifa>13.00</Tarifa>
        <Monto>${formatDecimal(lineIva, 2)}</Monto>
      </Impuesto>
      <MontoTotalLinea>${lineTotal}</MontoTotalLinea>
    </LineaDetalle>`;
  });

  const subtotalStr = formatDecimal(totals.subtotal || 0, 2);
  const taxIvaStr = formatDecimal(totals.tax_iva || totals.tax || 0, 2);
  const taxServiceStr = formatDecimal(totals.tax_service || totals.service_charge || 0, 2);
  const totalImpuestosStr = formatDecimal(Number(taxIvaStr) + Number(taxServiceStr), 2);
  const totalComprobanteStr = formatDecimal(totals.total || 0, 2);

  // Mapeo de medio de pago oficial v4.4 (01=Efectivo, 02=Tarjeta, 04=Transferencia/SINPE)
  const rawPaymentMethod = (invoice.payment_method || 'Tarjeta').toLowerCase();
  const medioPagoCode = rawPaymentMethod.includes('efectivo') ? '01' : rawPaymentMethod.includes('sinpe') ? '04' : '02';

  return `<?xml version="1.0" encoding="utf-8"?>
<${docRoot} xmlns="${namespace}"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="${namespace}">
  <Clave>${escapeXml(invoice.clave)}</Clave>
  <CodigoActividadEmisor>${escapeXml(issuer.activityCode || '551001')}</CodigoActividadEmisor>
  <NumeroConsecutivo>${escapeXml(invoice.consecutivo)}</NumeroConsecutivo>
  <FechaEmision>${formattedDate}</FechaEmision>
  <Emisor>
    <Nombre>${escapeXml(issuer.name)}</Nombre>
    <Identificacion>
      <Tipo>${escapeXml(issuer.idType || '02')}</Tipo>
      <Numero>${escapeXml(issuer.idNumber)}</Numero>
    </Identificacion>
    <NombreComercial>${escapeXml(issuer.commercialName || issuer.name)}</NombreComercial>
    <Ubicacion>
      <Provincia>${escapeXml(issuer.province || '2')}</Provincia>
      <Canton>${escapeXml(issuer.canton || '10')}</Canton>
      <Distrito>${escapeXml(issuer.district || '02')}</Distrito>
      <OtrasSenas>${escapeXml(issuer.address || 'La Fortuna, Costa Rica')}</OtrasSenas>
    </Ubicacion>
    <CorreoElectronico>${escapeXml(issuer.email || 'info@lavid.cr')}</CorreoElectronico>
  </Emisor>
  <Receptor>
    <Nombre>${escapeXml(customer.name || 'Cliente General')}</Nombre>
    <Identificacion>
      <Tipo>${escapeXml(customer.idType || '01')}</Tipo>
      <Numero>${escapeXml(customer.identification || '000000000')}</Numero>
    </Identificacion>
    <CorreoElectronico>${escapeXml(customer.email || 'cliente@lavid.cr')}</CorreoElectronico>
  </Receptor>
  <CondicionVenta>01</CondicionVenta>
  <MedioPago>${medioPagoCode}</MedioPago>
  <DetalleServicio>${lineItemsXml}
  </DetalleServicio>
  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>CRC</CodigoMoneda>
      <TipoCambio>1.00</TipoCambio>
    </CodigoTipoMoneda>
    <TotalServGravados>${subtotalStr}</TotalServGravados>
    <TotalGravado>${subtotalStr}</TotalGravado>
    <TotalVenta>${subtotalStr}</TotalVenta>
    <TotalImpuesto>${totalImpuestosStr}</TotalImpuesto>
    <TotalComprobante>${totalComprobanteStr}</TotalComprobante>
  </ResumenFactura>
</${docRoot}>`;
}
