import { createClient } from '@supabase/supabase-js';

// Validar que la URL sea una URL HTTP/HTTPS válida de Supabase
const isValidUrl = (url) => {
  try {
    if (!url || url.includes('PEGA_AQUI') || url.includes('YOUR_SUPABASE')) return false;
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

// 1. Buscar URL desde localStorage o desde variables de entorno
const resolveUrl = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const local = localStorage.getItem('GASTRO_SUPABASE_URL');
    if (local && isValidUrl(local)) return local.trim();
  }

  const env = import.meta.env || {};
  return (
    env.VITE_SUPABASE_URL ||
    env.VITE_SUPABASEURL ||
    env.SUPABASE_URL ||
    env.SUPABASEURL ||
    env.VITE_SUPABASE_PROJECT_URL ||
    ''
  ).trim();
};

// 2. Buscar Clave Pública desde localStorage, variables de entorno o fallback
const resolveKey = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const local = localStorage.getItem('GASTRO_SUPABASE_KEY');
    if (local && local.length > 5) return local.trim();
  }

  const env = import.meta.env || {};
  return (
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASEPUBLISHABLEKEY ||
    env.VITE_SUPABASEKEY ||
    env.SUPABASE_KEY ||
    env.SUPABASEKEY ||
    env.SUPABASE_ANON_KEY ||
    'sb_publishable_PRd-Uw-TDaPLrA77jsQ_gw_jqniz95Y'
  ).trim();
};

const activeUrl = resolveUrl();
const activeKey = resolveKey();

export const isSupabaseConfigured = Boolean(
  activeUrl && 
  activeKey && 
  isValidUrl(activeUrl)
);

export const supabase = isSupabaseConfigured
  ? createClient(activeUrl, activeKey)
  : null;

export const currentSupabaseUrl = activeUrl;
export const currentSupabaseKey = activeKey;

/**
 * Permite al usuario guardar su URL de Supabase directamente desde la pantalla de la web
 */
export function saveDynamicSupabaseCredentials(url, key) {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (url && isValidUrl(url)) {
      localStorage.setItem('GASTRO_SUPABASE_URL', url.trim());
    }
    if (key && key.trim().length > 5) {
      localStorage.setItem('GASTRO_SUPABASE_KEY', key.trim());
    }
    window.location.reload();
  }
}
