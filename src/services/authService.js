import {
  dbDelete,
  dbGet,
  dbGetAll,
  dbPut,
  ROLE_PERMISSIONS_MAPPING,
  seedUnifiedDatabase
} from './db.js';
import {
  clearStoredSession,
  getStoredSession,
  persistStoredSession
} from '../lib/gastroflowSession.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

let activeSession = getStoredSession();

function canUseRemoteAuth() {
  return Boolean(isSupabaseConfigured && supabase);
}

function normalizeRoleId(roleId = '') {
  return String(roleId || '').trim().toUpperCase();
}

function normalizeUserRecord(record = {}) {
  return {
    id: record.id,
    name: record.name || record.nombre || 'Usuario',
    role_id: normalizeRoleId(record.role_id || record.rol),
    active: record.active ?? record.activo ?? true,
    created_at: record.created_at || record.creado_en || null
  };
}

function buildPermissions(roleId) {
  const normalizedRole = normalizeRoleId(roleId);
  if (normalizedRole === 'ADMINISTRADOR') {
    return ROLE_PERMISSIONS_MAPPING.map(item => item.permission_id);
  }

  return ROLE_PERMISSIONS_MAPPING
    .filter(item => item.role_id === normalizedRole)
    .map(item => item.permission_id);
}

function buildSessionPayload(remotePayload = {}, persistedToken = '') {
  const user = normalizeUserRecord(remotePayload.user || remotePayload);
  const token = remotePayload.token || persistedToken;
  const permissions = remotePayload.permissions || buildPermissions(user.role_id);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      role_id: user.role_id
    },
    role: {
      id: user.role_id,
      name: user.role_id
    },
    permissions,
    loginTime: remotePayload.loginTime || remotePayload.login_time || new Date().toISOString()
  };
}

async function callRpc(functionName, params) {
  if (!canUseRemoteAuth()) {
    throw new Error('Supabase no está configurado para autenticación remota.');
  }

  const { data, error } = params
    ? await supabase.rpc(functionName, params)
    : await supabase.rpc(functionName);

  if (error) {
    throw new Error(error.message || `Error ejecutando ${functionName}.`);
  }

  return data;
}

async function fallbackAuthenticateByPin(pinInput, targetUserId = null) {
  const users = await dbGetAll('users');
  const cleanPin = String(pinInput || '').trim();
  const normalizedTarget = String(targetUserId || '').trim();

  const user = users.find(candidate => {
    if (!candidate?.active) return false;
    if (normalizedTarget && candidate.id !== normalizedTarget) return false;
    return String(candidate.pin || '').trim() === cleanPin;
  });

  if (!user) {
    throw new Error('Código PIN incorrecto o usuario sin permisos activos.');
  }

  const session = {
    token: '',
    user: {
      id: user.id,
      name: user.name,
      role_id: normalizeRoleId(user.role_id)
    },
    role: {
      id: normalizeRoleId(user.role_id),
      name: normalizeRoleId(user.role_id)
    },
    permissions: buildPermissions(user.role_id),
    loginTime: new Date().toISOString()
  };

  activeSession = session;
  persistStoredSession(session);
  return session;
}

export async function initAuthModule() {
  await seedUnifiedDatabase();
  if (canUseRemoteAuth() && getStoredSession()?.token) {
    try {
      return await refreshActiveSession();
    } catch (err) {
      logout();
    }
  }
  return getActiveSession();
}

export async function hashPin(pin) {
  if (!pin) return '';

  const cleanPin = String(pin).trim();
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cleanPin));
    return Array.from(new Uint8Array(buffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  return cleanPin;
}

export async function verifyPinMatch(inputPin, storedPinOrHash) {
  if (!inputPin || !storedPinOrHash) return false;
  const cleanInput = String(inputPin).trim();
  const cleanStored = String(storedPinOrHash).trim();
  if (cleanInput === cleanStored) return true;
  return (await hashPin(cleanInput)) === cleanStored;
}

export async function authenticateByPin(pinInput, targetUserId = null) {
  if (!pinInput || String(pinInput).trim().length < 4) {
    throw new Error('El código PIN debe ser de al menos 4 dígitos numéricos.');
  }

  if (!canUseRemoteAuth()) {
    return fallbackAuthenticateByPin(pinInput, targetUserId);
  }

  const remoteSession = await callRpc('gastroflow_pin_login', {
    p_pin: String(pinInput).trim(),
    p_perfil_id: targetUserId || null
  });

  const session = buildSessionPayload(remoteSession);
  activeSession = session;
  persistStoredSession(session);
  return session;
}

export async function refreshActiveSession() {
  const persisted = getStoredSession();
  if (canUseRemoteAuth() && !persisted?.token) {
    activeSession = null;
    clearStoredSession();
    return null;
  }

  if (!persisted?.token || !canUseRemoteAuth()) {
    activeSession = persisted || null;
    return activeSession;
  }

  try {
    const remoteSession = await callRpc('gastroflow_session_me');
    const session = buildSessionPayload(remoteSession, persisted.token);
    activeSession = session;
    persistStoredSession(session);
    return session;
  } catch (err) {
    logout();
    return null;
  }
}

export async function validateAuthorizationPin(pinInput, allowedRoleIds = ['ADMINISTRADOR', 'GERENTE']) {
  if (!pinInput || String(pinInput).trim().length < 4) {
    return {
      valid: false,
      user: null,
      error: 'Se requiere un código PIN de autorización de 4 dígitos.'
    };
  }

  if (!canUseRemoteAuth()) {
    const users = await dbGetAll('users');
    const normalizedAllowed = allowedRoleIds.map(normalizeRoleId);
    const match = users.find(user =>
      user.active &&
      normalizedAllowed.includes(normalizeRoleId(user.role_id)) &&
      String(user.pin || '').trim() === String(pinInput).trim()
    );

    return match
      ? {
          valid: true,
          user: {
            id: match.id,
            name: match.name,
            role_id: normalizeRoleId(match.role_id)
          },
          error: null
        }
      : {
          valid: false,
          user: null,
          error: 'PIN de autorización no válido.'
        };
  }

  try {
    const result = await callRpc('gastroflow_validate_authorization_pin', {
      p_pin: String(pinInput).trim(),
      p_allowed_roles: allowedRoleIds.map(normalizeRoleId)
    });

    return {
      valid: Boolean(result?.valid),
      user: result?.user ? normalizeUserRecord(result.user) : null,
      error: result?.error || null
    };
  } catch (err) {
    return {
      valid: false,
      user: null,
      error: err.message || 'No fue posible validar el PIN.'
    };
  }
}

export async function validateAdminPin(pinInput) {
  return validateAuthorizationPin(pinInput, ['ADMINISTRADOR']);
}

export function getActiveSession() {
  if (!activeSession) {
    const persisted = getStoredSession();
    if (canUseRemoteAuth() && persisted && !persisted.token) {
      clearStoredSession();
      activeSession = null;
      return null;
    }
    activeSession = persisted;
  }
  return activeSession;
}

export function logout() {
  if (canUseRemoteAuth() && getStoredSession()?.token) {
    callRpc('gastroflow_logout').catch(() => {});
  }
  activeSession = null;
  clearStoredSession();
}

export async function hasPermission(roleId, permissionId) {
  return buildPermissions(roleId).includes(permissionId);
}

export async function getPermissionsForRole(roleId) {
  return buildPermissions(roleId).map(permission_id => ({ role_id: normalizeRoleId(roleId), permission_id }));
}

export async function getAllUsers() {
  if (canUseRemoteAuth()) {
    const isAdminSession = normalizeRoleId(getActiveSession()?.user?.role_id) === 'ADMINISTRADOR';
    const functionName = isAdminSession ? 'gastroflow_list_profiles_admin' : 'gastroflow_list_login_profiles';
    const rows = await callRpc(functionName);
    return (rows || []).map(row => {
      const normalized = normalizeUserRecord(row);
      return {
        ...normalized,
        role_name: normalized.role_id
      };
    });
  }

  const users = await dbGetAll('users');
  const roles = await dbGetAll('roles');

  return users.map(user => {
    const role = roles.find(item => item.id === user.role_id);
    return {
      ...user,
      role_name: role ? role.name : user.role_id
    };
  });
}

export async function saveUser(userData, currentAdminRoleId) {
  if (normalizeRoleId(currentAdminRoleId) !== 'ADMINISTRADOR') {
    throw new Error('Solo un Administrador General puede crear o modificar usuarios y PINs.');
  }

  if (!userData.name || !userData.name.trim()) {
    throw new Error('El nombre de usuario es obligatorio.');
  }

  if (!canUseRemoteAuth()) {
    const userToSave = {
      id: userData.id || `usr-${Date.now()}`,
      name: userData.name.trim(),
      pin: await hashPin(userData.pin),
      role_id: normalizeRoleId(userData.role_id || 'SALONERO'),
      active: userData.active !== false,
      updated_at: new Date().toISOString()
    };
    await dbPut('users', userToSave);
    return userToSave;
  }

  const result = await callRpc('gastroflow_admin_upsert_profile', {
    p_profile: {
      id: userData.id || null,
      nombre: userData.name.trim(),
      pin: userData.pin || '',
      rol: normalizeRoleId(userData.role_id || 'SALONERO'),
      activo: userData.active !== false
    }
  });

  return normalizeUserRecord(result);
}

export async function toggleUserStatus(userId, currentAdminRoleId) {
  if (normalizeRoleId(currentAdminRoleId) !== 'ADMINISTRADOR') {
    throw new Error('Solo un Administrador General puede activar o desactivar usuarios.');
  }

  if (!canUseRemoteAuth()) {
    const user = await dbGet('users', userId);
    if (!user) throw new Error('Usuario no encontrado.');
    user.active = !user.active;
    user.updated_at = new Date().toISOString();
    await dbPut('users', user);
    return user;
  }

  const result = await callRpc('gastroflow_admin_toggle_profile', {
    p_profile_id: userId
  });

  return normalizeUserRecord(result);
}

export async function deleteUser(userId, currentAdminRoleId) {
  if (normalizeRoleId(currentAdminRoleId) !== 'ADMINISTRADOR') {
    throw new Error('Solo un Administrador General puede eliminar usuarios.');
  }

  if (!canUseRemoteAuth()) {
    await dbDelete('users', userId);
    return true;
  }

  await callRpc('gastroflow_admin_delete_profile', {
    p_profile_id: userId
  });
  return true;
}
