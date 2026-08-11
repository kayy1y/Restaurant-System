/**
 * Servicio de Autenticación OAuth2 Directa con el IdP del Ministerio de Hacienda de Costa Rica
 * Endpoint: idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token
 * Almacena el token exclusivamente en memoria de servidor (Server-Side).
 */

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getHaciendaBearerToken(config, forceRefresh = false) {
  const now = Date.now();

  // Si existe token cargado y aún no expira (con margen de 30 segundos)
  if (!forceRefresh && cachedToken && now < (tokenExpiresAt - 30000)) {
    return cachedToken;
  }

  const username = config.username;
  const password = config.password;
  const tokenUrl = config.tokenUrl;

  if (!username || !password) {
    if (config.env === 'test') {
      // En Sandbox / Modo Pruebas sin usuario configurado, retorna token simulación test
      cachedToken = `TEST_OAUTH2_BEARER_TOKEN_HACIENDA_ATV_${Date.now()}`;
      tokenExpiresAt = now + 300000; // 5 minutos
      return cachedToken;
    } else {
      const err = new Error('AUTH_ERROR: Falta configurar HACIENDA_USERNAME o HACIENDA_PASSWORD en el servidor.');
      err.code = 'AUTH_ERROR';
      throw err;
    }
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', 'api-stl');
    params.append('username', username);
    params.append('password', password);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`AUTH_ERROR (HTTP ${response.status}): Error de autenticación en Hacienda IdP. ${errorText}`);
      err.code = 'AUTH_ERROR';
      throw err;
    }

    const data = await response.json();
    cachedToken = data.access_token;
    const expiresInMs = (data.expires_in || 300) * 1000;
    tokenExpiresAt = Date.now() + expiresInMs;

    return cachedToken;
  } catch (error) {
    if (config.env === 'test') {
      cachedToken = `TEST_FALLBACK_TOKEN_${Date.now()}`;
      tokenExpiresAt = now + 300000;
      return cachedToken;
    }
    throw error;
  }
}
