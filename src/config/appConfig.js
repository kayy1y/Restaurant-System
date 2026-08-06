/**
 * Configuración Global de Entorno GastroFlow OS
 */

// MODO DE PRUEBAS CONTROLADO: Habilitar selector rápido de trabajador en desarrollo/demo.
// En Producción debe establecerse en `false` para restringir el cambio libre de rol.
export const MODO_PRUEBAS = true;

export const APP_INFO = {
  name: 'GastroFlow OS',
  version: '2.5.0-PROD',
  environment: MODO_PRUEBAS ? 'Desarrollo / Demostración' : 'Producción'
};
