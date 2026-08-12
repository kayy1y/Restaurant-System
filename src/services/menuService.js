import { dbGetAll, dbGet, dbPut, dbDelete } from './db.js';
import { supabase } from '../lib/supabase.js';
import { LAVID_PRODUCTS, LAVID_CATEGORIES } from '../data/lavidMenuData.js';

const validCategories = ['cat-carnes-res', 'cat-hamburguesas', 'cat-entradas-frias', 'cat-bebidas', 'cat-postres'];

function getValidCategory(catId) {
  if (validCategories.includes(catId)) return catId;
  if (catId === 'cat-pollo' || catId === 'cat-carnes-ahumadas') return 'cat-carnes-res';
  if (catId === 'cat-entradas-calientes' || catId === 'cat-del-mar' || catId === 'cat-pastas' || catId === 'cat-pizzas') return 'cat-entradas-frias';
  return 'cat-entradas-frias';
}

export function mapSupabaseToMenuProduct(row) {
  if (!row) return null;
  const isAvailable = row.disponible !== false && row.estado === 'ACTIVO';
  let statusLower = 'disponible';
  if (row.estado === 'AGOTADO') statusLower = 'agotado';
  else if (row.estado === 'INACTIVO') statusLower = 'oculto';
  else if (row.estado === 'BORRADOR') statusLower = 'borrador';

  return {
    id: row.id,
    sku_code: row.sku_code || `SKU-${row.id}`,
    name: row.nombre || 'Producto sin nombre',
    description: row.descripcion || '',
    category_id: row.categoria_id || 'cat-carnes-res',
    base_price: parseFloat(row.precio_base) || 0,
    area_preparacion: row.area_preparacion || 'cocina_caliente',
    image_url: row.imagen_url || '',
    status: statusLower,
    available: isAvailable,
    created_at: row.creado_en || new Date().toISOString()
  };
}

export function mapMenuProductToSupabasePayload(productData) {
  const prodId = productData.id || `prod-${Date.now().toString().slice(-6)}`;
  const catId = getValidCategory(productData.category_id);

  let areaPrep = 'cocina_caliente';
  if (catId === 'cat-entradas-frias' || catId === 'cat-postres') areaPrep = 'cocina_fria';
  else if (catId === 'cat-bebidas') areaPrep = 'barra';

  let estadoUpper = 'ACTIVO';
  if (productData.status === 'agotado' || productData.status === 'AGOTADO') estadoUpper = 'AGOTADO';
  else if (productData.status === 'oculto' || productData.status === 'INACTIVO') estadoUpper = 'INACTIVO';
  else if (productData.status === 'borrador' || productData.status === 'BORRADOR') estadoUpper = 'BORRADOR';

  return {
    id: prodId.slice(0, 50),
    sku_code: (productData.sku_code || `SKU-${Date.now().toString().slice(-6)}`).slice(0, 30),
    categoria_id: catId,
    nombre: productData.name ? productData.name.trim() : 'Nuevo Producto',
    descripcion: (productData.description || '').slice(0, 500),
    precio_base: parseFloat(productData.base_price) || 0,
    area_preparacion: areaPrep,
    tiempo_preparacion_min: 12,
    estado: estadoUpper,
    disponible: estadoUpper === 'ACTIVO',
    es_gluten_free: !!productData.is_gluten_free,
    es_picante: (productData.spicy_level || 0) > 0,
    imagen_url: productData.image_url || null
  };
}

export async function getMenuCategories() {
  try {
    const cats = await dbGetAll('menu_categories');
    if (cats && cats.length > 0) {
      return cats.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  } catch (err) {}

  return LAVID_CATEGORIES;
}

/**
 * Obtener Productos del Menú desde Supabase o fallback local
 */
export async function getMenuProducts(includeHidden = false) {
  try {
    const { data: rows, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (!error && Array.isArray(rows) && rows.length > 0) {
      const mapped = rows.map(mapSupabaseToMenuProduct);
      if (includeHidden) return mapped;
      return mapped.filter(p => p.status !== 'oculto' && p.status !== 'INACTIVO');
    }
  } catch (err) {
    console.warn('Advertencia consultando productos en Supabase:', err);
  }

  // Fallback a IndexedDB local o lista oficial
  try {
    const prods = await dbGetAll('menu_products');
    if (prods && prods.length > 0) {
      if (includeHidden) return prods;
      return prods.filter(p => p.status !== 'oculto' && p.status !== 'INACTIVO');
    }
  } catch (err) {}

  if (includeHidden) return LAVID_PRODUCTS;
  return LAVID_PRODUCTS.filter(p => p.status !== 'oculto' && p.status !== 'INACTIVO');
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
 * Guardar / Editar Producto del Menú en Supabase y Base de Datos Local
 */
export async function createAdminMenuProduct(productData, userRole = 'ADMINISTRADOR', adminName = 'Administrador') {
  if (!productData.name || productData.name.trim().length < 2) {
    throw new Error('El nombre del producto es obligatorio.');
  }
  if (productData.base_price === undefined || parseFloat(productData.base_price) < 0) {
    throw new Error('El precio del producto no puede ser negativo.');
  }

  const now = new Date().toISOString();
  const prodId = productData.id || `prod-${Date.now().toString().slice(-6)}`;
  let oldProduct = null;
  try {
    oldProduct = productData.id ? await dbGet('menu_products', productData.id) : null;
  } catch (e) {}

  const newProduct = {
    id: prodId,
    sku_code: productData.sku_code || `SKU-${Date.now().toString().slice(-4)}`,
    name: productData.name.trim(),
    name_en: productData.name_en || '',
    description: productData.description || '',
    description_en: productData.description_en || '',
    category_id: productData.category_id || 'cat-carnes-res',
    base_price: parseFloat(productData.base_price || 0),
    grammage: productData.grammage || '',
    spicy_level: productData.spicy_level !== undefined ? parseInt(productData.spicy_level) : 0,
    is_gluten_free: !!productData.is_gluten_free,
    available: productData.status !== 'oculto' && productData.status !== 'agotado',
    status: productData.status || 'disponible',
    is_daily_special: !!productData.is_daily_special,
    allows_modifiers: productData.allows_modifiers !== undefined ? productData.allows_modifiers : true,
    image_url: productData.image_url || '',
    updated_at: now,
    created_at: oldProduct?.created_at || now
  };

  // 1. Guardar/Actualizar en Supabase public.productos
  try {
    const sbPayload = mapMenuProductToSupabasePayload(newProduct);
    await supabase.from('productos').upsert([sbPayload], { onConflict: 'id' });
  } catch (sbErr) {
    console.warn('Sincronización Supabase productos en fallback:', sbErr.message);
  }

  // 2. Guardar en almacenamiento local IndexedDB si está disponible
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    try {
      await dbPut('menu_products', newProduct);
      await dbPut('audit_logs', {
        id: `log-menu-${Date.now()}`,
        timestamp: now,
        user_name: adminName,
        user_role: userRole,
        action: oldProduct ? 'MENU_PRODUCTO_EDITAR' : 'MENU_PRODUCTO_CREAR',
        details: `Producto ${newProduct.name} (Categoría: ${newProduct.category_id}, Precio: ₡${newProduct.base_price}) guardado.`
      });
    } catch (e) {}
  }

  return newProduct;
}

export async function saveMenuProduct(product, userRole, adminName) {
  return createAdminMenuProduct(product, userRole, adminName);
}

/**
 * Marcar Producto como AGOTADO u OCULTO
 */
export async function setProductStatus(productId, newStatus, userRole, adminName = 'Administrador') {
  let prod = null;
  try {
    prod = await dbGet('menu_products', productId);
  } catch (e) {}

  if (!prod) {
    prod = LAVID_PRODUCTS.find(p => p.id === productId);
  }

  if (!prod) throw new Error('Producto no encontrado.');

  prod.status = newStatus;
  prod.available = newStatus === 'disponible';
  prod.updated_at = new Date().toISOString();

  // Actualizar en Supabase
  try {
    await supabase
      .from('productos')
      .update({ estado: newStatus })
      .eq('id', productId.slice(0, 29));
  } catch (err) {}

  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    try { await dbPut('menu_products', prod); } catch (e) {}
  }

  return prod;
}

/**
 * Eliminar Producto del Menú
 */
export async function deleteMenuProduct(productId, userRole, adminName = 'Administrador') {
  try {
    await supabase
      .from('productos')
      .delete()
      .eq('id', productId.slice(0, 29));
  } catch (err) {}

  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    try { await dbDelete('menu_products', productId); } catch (e) {}
  }

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
