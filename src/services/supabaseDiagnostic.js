import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export async function testSupabaseConnection() {
  const result = {
    isConfigured: isSupabaseConfigured,
    url: import.meta.env.VITE_SUPABASE_URL || 'No configurada',
    dbPingSuccess: false,
    dbPingMessage: '',
    realtimeActive: false,
    tablesFound: [],
    timestamp: new Date().toLocaleTimeString('es-CR')
  };

  if (!isSupabaseConfigured || !supabase) {
    result.dbPingMessage = 'Faltan credenciales válidas en .env.local o VITE_SUPABASE_URL aún contiene marcas de posición.';
    return result;
  }

  try {
    const { data, error } = await supabase
      .from('mesas')
      .select('count', { count: 'exact' });

    if (error) {
      result.dbPingMessage = `Error consultando tabla 'mesas': ${error.message}. Verifica haber ejecutado el script SQL en Supabase.`;
    } else {
      result.dbPingSuccess = true;
      result.dbPingMessage = `¡Conexión a Supabase exitosa! Base de datos de PostgreSQL respondiendo correctamente.`;
    }
  } catch (err) {
    result.dbPingMessage = `Excepción conectando a Supabase: ${err.message}`;
  }

  return result;
}
