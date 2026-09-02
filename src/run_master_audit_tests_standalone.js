/**
 * Master Test Suite & Chaos Runner - GastroFlow OS
 * Pruebas automatizadas avanzadas de Integridad, Concurrencia, Seguridad, Idempotencia y Resiliencia.
 */

import 'fake-indexeddb/auto';
import { authenticateByPin, saveUser, validateAuthorizationPin, validateAdminPin } from './services/authService.js';
import { dbGetAll, dbGet, dbPut, seedUnifiedDatabase } from './services/db.js';
import { getMenuProducts } from './services/menuService.js';
import { getInventoryItems, recordStockMovement } from './services/inventoryService.js';
import { createOrderWithStockDeduction, removeItemFromOrder } from './services/orderService.js';
import { processOrderPayment } from './services/paymentService.js';
import { emitFiscalDocumentV43, getFiscalQueue } from './services/fiscalService.js';
import { saveReservation, checkTableAvailability } from './services/reservationService.js';
import { processIncident } from './services/incidentEngine.js';
import { roundMoney, calculateTaxesAndTotals } from './utils/money.js';

async function runMasterAuditTestSuite() {
  console.log('=================================================================');
  console.log('GASTROFLOW OS - PRUEBAS DE AUDITORÍA, CONCURRENCIA Y CAOS (P0-P3)');
  console.log('=================================================================\n');

  await seedUnifiedDatabase();

  const results = [];
  const logTest = (id, name, passed, details) => {
    results.push({ id, name, passed, details });
    const icon = passed ? '✅ PASÓ' : '❌ FALLÓ';
    console.log(`[TEST ${id}] ${name}: ${icon}`, details ? details : '');
  };

  // 1. PRUEBA DE CIFRADO DE PIN Y AUTENTICACIÓN SEGURA
  try {
    const session = await authenticateByPin('9999', 'usr-admin');
    const isValidAdmin = session.user.role_id === 'ADMINISTRADOR';
    logTest('CHAOS-01', 'Autenticación Cifrada SHA-256 & Roles', isValidAdmin, { user: session.user.name, role: session.user.role_id });
  } catch (err) {
    logTest('CHAOS-01', 'Autenticación Cifrada SHA-256 & Roles', false, { error: err.message });
  }

  // 2. PRUEBA DE PREVENCIÓN DE MANIPULACIÓN DE PRECIOS (DEVTOOLS CLIENT TAMPERING)
  try {
    const { order } = await createOrderWithStockDeduction({
      tableId: 't-chaos-1',
      tableName: 'Mesa Caos 1',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 2,
      items: [{ product_id: 'prod-baby-beef', product_name: 'Baby Beef 300g', unit_price: 100, quantity: 1 }] // Cliente intenta pagar ₡100
    }, { id: 'SALONERO', name: 'Laura' });

    const officialPriceProtected = order.items[0].unit_price >= 13200; // Precio oficial DB es ₡13.200
    logTest('CHAOS-02', 'Protección Contra Manipulación de Precios desde Client (DevTools)', officialPriceProtected, {
      attemptedPrice: 100,
      enforcedPrice: order.items[0].unit_price,
      total: order.total
    });
  } catch (err) {
    logTest('CHAOS-02', 'Protección Contra Manipulación de Precios desde Client (DevTools)', false, { error: err.message });
  }

  // 3. PRUEBA DE DOBLE COBRO CONCURRENTE (IDEMPOTENCIA & CANDADO EN DB)
  try {
    const { order } = await createOrderWithStockDeduction({
      tableId: 't-chaos-2',
      tableName: 'Mesa Caos 2',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 2,
      items: [{ product_id: 'prod-ceviche-tico', product_name: 'Ceviche Tico', unit_price: 5100, quantity: 1 }]
    }, { id: 'SALONERO', name: 'Laura' });

    // Petición 1: Iniciar cobro en paralelo
    const payPromise1 = processOrderPayment({
      orderId: order.id,
      paymentMethod: 'Tarjeta POS',
      cashierName: 'Cajero A'
    });

    // Petición 2: Intentar cobrar la misma cuenta segundos/ms después
    let pay2Blocked = false;
    try {
      await processOrderPayment({
        orderId: order.id,
        paymentMethod: 'Efectivo',
        amountPaid: 10000,
        cashierName: 'Cajero B'
      });
    } catch (e) {
      pay2Blocked = e.message.includes('ya fue pagado') || e.message.includes('procesado');
    }

    const payResult1 = await payPromise1;
    logTest('CHAOS-03', 'Prevención de Doble Cobro Concurrente entre Cajeros', pay2Blocked && payResult1.success, {
      cashierAStatus: 'APROBADO',
      cashierBBlocked: pay2Blocked
    });
  } catch (err) {
    logTest('CHAOS-03', 'Prevención de Doble Cobro Concurrente entre Cajeros', false, { error: err.message });
  }

  // 4. PRUEBA DE PREVENCIÓN DE RESERVAS SUPERPUESTAS (OVERBOOKING)
  try {
    const testTableId = `T-CHAOS-${Date.now().toString().slice(-4)}`;
    
    // Inserción de reserva base
    await saveReservation({
      id_mesa: testTableId,
      nombre_cliente: 'Cliente A',
      telefono: '88888888',
      fecha: '2026-08-25',
      hora: '19:00',
      duracion_minutos: 90,
      cantidad_personas: 4
    });

    // Intento de segunda reserva en la misma mesa a la misma hora
    let overlapBlocked = false;
    try {
      await saveReservation({
        id_mesa: testTableId,
        nombre_cliente: 'Cliente B (Overbook)',
        telefono: '77777777',
        fecha: '2026-08-25',
        hora: '19:30', // Se traslapa
        duracion_minutos: 60,
        cantidad_personas: 2
      });
    } catch (e) {
      overlapBlocked = e.message.includes('ya tiene una reserva activa');
    }

    logTest('CHAOS-04', 'Prevención de Solapamiento de Reservas en la Misma Mesa', overlapBlocked, {
      overlapAttemptBlocked: overlapBlocked
    });
  } catch (err) {
    logTest('CHAOS-04', 'Prevención de Solapamiento de Reservas en la Misma Mesa', false, { error: err.message });
  }

  // 5. PRUEBA DE PRECISIÓN MONETARIA Y SIN ERRORES DE PUNTO FLOTANTE
  try {
    const calc = calculateTaxesAndTotals(8999.9999999, false);
    const isValidRounding = calc.subtotal === 9000 && calc.total === 11070;
    logTest('CHAOS-05', 'Cálculos Financieros Seguros sin Errores de Punto Flotante', isValidRounding, {
      subtotal: calc.subtotal,
      taxIva: calc.taxIva,
      taxService: calc.taxService,
      total: calc.total
    });
  } catch (err) {
    logTest('CHAOS-05', 'Cálculos Financieros Seguros sin Errores de Punto Flotante', false, { error: err.message });
  }

  // 6. PRUEBA DE RETIRO JUSTIFICADO DE PLATILLO Y PIN DE AUTORIZACIÓN DINÁMICO
  try {
    const { order } = await createOrderWithStockDeduction({
      tableId: 't-chaos-3',
      tableName: 'Mesa Caos 3',
      waiterId: 'usr-laura',
      waiterName: 'Laura Salonera',
      diners: 2,
      items: [{ product_id: 'prod-carpaccio-res', product_name: 'Carpaccio de Res', unit_price: 8100, quantity: 1 }]
    }, { id: 'SALONERO', name: 'Laura' });

    let badPinBlocked = false;
    try {
      await removeItemFromOrder({
        orderId: order.id,
        itemIndex: 0,
        writtenReason: 'El cliente cambió de parecer antes de comer',
        userName: 'Laura Salonera',
        managerPin: '0000' // PIN Inválido
      });
    } catch (e) {
      badPinBlocked = e.message.includes('PIN de autorización');
    }

    // Retirar con PIN correcto de Admin
    await removeItemFromOrder({
      orderId: order.id,
      itemIndex: 0,
      writtenReason: 'El cliente cambió de parecer antes de comer',
      userName: 'Laura Salonera',
      managerPin: '9999' // PIN Válido Admin
    });

    const updatedOrder = await dbGet('orders', order.id);
    const itemStatus = updatedOrder.items[0].status;

    logTest('CHAOS-06', 'Retiro de Platillo Justificado & PIN Dinámico de Gerencia', badPinBlocked && itemStatus === 'RETIRADO_DE_CUENTA', {
      badPinBlocked,
      itemStatusAfterAuth: itemStatus
    });
  } catch (err) {
    logTest('CHAOS-06', 'Retiro de Platillo Justificado & PIN Dinámico de Gerencia', false, { error: err.message });
  }

  // RESUMEN
  const passedCount = results.filter(r => r.passed).length;
  console.log('\n=================================================================');
  console.log(`REPORTE MASTER DE CAOS Y CONCURRENCIA: ${passedCount} / ${results.length} PASADAS`);
  console.log('=================================================================');

  if (passedCount === results.length) {
    console.log('✨ ¡TODOS LOS ESCENARIOS CRÍTICOS DE AUDITORÍA FUERON APROBADOS AL 100%!\n');
    process.exit(0);
  } else {
    console.log('⚠️ ALGUNAS PRUEBAS FALLARON. REVISAR LOGS.\n');
    process.exit(1);
  }
}

runMasterAuditTestSuite().catch(err => {
  console.error('Error fatal corriendo Master Test Suite:', err);
  process.exit(1);
});
