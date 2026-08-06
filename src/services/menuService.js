/**
 * Servicio del Menú La Vid Steakhouse 2025 GastroFlow OS
 * Permite consultar platillos, gestionar disponibilidad y crear nuevos productos desde Administración con recetas y personalizaciones.
 */

import { dbGetAll, dbGet, dbPut, dbDelete } from './db.js';

export async function getMenuCategories() {
  const cats = await dbGetAll('menu_categories');
  return cats.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Obtener Productos del Menú
 * @param {boolean} includeDrafts - Si es true (Admin), incluye productos en estado 'BORRADOR' o 'INACTIVO'.
 */
export async function getMenuProducts(includeDrafts = false) {
  const prods = await dbGetAll('menu_products');
  if (includeDrafts) return prods;
  return prods.filter(p => p.available !== false && p.status !== 'BORRADOR' && p.status !== 'INACTIVO');
}

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
 * Crear o Guardar Producto del Menú desde Administración General (Formulario Multipaso)
 */
export async function createAdminMenuProduct(productData, userRole) {
  if (userRole !== 'ADMINISTRADOR' && userRole !== 'gerente') {
    throw new Error('Solo el Administrador puede agregar o modificar productos del menú.');
  }

  // Validaciones del Producto
  if (!productData.name || productData.name.trim().length < 2) {
    throw new Error('El nombre del producto es obligatorio (mínimo 2 caracteres).');
  }
  if (!productData.base_price || parseFloat(productData.base_price) <= 0) {
    throw new Error('El precio base debe ser un número mayor a cero.');
  }
  if (!productData.category_id) {
    throw new Error('Debe seleccionar una categoría válida.');
  }

  // Validar SKU duplicado
  const existingProds = await dbGetAll('menu_products');
  if (productData.sku_code) {
    const duplicate = existingProds.find(p => p.sku_code === productData.sku_code && p.id !== productData.id);
    if (duplicate) {
      throw new Error(`El código SKU '${productData.sku_code}' ya está en uso por ${duplicate.name}.`);
    }
  }

  const now = new Date().toISOString();
  const prodId = productData.id || `prod-${Date.now().toString().slice(-6)}`;

  const newProduct = {
    id: prodId,
    sku_code: productData.sku_code || `SKU-${Date.now().toString().slice(-4)}`,
    name: productData.name.trim(),
    description: productData.description || '',
    category_id: productData.category_id,
    base_price: parseFloat(productData.base_price),
    tax_rate: productData.tax_rate !== undefined ? parseFloat(productData.tax_rate) : 0.13,
    service_rate: productData.service_rate !== undefined ? parseFloat(productData.service_rate) : 0.10,
    preparation_area: productData.preparation_area || 'cocina_caliente',
    prep_time_minutes: productData.prep_time_minutes || 12,
    available: productData.available !== undefined ? productData.available : true,
    status: productData.status || 'ACTIVO', // ACTIVO, BORRADOR, AGOTADO, INACTIVO
    is_gluten_free: !!productData.is_gluten_free,
    is_spicy: !!productData.is_spicy,
    has_recipe: Array.isArray(productData.ingredients) && productData.ingredients.length > 0,
    updated_at: now
  };

  await dbPut('menu_products', newProduct);

  // Si incluye ingredientes de receta
  if (Array.isArray(productData.ingredients) && productData.ingredients.length > 0) {
    await saveProductRecipe({
      productId: prodId,
      ingredients: productData.ingredients
    }, userRole);
  }

  return newProduct;
}

export async function saveMenuProduct(product, userRole) {
  return createAdminMenuProduct(product, userRole);
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
  if (userRole !== 'ADMINISTRADOR' && userRole !== 'gerente') {
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
