/**
 * Generador Oficial de Clave Tributaria de 50 Dígitos (Costa Rica v4.4)
 * Anexo Técnico v4.4 Ministerio de Hacienda
 */

export function generateHaciendaKeyV44({
  idNumber = '310198765432',
  situacion = '1', // 1=Normal, 2=Sin Internet, 3=Sin Contingencia
  consecutivo,
  issueDate = new Date()
}) {
  if (!consecutivo || consecutivo.length !== 20) {
    throw new Error('El consecutivo fiscal debe contener exactamente 20 dígitos.');
  }

  const now = new Date(issueDate);
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const dateStr = `${day}${month}${year}`;

  const cleanId = idNumber.replace(/[^0-9]/g, '').padStart(12, '0');

  // Código de seguridad de 8 dígitos numéricos independiente del consecutivo
  const securityCodeNum = Math.floor(10000000 + Math.random() * 90000000);
  const securityCode = String(securityCodeNum);

  const clave = `506${dateStr}${cleanId}${situacion}${consecutivo}${securityCode}`;

  if (clave.length !== 50) {
    throw new Error(`La clave generada no cumple con los 50 dígitos exactos (${clave.length} dígitos).`);
  }

  return {
    clave,
    consecutivo,
    securityCode,
    countryCode: '506',
    dateStr,
    cleanId,
    situacion,
    issuedAt: now.toISOString()
  };
}
