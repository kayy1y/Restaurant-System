/**
 * Servicio de Autenticación, Roles, Permisos y Sesiones por Puesto
 * Maneja login por PIN corto (Laura 1234), validación de permisos DB y sesiones.
 */

import { dbGetAll, dbGet, dbPut, seedUnifiedDatabase } from './db';

let activeSession = null;

export async function initAuthModule() {
  await seedUnifiedDatabase();
}

/**
 * Autenticar empleado mediante Selección + Código PIN rápido
 */
export async function authenticateByPin(pinInput) {
  const users = await dbGetAll('users');
  const user = users.find(u => u.pin === pinInput.trim() && u.active);

  if (!user) {
    throw new Error('Código PIN incorrecto o usuario inactivo.');
  }

  const role = await dbGet('roles', user.role_id);
  const permissions = await getPermissionsForRole(user.role_id);

  activeSession = {
    user: { id: user.id, name: user.name, role_id: user.role_id },
    role: role,
    permissions: permissions.map(p => p.permission_id),
    loginTime: new Date().toISOString()
  };

  return activeSession;
}

/**
 * Obtener la sesión activa
 */
export function getActiveSession() {
  return activeSession;
}

/**
 * Cerrar Sesión
 */
export function logout() {
  activeSession = null;
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
 * Obtener todos los Usuarios
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

  if (!userData.pin || userData.pin.length < 4) {
    throw new Error('El código PIN debe tener al menos 4 dígitos numéricos.');
  }

  const userToSave = {
    id: userData.id || `usr-${Date.now()}`,
    name: userData.name.trim(),
    pin: userData.pin.trim(),
    role_id: userData.role_id || 'SALONERO',
    active: userData.active !== undefined ? userData.active : true
  };

  await dbPut('users', userToSave);
  return userToSave;
}
