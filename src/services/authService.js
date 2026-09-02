/**
 * Servicio de Autenticación, Roles, Permisos y Sesiones por Puesto (GastroFlow OS)
 * Maneja autenticación segura de usuarios, hash de PIN (SHA-256), límites de intentos (brute-force prevention)
 * y validación dinámica de autorizaciones de Gerencia/Administración sin claves hardcodeadas.
 */

import { dbGetAll, dbGet, dbPut, dbDelete, seedUnifiedDatabase } from './db.js';

let activeSession = null;
const SESSION_STORAGE_KEY = 'gastroflow_active_session_v1';

// Mapa en memoria para prevención de fuerza bruta: { [key]: { attempts: number, lockedUntil: number } }
const failedAttemptsMap = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 segundos de bloqueo tras 5 intentos fallidos

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function persistSession(session) {
  if (!canUseStorage()) return;

  try {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('No se pudo persistir la sesión local:', err);
  }
}

function restorePersistedSession() {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.user?.id || !parsed?.user?.role_id) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch (err) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    console.warn('No se pudo restaurar la sesión persistida:', err);
    return null;
  }
}

export async function initAuthModule() {
  await seedUnifiedDatabase();
}

/**
 * Función para generar Hash SHA-256 seguro de un código PIN
 */
export async function hashPin(pin) {
  if (!pin) return '';
  const cleanPin = String(pin).trim();
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgBuffer = new TextEncoder().encode(cleanPin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback si falla crypto.subtle
    }
  }
  let hash = 0;
  for (let i = 0; i < cleanPin.length; i++) {
    const char = cleanPin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

/**
 * Verifica si un PIN ingresado coincide con el PIN almacenado (sea plano o hashed)
 */
export async function verifyPinMatch(inputPin, storedPinOrHash) {
  if (!inputPin || !storedPinOrHash) return false;
  const cleanInput = String(inputPin).trim();
  const cleanStored = String(storedPinOrHash).trim();

  // Coincidencia directa (PIN en texto plano heredado)
  if (cleanInput === cleanStored) return true;

  // Coincidencia con hash SHA-256
  const hashedInput = await hashPin(cleanInput);
  return hashedInput === cleanStored;
}

/**
 * Verifica y gestiona intentos fallidos de autenticación (Rate-Limiting)
 */
function checkRateLimit(key) {
  const record = failedAttemptsMap.get(key);
  const now = Date.now();
  if (record && record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    throw new Error(`Demasiados intentos fallidos. Acceso bloqueado por ${remainingSec} segundos por seguridad.`);
  }
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const record = failedAttemptsMap.get(key) || { attempts: 0, lockedUntil: 0 };
  record.attempts += 1;
  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    record.attempts = 0;
  }
  failedAttemptsMap.set(key, record);
}

function resetFailedAttempts(key) {
  failedAttemptsMap.delete(key);
}

/**
 * Autenticar empleado mediante Selección de Usuario y/o Código PIN
 */
export async function authenticateByPin(pinInput, targetUserId = null) {
  if (!pinInput || String(pinInput).trim().length < 4) {
    throw new Error('El código PIN debe ser de al menos 4 dígitos numéricos.');
  }

  const rateKey = targetUserId ? `user_${targetUserId}` : `pin_${pinInput}`;
  checkRateLimit(rateKey);

  const users = await dbGetAll('users');
  let user = null;

  if (targetUserId) {
    const foundUser = users.find(u => u.id === targetUserId && u.active);
    if (!foundUser) {
      throw new Error('El usuario seleccionado no existe o está inactivo.');
    }
    const matches = await verifyPinMatch(pinInput, foundUser.pin);
    if (matches) {
      user = foundUser;
    }
  } else {
    for (const u of users) {
      if (!u.active) continue;
      const matches = await verifyPinMatch(pinInput, u.pin);
      if (matches) {
        user = u;
        break;
      }
    }
  }

  if (!user) {
    recordFailedAttempt(rateKey);
    throw new Error('Código PIN incorrecto o usuario sin permisos activos.');
  }

  resetFailedAttempts(rateKey);

  const role = await dbGet('roles', user.role_id);
  const permissions = await getPermissionsForRole(user.role_id);

  activeSession = {
    user: { id: user.id, name: user.name, role_id: user.role_id },
    role: role || { id: user.role_id, name: user.role_id },
    permissions: permissions.map(p => p.permission_id),
    loginTime: new Date().toISOString()
  };
  persistSession(activeSession);

  return activeSession;
}

/**
 * Valida un PIN de autorización de Gerente o Administrador en tiempo real contra la base de datos
 */
export async function validateAuthorizationPin(pinInput, allowedRoleIds = ['ADMINISTRADOR', 'GERENTE']) {
  if (!pinInput || String(pinInput).trim().length < 4) {
    return {
      valid: false,
      user: null,
      error: 'Se requiere un código PIN de autorización de 4 dígitos.'
    };
  }

  const rateKey = `auth_manager_pin`;
  try {
    checkRateLimit(rateKey);
  } catch (err) {
    return { valid: false, user: null, error: err.message };
  }

  const users = await dbGetAll('users');
  const normalizedAllowedRoles = allowedRoleIds.map(r => String(r).toUpperCase());

  // Buscar si el PIN pertenece a algún usuario activo con rol autorizado
  for (const user of users) {
    if (!user.active) continue;

    const userRole = String(user.role_id).toUpperCase();
    const isAuthorizedRole = userRole === 'ADMINISTRADOR' || normalizedAllowedRoles.includes(userRole);

    if (isAuthorizedRole) {
      const isMatch = await verifyPinMatch(pinInput, user.pin);
      if (isMatch) {
        resetFailedAttempts(rateKey);
        return {
          valid: true,
          user: { id: user.id, name: user.name, role_id: user.role_id },
          error: null
        };
      }
    }
  }

  recordFailedAttempt(rateKey);
  return {
    valid: false,
    user: null,
    error: 'PIN de autorización no válido. Debe ingresar el PIN de un Administrador o Gerente activo.'
  };
}

/**
 * Valida si un PIN ingresado pertenece exclusivamente a un Administrador General activo
 */
export async function validateAdminPin(pinInput) {
  return await validateAuthorizationPin(pinInput, ['ADMINISTRADOR']);
}

/**
 * Obtener la sesión activa
 */
export function getActiveSession() {
  if (!activeSession) {
    activeSession = restorePersistedSession();
  }
  return activeSession;
}

/**
 * Cerrar Sesión
 */
export function logout() {
  activeSession = null;
  persistSession(null);
}

/**
 * Consultar si un Rol específico posee un Permiso determinado en la DB
 */
export async function hasPermission(roleId, permissionId) {
  if (roleId === 'ADMINISTRADOR') return true; // Administrador posee control total

  const rolePermissions = await dbGetAll('role_permissions');
  return rolePermissions.some(rp => rp.role_id === roleId && rp.permission_id === permissionId);
}

/**
 * Obtener la lista de permisos de un Rol desde la DB
 */
export async function getPermissionsForRole(roleId) {
  const rolePermissions = await dbGetAll('role_permissions');
  return rolePermissions.filter(rp => rp.role_id === roleId);
}

/**
 * Obtener todos los Usuarios con información contextual de roles
 */
export async function getAllUsers() {
  const users = await dbGetAll('users');
  const roles = await dbGetAll('roles');

  return users.map(u => {
    const roleObj = roles.find(r => r.id === u.role_id);
    return {
      ...u,
      role_name: roleObj ? roleObj.name : u.role_id
    };
  });
}

/**
 * Crear o Editar Usuario (Solo Administrador)
 */
export async function saveUser(userData, currentAdminRoleId) {
  if (currentAdminRoleId !== 'ADMINISTRADOR') {
    throw new Error('Solo un Administrador General puede crear o modificar usuarios y PINs.');
  }

  if (!userData.name || !userData.name.trim()) {
    throw new Error('El nombre de usuario es obligatorio.');
  }

  if (!userData.pin || String(userData.pin).trim().length < 4) {
    throw new Error('El código PIN debe tener al menos 4 dígitos numéricos.');
  }

  const cleanPin = String(userData.pin).trim();
  let finalPin = cleanPin;

  // Si no es un hash SHA-256 de 64 caracteres hexa, lo hasheamos para guardarlo seguro
  if (!/^[a-f0-9]{64}$/i.test(cleanPin)) {
    finalPin = await hashPin(cleanPin);
  }

  const userToSave = {
    id: userData.id || `usr-${Date.now()}`,
    name: userData.name.trim(),
    pin: finalPin,
    role_id: userData.role_id || 'SALONERO',
    active: userData.active !== undefined ? userData.active : true,
    updated_at: new Date().toISOString()
  };

  await dbPut('users', userToSave);
  return userToSave;
}

/**
 * Cambiar estado de activación de un usuario
 */
export async function toggleUserStatus(userId, currentAdminRoleId) {
  if (currentAdminRoleId !== 'ADMINISTRADOR') {
    throw new Error('Solo un Administrador General puede activar o desactivar usuarios.');
  }

  const user = await dbGet('users', userId);
  if (!user) throw new Error('Usuario no encontrado.');

  user.active = !user.active;
  user.updated_at = new Date().toISOString();
  await dbPut('users', user);
  return user;
}

/**
 * Eliminar Usuario (Solo Administrador)
 */
export async function deleteUser(userId, currentAdminRoleId) {
  if (currentAdminRoleId !== 'ADMINISTRADOR') {
    throw new Error('Solo un Administrador General puede eliminar usuarios.');
  }

  if (userId === 'usr-admin') {
    throw new Error('No se puede eliminar el usuario Administrador Principal del sistema.');
  }

  await dbDelete('users', userId);
  return true;
}
