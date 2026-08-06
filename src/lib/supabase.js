import { createClient } from '@supabase/supabase-js';

// URL y Clave Pública Oficiales para GastroFlow OS en Supabase
const DEFAULT_SUPABASE_URL = 'https://dxgchsqewihqgwfkuzxs.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_PRd-Uw-TDaPLrA77jsQ_gw_jqniz95Y';

// Resolver URL buscando en NEXT_PUBLIC_..., VITE_... o fallback directo
const resolveUrl = () => {
  const env = import.meta.env || {};
  const processEnv = typeof process !== 'undefined' ? process.env || {} : {};

  return (
    env.NEXT_PUBLIC_SUPABASE_URL ||
    processEnv.NEXT_PUBLIC_SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    env.VITE_SUPABASEURL ||
    env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).trim();
};

// Resolver Clave Pública buscando en NEXT_PUBLIC_..., VITE_... o fallback directo
const resolveKey = () => {
  const env = import.meta.env || {};
  const processEnv = typeof process !== 'undefined' ? process.env || {} : {};

  return (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    processEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASEKEY ||
    env.SUPABASE_KEY ||
    DEFAULT_SUPABASE_KEY
  ).trim();
};

export const supabaseUrl = resolveUrl();
export const supabaseKey = resolveKey();

export const supabase = createClient(supabaseUrl, supabaseKey);
export const isSupabaseConfigured = true;
