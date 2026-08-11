/**
 * Servicio de Gestión del Menú La Vid Steak House & Pizza
 * Administración 100% Completa: Productos, Precios, Categorías, Especiales del Día, Auditoría y Modificadores
 */

import { dbGetAll, dbGet, dbPut, dbDelete } from './db.js';

export async function getMenuCategories() {
  const cats = await dbGetAll('menu_categories');
  return cats.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Obtener Productos del Menú
 * @param {boolean} includeHidden - Si es true (Admin), incluye productos agotados u ocultos.
 */
export async function getMenuProducts(includeHidden = false) {
  const prods = await dbGetAll('menu_products');
  if (includeHidden) return prods;
  return prods.filter(p => p.status !== 'oculto' && p.status !== 'INACTIVO');
}

/**
 * Comprobar Disponibilidad de Insumos de Receta
 */
export async function checkProductStockAvailability(productId, requestedQty = 1) {
  const recipeData = await getProductRecipe(productId);
  if (!recipeData.hasRecipe || recipeData.ingredients.length === 0) {
    return { available: true };
  }

  for (const ing of recipeData.ingredients) {
    const item = await dbGet('inventory_items', ing.inventory_item_id);
    if (!item) continue;
    const needed = ing.quantity * requestedQty;
    if (item.current_stock < needed) {
      return {
        available: false,
        missingIngredient: item.name,
        needed: needed,
        current: item.current_stock,
        unitCode: item.unit_id
      };
    }
  }

  return { available: true };
}

/**
 * Guardar / Editar Producto del Menú con Seguridad & Registro de Auditoría
 */
export async function createAdminMenuProduct(productData, userRole, adminName = 'Administrador') {
  if (userRole !== 'ADMINISTRADOR' && userRole !== 'ADMIN' && userRole !== 'gerente') {
    throw new Error('Solo el Administrador General puede agregar o modificar productos del menú.');
  }

  if (!productData.name || productData.name.trim().length < 2) {
    throw new Error('El nombre del producto es obligatorio.');
  }
  if (!productData.base_price || parseFloat(productData.base_price) <= 0) {
    throw new Error('El precio del producto debe ser mayor a cero.');
  }
  if (!productData.category_id) {
    throw new Error('Debe seleccionar una categoría para el producto.');
  }

  const now = new Date().toISOString();
  const prodId = productData.id || `prod-${Date.now().toString().slice(-6)}`;
  const oldProduct = productData.id ? await dbGet('menu_products', productData.id) : null;

  const newProduct = {
    id: prodId,
    sku_code: productData.sku_code || `SKU-${Date.now().toString().slice(-4)}`,
    name: productData.name.trim(),
    name_en: productData.name_en || '',
    description: productData.description || '',
    description_en: productData.description_en || '',
    category_id: productData.category_id,
    base_price: parseFloat(productData.base_price),
    grammage: productData.grammage || '',
    spicy_level: productData.spicy_level !== undefined ? parseInt(productData.spicy_level) : 0,
    is_gluten_free: !!productData.is_gluten_free,
    available: productData.status !== 'oculto' && productData.status !== 'agotado',
    status: productData.status || 'disponible', // disponible, agotado, oculto
    is_daily_special: !!productData.is_daily_special,
    allows_modifiers: productData.allows_modifiers !== undefined ? productData.allows_modifiers : true,
    image_url: productData.image_url || '',
    updated_at: now,
    created_at: oldProduct?.created_at || now
  };

  await dbPut('menu_products', newProduct);

  // Registrar en Logs de Auditoría
  try {
    const changeDesc = oldProduct 
      ? `Modificado producto ${newProduct.name}: Precio ₡${oldProduct.base_price} -> ₡${newProduct.base_price}, Estado: ${newProduct.status}`
      : `Creado nuevo producto ${newProduct.name} en categoría ${newProduct.category_id} por ₡${newProduct.base_price}`;

    await dbPut('audit_logs', {
      id: `log-menu-${Date.now()}`,
      timestamp: now,
      user_name: adminName,
      user_role: userRole,
      action: oldProduct ? 'MENU_PRODUCTO_EDITAR' : 'MENU_PRODUCTO_CREAR',
      details: changeDesc
    });
  } catch (e) {}

  return newProduct;
}

export async function saveMenuProduct(product, userRole, adminName) {
  return createAdminMenuProduct(product, userRole, adminName);
}

/**
 * Marcar Producto como AGOTADO u OCULTO
 */
export async function setProductStatus(productId, newStatus, userRole, adminName = 'Administrador') {
  if (userRole !== 'ADMINISTRADOR' && userRole !== 'ADMIN' && userRole !== 'gerente') {
    throw new Error('Solo el Administrador General puede cambiar el estado de disponibilidad del menú.');
  }

  const prod = await dbGet('menu_products', productId);
  if (!prod) throw new Error('Producto no encontrado.');

  const oldStatus = prod.status;
  prod.status = newStatus;
  prod.available = newStatus === 'disponible';
  prod.updated_at = new Date().toISOString();

  await dbPut('menu_products', prod);

  try {
    await dbPut('audit_logs', {
      id: `log-status-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_name: adminName,
      user_role: userRole,
      action: 'MENU_CAMBIO_ESTADO',
      details: `Producto ${prod.name} cambió de estado ${oldStatus} a ${newStatus}`
    });
  } catch (e) {}

  return prod;
}

/**
 * Eliminar Producto del Menú
 */
export async function deleteMenuProduct(productId, userRole, adminName = 'Administrador') {
  if (userRole !== 'ADMINISTRADOR' && userRole !== 'ADMIN' && userRole !== 'gerente') {
    throw new Error('Solo el Administrador General puede eliminar productos del menú.');
  }

  const prod = await dbGet('menu_products', productId);
  if (!prod) return true;

  await dbDelete('menu_products', productId);

  try {
    await dbPut('audit_logs', {
      id: `log-del-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_name: adminName,
      user_role: userRole,
      action: 'MENU_PRODUCTO_ELIMINAR',
      details: `Eliminado producto ${prod.name} (ID: ${productId})`
    });
  } catch (e) {}

  return true;
}

/**
 * Guardar Categoría de Menú
 */
export async function saveCategory(categoryData, userRole) {
  if (userRole !== 'ADMINISTRADOR' && userRole !== 'ADMIN' && userRole !== 'gerente') {
    throw new Error('Solo el Administrador General puede gestionar categorías.');
  }

  if (!categoryData.name || !categoryData.name.trim()) {
    throw new Error('El nombre de la categoría es obligatorio.');
  }

  const catId = categoryData.id || `cat-${Date.now().toString().slice(-6)}`;
  const category = {
    id: catId,
    name: categoryData.name.trim(),
    description: categoryData.description || '',
    order: parseInt(categoryData.order) || 99,
    updated_at: new Date().toISOString()
  };

  await dbPut('menu_categories', category);
  return category;
}

export async function getProductRecipe(productId) {
  const recipes = await dbGetAll('recipes');
  const recipe = recipes.find(r => r.product_id === productId);
  if (!recipe) {
    return { hasRecipe: false, ingredients: [] };
  }

  const allIngredients = await dbGetAll('recipe_ingredients');
  const ingredients = allIngredients.filter(ri => ri.recipe_id === recipe.id);
  return { hasRecipe: true, recipeId: recipe.id, ingredients };
}

export async function saveProductRecipe({ productId, ingredients }, userRole) {
  if (userRole !== 'ADMINISTRADOR' && userRole !== 'ADMIN' && userRole !== 'gerente') {
    throw new Error('Solo el Administrador puede editar recetas de insumos.');
  }

  const recipes = await dbGetAll('recipes');
  let recipe = recipes.find(r => r.product_id === productId);

  const now = new Date().toISOString();
  if (!recipe) {
    recipe = { id: `rec-${Date.now()}`, product_id: productId, name: `Receta ${productId}`, updated_at: now };
    await dbPut('recipes', recipe);
  }

  const allRi = await dbGetAll('recipe_ingredients');
  const existingForRecipe = allRi.filter(ri => ri.recipe_id === recipe.id);
  for (const oldRi of existingForRecipe) {
    await dbDelete('recipe_ingredients', oldRi.id);
  }

  for (const ing of ingredients) {
    await dbPut('recipe_ingredients', {
      id: `ri-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      recipe_id: recipe.id,
      inventory_item_id: ing.inventory_item_id,
      quantity: parseFloat(ing.quantity) || 0,
      unit_id: ing.unit_id || 'unit-kg'
    });
  }

  const prod = await dbGet('menu_products', productId);
  if (prod) {
    await dbPut('menu_products', { ...prod, has_recipe: ingredients.length > 0, updated_at: now });
  }

  return { success: true, recipeId: recipe.id };
}
