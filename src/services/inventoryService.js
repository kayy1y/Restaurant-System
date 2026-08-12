/**
 * Servicio de Inventarios de Restaurantes
 * Encapsula la lógica de negocio, validaciones, consultas y transacciones DB.
 */
import { 
  getAllFromStore, 
  getFromStore, 
  saveToStore, 
  deleteFromStore, 
  seedDatabaseIfEmpty 
} from './inventoryDb.js';
import { supabase } from '../lib/supabase.js';

export const MOVEMENT_TYPES = {
  ENTRADA: { id: 'ENTRADA', label: 'Entrada de Mercadería', direction: 'in' },
  SALIDA: { id: 'SALIDA', label: 'Salida de Inventario', direction: 'out' },
  AJUSTE: { id: 'AJUSTE', label: 'Ajuste por Conteo Físico', direction: 'set' },
  CONSUMO_PEDIDO: { id: 'CONSUMO_PEDIDO', label: 'Consumo por Pedido Servido', direction: 'out' },
  COMPRA: { id: 'COMPRA', label: 'Ingreso por Compra a Proveedor', direction: 'in' },
  DESPERDICIO: { id: 'DESPERDICIO', label: 'Merma / Desperdicio de Cocina', direction: 'out' },
  PRODUCTO_DANADO: { id: 'PRODUCTO_DANADO', label: 'Baja por Producto Dañado', direction: 'out' },
  DEVOLUCION: { id: 'DEVOLUCION', label: 'Devolución de Insumo', direction: 'in' }
};

/**
 * Inicializa la base de datos de inventario
 */
export async function initInventoryModule() {
  await seedDatabaseIfEmpty();
}

/**
 * Consultar artículos de inventario con filtros avanzados y búsqueda
 */
export async function getInventoryItems(filters = {}) {
  const { search = '', categoryId = 'ALL', status = 'ALL', unitId = 'ALL' } = filters;
  
  const allItems = await getAllFromStore('inventory_items');

  return allItems.filter(item => {
    // Filtro por búsqueda textual (Nombre o SKU)
    const matchesSearch = !search.trim() || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku_code && item.sku_code.toLowerCase().includes(search.toLowerCase()));

    // Filtro por Categoría
    const matchesCategory = categoryId === 'ALL' || item.category_id === categoryId;

    // Filtro por Unidad de Medida
    const matchesUnit = unitId === 'ALL' || item.unit_id === unitId;

    // Filtro por Estado de Stock
    let matchesStatus = true;
    if (status === 'BAJO') {
      matchesStatus = item.current_stock > 0 && item.current_stock <= item.min_stock;
    } else if (status === 'AGOTADO') {
      matchesStatus = item.current_stock <= 0;
    } else if (status === 'DISPONIBLE') {
      matchesStatus = item.current_stock > item.min_stock;
    }

    return matchesSearch && matchesCategory && matchesUnit && matchesStatus;
  });
}

/**
 * Obtener un artículo por ID
 */
export async function getItemById(id) {
  return await getFromStore('inventory_items', id);
}

/**
 * Crear o Actualizar un artículo en la Base de Datos
 */
export async function saveInventoryItem(itemData) {
  // Validaciones obligatorias de datos
  if (!itemData.name || !itemData.name.trim()) {
    throw new Error('El nombre del artículo es obligatorio.');
  }

  if (itemData.current_stock === undefined || itemData.current_stock < 0) {
    throw new Error('La cantidad inicial no puede ser negativa.');
  }

  if (itemData.min_stock === undefined || itemData.min_stock < 0) {
    throw new Error('La cantidad mínima no puede ser negativa.');
  }

  if (!itemData.unit_id) {
    throw new Error('Debe seleccionar una unidad de medida válida.');
  }

  const now = new Date().toISOString();

  // Calcular estado del producto
  let computedStatus = 'disponible';
  if (itemData.current_stock <= 0) {
    computedStatus = 'agotado';
  } else if (itemData.current_stock <= itemData.min_stock) {
    computedStatus = 'bajo_stock';
  }

  const itemToSave = {
    id: itemData.id || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sku_code: itemData.sku_code || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    name: itemData.name.trim(),
    category_id: itemData.category_id || 'cat-suministros',
    current_stock: parseFloat(itemData.current_stock),
    unit_id: itemData.unit_id,
    min_stock: parseFloat(itemData.min_stock),
    unit_cost: parseFloat(itemData.unit_cost || 0),
    updated_at: now,
    status: computedStatus,
    notes: itemData.notes || '',
    created_at: itemData.created_at || now
  };

  // Sincronizar en Supabase public.productos
  try {
    const sbPayload = {
      id: itemToSave.id.slice(0, 29),
      nombre: itemToSave.name,
      descripcion: (itemToSave.notes || `Stock: ${itemToSave.current_stock} ${itemToSave.unit_id}`).slice(0, 250),
      precio_base: itemToSave.unit_cost || 0,
      categoria_id: (itemToSave.category_id || 'cat-carnes-res').slice(0, 29),
      sku_code: (itemToSave.sku_code || `SKU-${Date.now().toString().slice(-4)}`).slice(0, 29),
      estado: itemToSave.status || 'disponible'
    };
    await supabase.from('productos').upsert([sbPayload], { onConflict: 'id' });
  } catch (sbErr) {
    console.warn('Sincronización Supabase de insumo en fallback:', sbErr.message);
  }

  await saveToStore('inventory_items', itemToSave);
  return itemToSave;
}

/**
 * Eliminar un artículo de inventario
 */
export async function deleteInventoryItem(id) {
  await deleteFromStore('inventory_items', id);
}

/**
 * Ejecutar un Movimiento Transaccional de Existencias (Entrada, Salida, Ajuste)
 * Registra el movimiento en 'inventory_movements' y actualiza 'inventory_items'.
 */
export async function recordStockMovement({
  itemId,
  movementType,
  qtyChanged,
  unitId,
  reason,
  userName = 'Administrador',
  reference = '',
  isAdminOverride = false
}) {
  const item = await getItemById(itemId);
  if (!item) {
    throw new Error('El artículo seleccionado no existe en la base de datos.');
  }

  const qtyNum = parseFloat(qtyChanged);
  if (isNaN(qtyNum) || qtyNum <= 0) {
    throw new Error('La cantidad ingresada debe ser un número positivo mayor a cero.');
  }

  const movMeta = MOVEMENT_TYPES[movementType];
  if (!movMeta) {
    throw new Error('Tipo de movimiento no válido.');
  }

  const qtyBefore = parseFloat(item.current_stock);
  let qtyAfter = qtyBefore;

  if (movMeta.direction === 'in') {
    qtyAfter = qtyBefore + qtyNum;
  } else if (movMeta.direction === 'out') {
    qtyAfter = qtyBefore - qtyNum;
  } else if (movMeta.direction === 'set') {
    qtyAfter = qtyNum;
  }

  // Validación de stock negativo
  if (qtyAfter < 0 && !isAdminOverride) {
    throw new Error(
      `Operación rechazada: La cantidad requerida (${qtyNum}) supera el stock disponible (${qtyBefore} ${item.unit_id}). Se requiere autorización de administrador.`
    );
  }

  // Si se permite override, no se deja en negativo extremo salvo justificación
  if (qtyAfter < 0) qtyAfter = 0;

  const now = new Date().toISOString();

  // 1. Guardar Registro de Movimiento
  const movementRecord = {
    id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    item_id: itemId,
    item_name: item.name,
    movement_type: movementType,
    movement_label: movMeta.label,
    qty_before: qtyBefore,
    qty_changed: qtyNum,
    qty_after: qtyAfter,
    unit_id: unitId || item.unit_id,
    reason: reason || movMeta.label,
    timestamp: now,
    user_name: userName,
    reference: reference
  };

  await saveToStore('inventory_movements', movementRecord);

  // 2. Actualizar Estado e Inventario del Artículo
  let computedStatus = 'disponible';
  if (qtyAfter <= 0) {
    computedStatus = 'agotado';
  } else if (qtyAfter <= item.min_stock) {
    computedStatus = 'bajo_stock';
  }

  const updatedItem = {
    ...item,
    current_stock: qtyAfter,
    status: computedStatus,
    updated_at: now
  };

  await saveToStore('inventory_items', updatedItem);

  return { movement: movementRecord, item: updatedItem };
}

/**
 * Obtener el historial de movimientos de un artículo específico
 */
export async function getMovementsForItem(itemId) {
  const allMovements = await getAllFromStore('inventory_movements');
  return allMovements
    .filter(m => m.item_id === itemId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Obtener todos los movimientos del sistema ordenados cronológicamente
 */
export async function getAllMovements() {
  const allMovements = await getAllFromStore('inventory_movements');
  return allMovements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Categorías y Unidades de Medida
 */
export async function getCategories() {
  return await getAllFromStore('categories');
}

export async function getUnitsOfMeasure() {
  return await getAllFromStore('units_of_measure');
}

export async function addCategory(category) {
  await saveToStore('categories', category);
  return category;
}

export async function addUnitOfMeasure(unit) {
  await saveToStore('units_of_measure', unit);
  return unit;
}

/**
 * Conexión futura con Recetas y Consumo por Pedido
 */
export async function deductRecipeForOrder(productId, orderQty, orderReference, userName) {
  const recipes = await getAllFromStore('recipes');
  const recipe = recipes.find(r => r.product_id === productId);
  
  if (!recipe) return [];

  const recipeIngredients = await getAllFromStore('recipe_ingredients');
  const ingredients = recipeIngredients.filter(ri => ri.recipe_id === recipe.id);

  const results = [];
  for (const ing of ingredients) {
    const totalDeduction = ing.quantity * orderQty;
    const result = await recordStockMovement({
      itemId: ing.inventory_item_id,
      movementType: 'CONSUMO_PEDIDO',
      qtyChanged: totalDeduction,
      unitId: ing.unit_id,
      reason: `Consumo automático por pedido de ${orderQty}x platillos`,
      userName: userName,
      reference: orderReference
    });
    results.push(result);
  }
  return results;
}
