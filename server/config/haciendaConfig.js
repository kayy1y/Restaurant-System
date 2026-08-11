/**
 * Configuración Segura de Integración Directa con Hacienda Costa Rica v4.4
 * Aísla credenciales, URLs, certificados y datos de emisor exclusivamente en Server-Side.
 */

import fs from 'fs';
import path from 'path';

// Cargar variables de entorno desde .env o .env.local si existen
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const val = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
} catch (e) {
  // Ignorar si no existe el archivo .env
}

export function getHaciendaConfig() {
  const env = process.env.HACIENDA_ENV || 'test';
  const isProd = env === 'production';

  return {
    env,
    isProd,
    username: process.env.HACIENDA_USERNAME || '',
    password: process.env.HACIENDA_PASSWORD || '',
    certPath: process.env.HACIENDA_CERT_PATH || 'server/certs/llave_firma_hacienda.p12',
    certPassword: process.env.HACIENDA_CERT_PASSWORD || '',

    tokenUrl: isProd
      ? (process.env.HACIENDA_TOKEN_URL_PROD || 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token')
      : (process.env.HACIENDA_TOKEN_URL_TEST || 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token'),

    apiUrl: isProd
      ? (process.env.HACIENDA_API_URL_PROD || 'https://api.comprobanteselectronicos.go.cr/recepcion/v1')
      : (process.env.HACIENDA_API_URL_TEST || 'https://api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1'),

    issuer: {
      name: process.env.ISSUER_NAME || 'La Vid Steak House & Pizza S.A.',
      commercialName: process.env.ISSUER_COMMERCIAL_NAME || 'La Vid Steak House & Pizza',
      idNumber: process.env.ISSUER_IDENTIFICATION || '310198765432',
      idType: process.env.ISSUER_IDENTIFICATION_TYPE || '02',
      activityCode: process.env.ISSUER_ACTIVITY_CODE || '551001',
      email: process.env.ISSUER_EMAIL || 'facturacion@lavidsteakhouse.cr',
      phone: process.env.ISSUER_PHONE || '24799988',
      province: process.env.ISSUER_PROVINCE || '2',
      canton: process.env.ISSUER_CANTON || '10',
      district: process.env.ISSUER_DISTRICT || '02',
      address: process.env.ISSUER_ADDRESS || 'La Fortuna, San Carlos, Alajuela, Costa Rica',
      branch: process.env.BRANCH_CODE || '001',
      terminal: process.env.TERMINAL_CODE || '00001'
    }
  };
}
