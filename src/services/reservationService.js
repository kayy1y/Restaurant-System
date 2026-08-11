/**
 * Servicio del Módulo de Reservas de Mesas La Vid Steak House & Pizza
 * Soporta Reservas Internas, tiempo real Costa Rica (America/Costa_Rica),
 * prevención de choques de horarios, estado dinámico de mesas y API preparada para integración Web.
 */

import { dbGetAll, dbGet, dbPut, dbDelete } from './db.js';
import { liveSync } from './liveSync.js';

export const RESERVATION_STATUSES = [
  { id: 'confirmada', label: 'Confirmada', color: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50' },
  { id: 'pendiente', label: 'Pendiente', color: 'bg-amber-950/40 text-amber-300 border-amber-500/50' },
  { id: 'cliente_llego', label: 'Cliente llegó', color: 'bg-sky-950/40 text-sky-300 border-sky-500/50' },
  { id: 'sentado', label: 'Sentado', color: 'bg-stone-800 text-stone-300 border-stone-600' },
  { id: 'completada', label: 'Completada', color: 'bg-stone-900 text-stone-400 border-stone-700' },
  { id: 'cancelada', label: 'Cancelada', color: 'bg-rose-950/40 text-rose-300 border-rose-500/50' },
  { id: 'no_se_presento', label: 'No se presentó', color: 'bg-rose-900/60 text-rose-300 border-rose-700' }
];

export const ESTIMATED_DURATIONS = [
  { id: 30, label: '30 minutos' },
  { id: 60, label: '1 hora' },
  { id: 90, label: '1 hora 30 minutos', default: true },
  { id: 120, label: '2 horas' },
  { id: 150, label: '2 horas 30 minutos' },
  { id: 180, label: '3 horas' }
];

/**
 * Obtener la hora actual formateada en Zona Horaria de Costa Rica (America/Costa_Rica)
 */
export function getCostaRicaNow() {
  const now = new Date();
  const crTimeString = now.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' });
  return new Date(crTimeString);
}

/**
 * Convertir Fecha (YYYY-MM-DD) y Hora (HH:MM) a un Date en zona horaria local
 */
export function buildCRDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Consultar todas las reservas
 */
export async function getAllReservations() {
  try {
    const list = await dbGetAll('reservations');
    return list.sort((a, b) => new Date(a.fecha_hora_inicio) - new Date(b.fecha_hora_inicio));
  } catch (err) {
    return [];
  }
}

/**
 * Prevenir doble reserva en horarios superpuestos (con amortiguador opcional de 15 minutos)
 */
export async function checkTableAvailability(tableId, startISO, endISO, excludeResId = null) {
  const allReservations = await getAllReservations();
  const targetStart = new Date(startISO).getTime();
  const targetEnd = new Date(endISO).getTime();
  const BUFFER_MS = 15 * 60 * 1000; // 15 min buffer entre reservas

  const activeReservations = allReservations.filter(r => 
    r.id_mesa === tableId && 
    r.estado !== 'cancelada' && 
    r.estado !== 'no_se_presento' &&
    r.estado !== 'completada' &&
    r.id_reserva !== excludeResId
  );

  for (const res of activeReservations) {
    const resStart = new Date(res.fecha_hora_inicio).getTime() - BUFFER_MS;
    const resEnd = new Date(res.fecha_hora_fin).getTime() + BUFFER_MS;

    // Verificar si se traslapan los rangos de tiempo
    if (targetStart < resEnd && targetEnd > resStart) {
      return {
        available: false,
        conflictingReservation: res,
        message: `La mesa ya tiene una reserva activa para ${res.nombre_cliente} de ${new Date(res.fecha_hora_inicio).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })} a ${new Date(res.fecha_hora_fin).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}.`
      };
    }
  }

  return { available: true };
}

/**
 * Filtrar únicamente las mesas reales disponibles para una fecha, hora y cantidad de personas
 */
export async function getAvailableTablesForTimeSlot(allTables, dateStr, timeStr, durationMinutes = 90, dinersCount = 1, excludeResId = null) {
  const startDate = buildCRDateTime(dateStr, timeStr);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const availableTables = [];

  for (const table of allTables) {
    // Filtrar por capacidad
    if (table.capacity && table.capacity < dinersCount) continue;

    const check = await checkTableAvailability(table.id, startISO, endISO, excludeResId);
    if (check.available) {
      availableTables.push(table);
    }
  }

  return availableTables;
}

/**
 * Crear o Actualizar una Reserva (Fase 1 Interna + Preparada para Fase 2 Web)
 */
export async function saveReservation(resData, currentUser = 'Personal Interno') {
  if (!resData.nombre_cliente || !resData.nombre_cliente.trim()) {
    throw new Error('El nombre del cliente es obligatorio.');
  }
  if (!resData.telefono || !resData.telefono.trim()) {
    throw new Error('El teléfono del cliente es obligatorio.');
  }
  if (!resData.id_mesa) {
    throw new Error('Debe seleccionar una mesa real del restaurante.');
  }
  if (!resData.fecha || !resData.hora) {
    throw new Error('Debe seleccionar la fecha y hora de la reserva.');
  }

  const durationMin = parseInt(resData.duracion_minutos) || 90;
  const startDate = buildCRDateTime(resData.fecha, resData.hora);
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const resId = resData.id_reserva || `res-${Date.now()}`;
  
  // Validar choques de horarios en tiempo real
  const availabilityCheck = await checkTableAvailability(resData.id_mesa, startISO, endISO, resId);
  if (!availabilityCheck.available) {
    throw new Error(availabilityCheck.message);
  }

  const nowISO = new Date().toISOString();

  const reservationObj = {
    id_reserva: resId,
    id_mesa: resData.id_mesa,
    nombre_cliente: resData.nombre_cliente.trim(),
    telefono: resData.telefono.trim(),
    cantidad_personas: parseInt(resData.cantidad_personas) || 2,
    fecha: resData.fecha,
    hora: resData.hora,
    duracion_minutos: durationMin,
    fecha_hora_inicio: startISO,
    fecha_hora_fin: endISO,
    estado: resData.estado || 'confirmada', // confirmada, pendiente, cliente_llego, sentado, completada, cancelada, no_se_presento
    observaciones: resData.observaciones || '',
    origen: resData.origen || 'INTERNO', // INTERNO o WEB
    creado_por: resData.creado_por || currentUser,
    fecha_creacion: resData.fecha_creacion || nowISO,
    fecha_actualizacion: nowISO
  };

  await dbPut('reservations', reservationObj);

  // Emitir evento en tiempo real para sincronizar todas las tablets y pantallas al instante
  liveSync.notify('RESERVATION_UPDATED', reservationObj);

  return reservationObj;
}

/**
 * Cancelar Reserva (Sin eliminar del historial)
 */
export async function cancelReservation(reservationId, currentUser = 'Personal Interno') {
  const res = await dbGet('reservations', reservationId);
  if (!res) throw new Error('Reserva no encontrada.');

  res.estado = 'cancelada';
  res.fecha_actualizacion = new Date().toISOString();

  await dbPut('reservations', res);
  liveSync.notify('RESERVATION_UPDATED', res);
  return res;
}

/**
 * Cambiar estado de la reserva (ej. 'cliente_llego', 'sentado')
 */
export async function updateReservationStatus(reservationId, newStatus) {
  const res = await dbGet('reservations', reservationId);
  if (!res) throw new Error('Reserva no encontrada.');

  res.estado = newStatus;
  res.fecha_actualizacion = new Date().toISOString();

  await dbPut('reservations', res);
  liveSync.notify('RESERVATION_UPDATED', res);
  return res;
}

/**
 * Calcular el estado temporal de una mesa combinando la orden activa POS con la hora real y reservas de hoy
 */
export function getTableReservationDetails(tableId, activeOrder, allReservations = []) {
  const now = new Date();
  const IMMINENT_WINDOW_MS = 30 * 60 * 1000; // 30 minutos antes

  const tableReservations = allReservations.filter(r => 
    r.id_mesa === tableId && 
    r.estado !== 'cancelada' && 
    r.estado !== 'no_se_presento' &&
    r.estado !== 'completada'
  );

  let currentReservation = null;
  let upcomingReservation = null;
  let conflictAlert = null;

  for (const res of tableReservations) {
    const resStart = new Date(res.fecha_hora_inicio).getTime();
    const resEnd = new Date(res.fecha_hora_fin).getTime();
    const nowTime = now.getTime();

    // 1. Reserva activa en desarrollo
    if (nowTime >= resStart && nowTime <= resEnd && res.estado !== 'sentado') {
      currentReservation = res;
    } 
    // 2. Reserva próxima (dentro de los próximos 30 min)
    else if (nowTime < resStart && (resStart - nowTime) <= IMMINENT_WINDOW_MS) {
      upcomingReservation = res;
    }
    // 3. Reserva futura hoy
    else if (nowTime < resStart && new Date(res.fecha_hora_inicio).toDateString() === now.toDateString()) {
      if (!upcomingReservation || resStart < new Date(upcomingReservation.fecha_hora_inicio).getTime()) {
        upcomingReservation = res;
      }
    }
  }

  // Detectar Conflicto: Si la mesa está ocupada y se acerca una reserva en los próximos 30 minutos o activa
  if (activeOrder && (currentReservation || (upcomingReservation && (new Date(upcomingReservation.fecha_hora_inicio).getTime() - now.getTime()) <= IMMINENT_WINDOW_MS))) {
    const conflictRes = currentReservation || upcomingReservation;
    conflictAlert = `Atención: ${conflictRes.id_mesa ? 'Esta mesa' : 'Mesa'} tiene una reserva a las ${new Date(conflictRes.fecha_hora_inicio).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })} (${conflictRes.nombre_cliente}) y actualmente se encuentra ocupada.`;
  }

  return {
    currentReservation,
    upcomingReservation,
    conflictAlert
  };
}

/* =============================================================================
   FASE 2: SERVICIOS Y ENDPOINTS DE INTEGRACIÓN PARA PÁGINA WEB EXTERNA
   ============================================================================= */

export async function apiGetAvailableTables(dateStr, timeStr, dinersCount = 2, allTables = []) {
  return await getAvailableTablesForTimeSlot(allTables, dateStr, timeStr, 90, dinersCount);
}

export async function apiCreateWebReservation(webData) {
  return await saveReservation({ ...webData, origen: 'WEB' }, 'Cliente Web');
}

export async function apiGetReservationById(reservationId) {
  return await dbGet('reservations', reservationId);
}

export async function apiCancelReservationWeb(reservationId) {
  return await cancelReservation(reservationId, 'Cliente Web');
}
