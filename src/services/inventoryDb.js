/**
 * Motor de Base de Datos Transaccional para Inventarios de Restaurantes
 * Implementación con IndexedDB nativo (Base de Datos Relacional Persistente)
 */

const DB_NAME = 'GastroFlow_Restaurant_DB';
const DB_VERSION = 1;

// Unidades de medida oficiales para restaurantes
export const DEFAULT_UNITS = [
  { id: 'unit-kg', code: 'kg', name: 'Kilogramos', type: 'peso' },
  { id: 'unit-g', code: 'g', name: 'Gramos', type: 'peso' },
  { id: 'unit-l', code: 'L', name: 'Litros', type: 'volumen' },
  { id: 'unit-ml', code: 'ml', name: 'Mililitros', type: 'volumen' },
  { id: 'unit-unid', code: 'unid', name: 'Unidades', type: 'conteo' },
  { id: 'unit-caja', code: 'caja', name: 'Cajas', type: 'empaque' },
  { id: 'unit-paq', code: 'paq', name: 'Paquetes', type: 'empaque' },
  { id: 'unit-bot', code: 'bot', name: 'Botellas', type: 'empaque' }
];

// Categorías iniciales de insumos
export const DEFAULT_CATEGORIES = [
  { id: 'cat-carnes', name: 'Carnes & Proteínas', description: 'Cortes de res, cerdo, aves y mariscos' },
  { id: 'cat-vegetales', name: 'Vegetales & Verduras', description: 'Hortalizas, verduras y hierbas frescas' },
  { id: 'cat-lacteos', name: 'Lácteos & Quesos', description: 'Leche, cremas, mantequillas y quesos' },
  { id: 'cat-panaderia', name: 'Panadería & Granos', description: 'Panes, harinas, arroz y cereales' },
  { id: 'cat-bebidas', name: 'Bebidas & Licores', description: 'Vinos, destilados, refrescos y zumos' },
  { id: 'cat-cafeteria', name: 'Cafetería & Azúcar', description: 'Grano de café, té, azúcares y jarabes' },
  { id: 'cat-suministros', name: 'Suministros & Empaques', description: 'Servilletas, empaques y limpieza' }
];

// Apertura y migración de esquemas de IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return resolve(null);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Tabla de Insumos / Artículos de Inventario
      if (!db.objectStoreNames.contains('inventory_items')) {
        const itemStore = db.createObjectStore('inventory_items', { keyPath: 'id' });
        itemStore.createIndex('name', 'name', { unique: false });
        itemStore.createIndex('category_id', 'category_id', { unique: false });
        itemStore.createIndex('sku_code', 'sku_code', { unique: false });
      }

      // 2. Tabla de Categorías
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }

      // 3. Tabla de Unidades de Medida
      if (!db.objectStoreNames.contains('units_of_measure')) {
        db.createObjectStore('units_of_measure', { keyPath: 'id' });
      }

      // 4. Tabla Transaccional de Movimientos (Kardex)
      if (!db.objectStoreNames.contains('inventory_movements')) {
        const movStore = db.createObjectStore('inventory_movements', { keyPath: 'id' });
        movStore.createIndex('item_id', 'item_id', { unique: false });
        movStore.createIndex('timestamp', 'timestamp', { unique: false });
        movStore.createIndex('movement_type', 'movement_type', { unique: false });
      }

      // 5. Tabla de Recetas de Productos
      if (!db.objectStoreNames.contains('recipes')) {
        db.createObjectStore('recipes', { keyPath: 'id' });
      }

      // 6. Tabla de Ingredientes por Receta
      if (!db.objectStoreNames.contains('recipe_ingredients')) {
        db.createObjectStore('recipe_ingredients', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Métodos genéricos de persistencia local
export async function getAllFromStore(storeName) {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getFromStore(storeName, key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToStore(storeName, item) {
  const db = await openDB();
  if (!db) return item;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFromStore(storeName, key) {
  const db = await openDB();
  if (!db) return true;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Inicialización inicial de esquemas de tablas básicas
 */
export async function seedDatabaseIfEmpty() {
  const units = await getAllFromStore('units_of_measure');
  if (units.length === 0) {
    for (const u of DEFAULT_UNITS) {
      await saveToStore('units_of_measure', u);
    }
  }

  const categories = await getAllFromStore('categories');
  if (categories.length === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await saveToStore('categories', c);
    }
  }
}
