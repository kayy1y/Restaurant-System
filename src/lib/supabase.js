import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Validar que la URL sea una URL HTTP/HTTPS válida de Supabase
const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  rawUrl && 
  rawKey && 
  isValidUrl(rawUrl) && 
  !rawUrl.includes('PEGA_AQUI')
);

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawKey)
  : null;
