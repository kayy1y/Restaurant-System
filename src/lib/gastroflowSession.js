export const SESSION_STORAGE_KEY = 'gastroflow_active_session_v2';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStoredSession() {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token && parsed?.user?.id && parsed?.user?.role_id ? parsed : null;
  } catch (err) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function getStoredSessionToken() {
  return getStoredSession()?.token || '';
}

export function persistStoredSession(session) {
  if (!canUseStorage()) return;

  try {
    if (session?.token) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('No se pudo persistir la sesión local:', err);
  }
}

export function clearStoredSession() {
  persistStoredSession(null);
}
