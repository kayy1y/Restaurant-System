/**
 * Test Suite Automatizado de Verificación de Integridad GastroFlow OS
 * Ejecuta pruebas unitarias y de integración sobre la Base de Datos transaccional.
 */

import { authenticateByPin, hasPermission, saveUser } from './authService';
import { getMenuProducts, saveMenuProduct, saveProductRecipe, checkProductStockAvailability } from './menuService';
import { getInventoryItems, recordStockMovement } from './inventoryService';
import { createOrderWithStockDeduction, cancelOrder, updateComandaStatus } from './orderService';

export async function runAutomatedSystemTests() {
  const results = [];

  const addResult = (testName, passed, details) => {
    results.push({
      testName,
      passed,
      details,
      timestamp: new Date().toLocaleTimeString('es-CR')
    });
  };

  try {
    // PRUEBA 1: Autenticación por PIN de Empleado (Laura MESERO -> PIN 1234)
    try {
      const session = await authenticateByPin('1234');
      const isLaura = session.user.name.includes('Laura');
      const isSalonero = session.user.role_id === 'SALONERO';
      addResult('PRUEBA 01: Autenticación por PIN Rápido', isLaura && isSalonero, `Usuario identificado: ${session.user.name} (${session.role.name})`);
    } catch (err) {
      addResult('PRUEBA 01: Autenticación por PIN Rápido', false, err.message);
    }

    // PRUEBA 2: Control de Permisos DB (Salonero denegado en Administración)
    try {
      const saloneroCanEditMenu = await hasPermission('SALONERO', 'MENU_ADMINISTRAR');
      const adminCanEditMenu = await hasPermission('ADMINISTRADOR', 'MENU_ADMINISTRAR');
      const passed = !saloneroCanEditMenu && adminCanEditMenu;
      addResult('PRUEBA 02: Seguridad RBAC en Base de Datos', passed, `Salonero permiso menú: ${saloneroCanEditMenu} (Rechazado) | Admin permiso menú: ${adminCanEditMenu} (Autorizado)`);
    } catch (err) {
      addResult('PRUEBA 02: Seguridad RBAC en Base de Datos', false, err.message);
    }

    // PRUEBA 3: Lectura del Menú La Vid Steakhouse 2025 desde DB
    try {
      const products = await getMenuProducts();
      const hasCeviche = products.some(p => p.name.includes('Ceviche Tico'));
      const hasAngus = products.some(p => p.name.includes('Hamburguesa Angus'));
      const passed = products.length >= 15 && hasCeviche && hasAngus;
      addResult('PRUEBA 03: Menú Oficial La Vid 2025 en DB', passed, `${products.length} platillos consultados desde la Base de Datos`);
    } catch (err) {
      addResult('PRUEBA 03: Menú Oficial La Vid 2025 en DB', false, err.message);
    }

    // PRUEBA 4: Restricción de Edición del Menú (Exclusivo Administrador)
    try {
      let rejectedForSalonero = false;
      try {
        await saveMenuProduct({ id: 'prod-ceviche-tico', base_price: 99999 }, 'SALONERO');
      } catch {
        rejectedForSalonero = true;
      }

      const productsBefore = await getMenuProducts();
      const targetProd = productsBefore.find(p => p.id === 'prod-ceviche-tico');

      addResult('PRUEBA 04: Edición Exclusiva del Menú por Administrador', rejectedForSalonero, `Edición por Salonero bloqueada correctamente. Precio intacto en ₡${targetProd.base_price.toLocaleString()}`);
    } catch (err) {
      addResult('PRUEBA 04: Edición Exclusiva del Menú por Administrador', false, err.message);
    }

    // PRUEBA 5: Transacción Atómica: Confirmar Pedido y Descontar Recetas de Inventario DB
    try {
      // 1. Consultar stock previo de Carne Angus y Pan Brioche
      const itemsBefore = await getInventoryItems();
      const carneBefore = itemsBefore.find(i => i.id === 'ing-carne-angus');
      const panBefore = itemsBefore.find(i => i.id === 'ing-pan-brioche');

      // 2. Crear Pedido de 2x Hamburguesas Angus como Laura Salonera
      const orderData = {
        tableId: 'T-01',
        tableName: 'Mesa 1',
        waiterId: 'usr-laura',
        waiterName: 'Laura Mesera',
        diners: 2,
        items: [
          { product_id: 'prod-hamburguesa-angus', product_name: 'Hamburguesa Angus La Vid', quantity: 2, unit_price: 7800 }
        ]
      };

      const result = await createOrderWithStockDeduction(orderData, { id: 'SALONERO', name: 'Laura Mesera' });

      // 3. Consultar stock resultante en DB
      const itemsAfter = await getInventoryItems();
      const carneAfter = itemsAfter.find(i => i.id === 'ing-carne-angus');
      const panAfter = itemsAfter.find(i => i.id === 'ing-pan-brioche');

      // Verificación: 2 hamburguesas usan 2 * 0.180kg = 0.36kg carne y 2 panes
      const expectedCarne = parseFloat((carneBefore.current_stock - 0.360).toFixed(3));
      const expectedPan = panBefore.current_stock - 2;

      const carneCorrect = carneAfter.current_stock === expectedCarne;
      const panCorrect = panAfter.current_stock === expectedPan;
      const passed = carneCorrect && panCorrect && result.comanda;

      addResult(
        'PRUEBA 05: Transacción Atómica de Pedido & Descuento de Receta',
        passed,
        `Pedido ${result.order.id} procesado. Carne Angus: ${carneBefore.current_stock}kg ➔ ${carneAfter.current_stock}kg | Pan: ${panBefore.current_stock}unid ➔ ${panAfter.current_stock}unid`
      );
    } catch (err) {
      addResult('PRUEBA 05: Transacción Atómica de Pedido & Descuento de Receta', false, err.message);
    }

    // PRUEBA 6: Bloqueo de Pedido por Stock Insuficiente
    try {
      let blockedSuccessfully = false;
      try {
        // Solicitar 999 Hamburguesas sin stock suficiente
        await createOrderWithStockDeduction({
          tableId: 'T-02',
          tableName: 'Mesa 2',
          waiterId: 'usr-laura',
          waiterName: 'Laura Mesera',
          items: [{ product_id: 'prod-hamburguesa-angus', product_name: 'Hamburguesa Angus', quantity: 999, unit_price: 7800 }]
        }, { id: 'SALONERO' });
      } catch {
        blockedSuccessfully = true;
      }

      addResult('PRUEBA 06: Bloqueo de Pedidos por Stock Insuficiente', blockedSuccessfully, 'Transacción rechazada correctamente por falta de insumos en bodega');
    } catch (err) {
      addResult('PRUEBA 06: Bloqueo de Pedidos por Stock Insuficiente', false, err.message);
    }

    // PRUEBA 7: Transición de Estados KDS en Cocina (Nuevo -> En preparación -> Listo)
    try {
      const orderTest = await createOrderWithStockDeduction({
        tableId: 'T-03',
        tableName: 'Mesa 3',
        waiterId: 'usr-carlos',
        waiterName: 'Carlos Salonero',
        items: [{ product_id: 'prod-ceviche-tico', product_name: 'Ceviche Tico', quantity: 1, unit_price: 6500 }]
      }, { id: 'SALONERO' });

      await updateComandaStatus(orderTest.comanda.id, 'En preparación');
      const updatedComanda = await updateComandaStatus(orderTest.comanda.id, 'Listo');

      const passed = updatedComanda.status === 'Listo';
      addResult('PRUEBA 07: KDS Cocina & Transición de Comandas', passed, `Comanda ${updatedComanda.id} actualizada a estado '${updatedComanda.status}'`);
    } catch (err) {
      addResult('PRUEBA 07: KDS Cocina & Transición de Comandas', false, err.message);
    }

    // PRUEBA 8: Reposición de Inventario por Cancelación Anticipada
    try {
      const itemsBefore = await getInventoryItems();
      const corvinaBefore = itemsBefore.find(i => i.id === 'ing-corvina');

      const cancelTest = await createOrderWithStockDeduction({
        tableId: 'T-04',
        tableName: 'Mesa 4',
        waiterId: 'usr-laura',
        waiterName: 'Laura Mesera',
        items: [{ product_id: 'prod-ceviche-tico', product_name: 'Ceviche Tico', quantity: 1, unit_price: 6500 }]
      }, { id: 'SALONERO' });

      // Cancelar antes de cocina
      await cancelOrder({
        orderId: cancelTest.order.id,
        reason: 'Cliente cambió de opinión',
        cancelType: 'BEFORE_KITCHEN',
        userName: 'Laura Mesera'
      }, { id: 'SALONERO' });

      const itemsAfter = await getInventoryItems();
      const corvinaAfter = itemsAfter.find(i => i.id === 'ing-corvina');

      const passed = corvinaAfter.current_stock === corvinaBefore.current_stock;
      addResult('PRUEBA 08: Reposición Automática por Cancelación Anticipada', passed, `Stock de Corvina restaurado a ${corvinaAfter.current_stock}kg`);
    } catch (err) {
      addResult('PRUEBA 08: Reposición Automática por Cancelación Anticipada', false, err.message);
    }

  } catch (globalErr) {
    addResult('PRUEBA GLOBAL: Error Inesperado', false, globalErr.message);
  }

  return results;
}
