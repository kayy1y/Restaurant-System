import { createClient } from '@supabase/supabase-js';
import { getStoredSessionToken } from './gastroflowSession.js';

const env = import.meta.env || {};

export const supabaseUrl = (
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

export const supabaseKey = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

async function gastroflowSessionFetch(input, init = {}) {
  const token = getStoredSessionToken();
  const requestHeaders = input instanceof Request ? input.headers : undefined;
  const headers = new Headers(init.headers || requestHeaders || {});

  if (token) {
    headers.set('x-gastroflow-session', token);
  } else {
    headers.delete('x-gastroflow-session');
  }

  return fetch(input, {
    ...init,
    headers
  });
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      },
      global: {
        fetch: gastroflowSessionFetch
      }
    })
  : null;
