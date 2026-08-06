/**
 * Motor de Base de Datos Relacional Unificado GastroFlow OS (IndexedDB v4)
 * Administra Usuarios, Roles, Permisos, Menú La Vid 2025, Recetas, Inventario, Pedidos, Incidencias, Modificadores por Producto y Audios.
 */

import { LAVID_CATEGORIES, LAVID_PRODUCTS, LAVID_MODIFIERS } from '../data/lavidMenuData.js';
import { DEFAULT_UNITS, DEFAULT_CATEGORIES } from './inventoryDb.js';

const DB_NAME = 'GastroFlow_Unified_DB';
const DB_VERSION = 4;

export const SYSTEM_ROLES = [
  { id: 'SALONERO', name: 'Salonero / Mesero', desc: 'Atención de mesas, pedidos y comanda' },
  { id: 'COCINA', name: 'Personal de Cocina & Barra', desc: 'Pantalla KDS, preparación de platos y desperdicios' },
  { id: 'CAJERO', name: 'Cajero / Cobros', desc: 'Cuentas pendientes, cobros divididos, SINPE y cierres de turno' },
  { id: 'ADMINISTRADOR', name: 'Administrador General', desc: 'Acceso total, usuarios, menú La Vid 2025, recetas, inventarios' }
];

export const SYSTEM_PERMISSIONS = [
  { id: 'MESAS_VER', name: 'Ver Mapa de Mesas', category: 'Salonero' },
  { id: 'PEDIDO_CREAR', name: 'Crear y Enviar Pedidos a Cocina', category: 'Salonero' },
  { id: 'CUENTA_SOLICITAR', name: 'Solicitar Pre-cuenta', category: 'Salonero' },
  { id: 'INCIDENCIA_REPORTAR', name: 'Reportar Incidencia o Problema', category: 'Salonero' },

  { id: 'KDS_VER', name: 'Ver Pantalla KDS de Cocina', category: 'Cocina' },
  { id: 'KDS_ESTADO', name: 'Cambiar Estado de Comanda', category: 'Cocina' },
  { id: 'MERMA_REGISTRAR', name: 'Registrar Mermas y Desperdicios', category: 'Cocina' },

  { id: 'CAJA_COBRAR', name: 'Cobrar y Emitir Comprobantes', category: 'Caja' },
  { id: 'CAJA_DIVIDIR', name: 'Dividir Cuentas', category: 'Caja' },
  { id: 'CAJA_TURNO', name: 'Abrir y Cerrar Turno de Caja', category: 'Caja' },
  { id: 'CAJA_QUITAR_ITEM', name: 'Quitar Productos de Cuenta en Caja', category: 'Caja' },

  { id: 'MENU_ADMINISTRAR', name: 'Editar Menú La Vid 2025 y Precios', category: 'Admin' },
  { id: 'RECETAS_ADMINISTRAR', name: 'Configurar Recetas e Insumos', category: 'Admin' },
  { id: 'INVENTARIO_ADMINISTRAR', name: 'Ajustes y Entradas de Inventario', category: 'Admin' },
  { id: 'USUARIOS_ADMINISTRAR', name: 'Gestionar Usuarios, Roles y PINs', category: 'Admin' },
  { id: 'INCIDENCIA_RESOLVER', name: 'Autorizar y Resolver Incidencias', category: 'Admin' },
  { id: 'FACTURA_CORREGIR', name: 'Gestionar Cola y Rechazos Fiscales v4.3', category: 'Admin' },
  { id: 'REPORTES_FINANCIEROS', name: 'Ver Reportes Financieros Completos', category: 'Admin' }
];

export const ROLE_PERMISSIONS_MAPPING = [
  { role_id: 'SALONERO', permission_id: 'MESAS_VER' },
  { role_id: 'SALONERO', permission_id: 'PEDIDO_CREAR' },
  { role_id: 'SALONERO', permission_id: 'CUENTA_SOLICITAR' },
  { role_id: 'SALONERO', permission_id: 'INCIDENCIA_REPORTAR' },

  { role_id: 'COCINA', permission_id: 'KDS_VER' },
  { role_id: 'COCINA', permission_id: 'KDS_ESTADO' },
  { role_id: 'COCINA', permission_id: 'MERMA_REGISTRAR' },
  { role_id: 'COCINA', permission_id: 'INCIDENCIA_REPORTAR' },

  { role_id: 'CAJERO', permission_id: 'MESAS_VER' },
  { role_id: 'CAJERO', permission_id: 'CUENTA_SOLICITAR' },
  { role_id: 'CAJERO', permission_id: 'CAJA_COBRAR' },
  { role_id: 'CAJERO', permission_id: 'CAJA_DIVIDIR' },
  { role_id: 'CAJERO', permission_id: 'CAJA_TURNO' },
  { role_id: 'CAJERO', permission_id: 'CAJA_QUITAR_ITEM' },
  { role_id: 'CAJERO', permission_id: 'INCIDENCIA_REPORTAR' },

  ...SYSTEM_PERMISSIONS.map(p => ({ role_id: 'ADMINISTRADOR', permission_id: p.id }))
];

export const INITIAL_USERS = [
  { id: 'usr-laura', name: 'Laura', pin: '1234', role_id: 'SALONERO', active: true },
  { id: 'usr-carlos', name: 'Carlos', pin: '1111', role_id: 'SALONERO', active: true },
  { id: 'usr-andrea', name: 'Andrea', pin: '5555', role_id: 'SALONERO', active: true },
  { id: 'usr-mario', name: 'Chef Mario', pin: '2222', role_id: 'COCINA', active: true },
  { id: 'usr-ana', name: 'Ana Cajera', pin: '3333', role_id: 'CAJERO', active: true },
  { id: 'usr-admin', name: 'Admin General', pin: '9999', role_id: 'ADMINISTRADOR', active: true }
];

// Opciones de Especificaciones Coherentes por Categoría de Producto
export const PRODUCT_SPECIFIC_MODIFIERS = {
  'cat-carnes-res': [
    { id: 'TERMINO_MEDIO', label: 'Término Medio (Center Pink)' },
    { id: 'TRES_CUARTOS', label: 'Tres Cuartos (3/4)' },
    { id: 'BIEN_COCIDO', label: 'Bien Cocido' },
    { id: 'SALSA_APARTE', label: 'Salsa Chimichurri Aparte' },
    { id: 'SIN_SAL', label: 'Sin Sal Adicional' }
  ],
  'cat-hamburguesas': [
    { id: 'SIN_CEBOLLA', label: 'Sin Cebolla' },
    { id: 'SIN_TOMATE', label: 'Sin Tomate' },
    { id: 'SIN_QUESO', label: 'Sin Queso' },
    { id: 'QUESO_EXTRA', label: 'Queso Cheddar Extra (+₡800)' },
    { id: 'TERMINO_CARNE', label: 'Carne Término Medio' }
  ],
  'cat-entradas-frias': [
    { id: 'SIN_CEBOLLA', label: 'Sin Cebolla Morada' },
    { id: 'SALSA_APARTE', label: 'Leche de Tigre Aparte' },
    { id: 'SIN_PICANTE', label: 'Sin Picante / Chile' }
  ],
  'cat-bebidas': [
    { id: 'SIN_HIELO', label: 'Sin Hielo' },
    { id: 'POCO_HIELO', label: 'Poco Hielo' },
    { id: 'SIN_AZUCAR', label: 'Sin Azúcar Añadida' }
  ],
  'cat-postres': [
    { id: 'SIN_HELADO', label: 'Sin Helado de Acompañamiento' },
    { id: 'SALSA_CHOCOLATE_APARTE', label: 'Salsa de Chocolate Aparte' }
  ]
};

function openUnifiedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('users')) {
        const uStore = db.createObjectStore('users', { keyPath: 'id' });
        uStore.createIndex('role_id', 'role_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('roles')) {
        db.createObjectStore('roles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('permissions')) {
        db.createObjectStore('permissions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('role_permissions')) {
        const rpStore = db.createObjectStore('role_permissions', { keyPath: 'id', autoIncrement: true });
        rpStore.createIndex('role_id', 'role_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('menu_categories')) {
        db.createObjectStore('menu_categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('menu_products')) {
        const pStore = db.createObjectStore('menu_products', { keyPath: 'id' });
        pStore.createIndex('category_id', 'category_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('product_modifiers')) {
        db.createObjectStore('product_modifiers', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('inventory_items')) {
        const iStore = db.createObjectStore('inventory_items', { keyPath: 'id' });
        iStore.createIndex('category_id', 'category_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('units_of_measure')) {
        db.createObjectStore('units_of_measure', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('inventory_movements')) {
        const mStore = db.createObjectStore('inventory_movements', { keyPath: 'id' });
        mStore.createIndex('item_id', 'item_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('recipes')) {
        const rStore = db.createObjectStore('recipes', { keyPath: 'id' });
        rStore.createIndex('product_id', 'product_id', { unique: true });
      }
      if (!db.objectStoreNames.contains('recipe_ingredients')) {
        const riStore = db.createObjectStore('recipe_ingredients', { keyPath: 'id' });
        riStore.createIndex('recipe_id', 'recipe_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('orders')) {
        const oStore = db.createObjectStore('orders', { keyPath: 'id' });
        oStore.createIndex('table_id', 'table_id', { unique: false });
        oStore.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains('comandas')) {
        const cStore = db.createObjectStore('comandas', { keyPath: 'id' });
        cStore.createIndex('order_id', 'order_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('incidents')) {
        const incStore = db.createObjectStore('incidents', { keyPath: 'id' });
        incStore.createIndex('order_id', 'order_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('fiscal_queue')) {
        const fqStore = db.createObjectStore('fiscal_queue', { keyPath: 'id' });
        fqStore.createIndex('clave', 'clave', { unique: true });
      }

      if (!db.objectStoreNames.contains('order_audio_memos')) {
        db.createObjectStore('order_audio_memos', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('shifts')) {
        db.createObjectStore('shifts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbGetAll(storeName) {
  const db = await openUnifiedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(storeName, id) {
  const db = await openUnifiedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut(storeName, item) {
  const db = await openUnifiedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName, id) {
  const db = await openUnifiedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function seedUnifiedDatabase() {
  const roles = await dbGetAll('roles');
  if (roles.length === 0) {
    for (const r of SYSTEM_ROLES) await dbPut('roles', r);
    for (const p of SYSTEM_PERMISSIONS) await dbPut('permissions', p);
    for (const rp of ROLE_PERMISSIONS_MAPPING) await dbPut('role_permissions', rp);
  }

  const users = await dbGetAll('users');
  if (users.length === 0) {
    for (const u of INITIAL_USERS) await dbPut('users', u);
  }

  const menuCats = await dbGetAll('menu_categories');
  if (menuCats.length === 0) {
    for (const c of LAVID_CATEGORIES) await dbPut('menu_categories', c);
  }

  const menuProds = await dbGetAll('menu_products');
  if (menuProds.length === 0) {
    for (const p of LAVID_PRODUCTS) await dbPut('menu_products', p);
  }

  const mods = await dbGetAll('product_modifiers');
  if (mods.length === 0) {
    for (const m of LAVID_MODIFIERS) await dbPut('product_modifiers', m);
  }

  const units = await dbGetAll('units_of_measure');
  if (units.length === 0) {
    for (const u of DEFAULT_UNITS) await dbPut('units_of_measure', u);
  }

  const items = await dbGetAll('inventory_items');
  if (items.length === 0) {
    const seedItems = [
      { id: 'ing-carne-angus', sku_code: 'SKU-101', name: 'Carne Angus Lomo', category_id: 'cat-carnes', current_stock: 25.0, unit_id: 'unit-kg', min_stock: 5.0, unit_cost: 6500, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-pan-brioche', sku_code: 'SKU-102', name: 'Pan Brioche Artesanal', category_id: 'cat-panaderia', current_stock: 60, unit_id: 'unit-unid', min_stock: 20, unit_cost: 350, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-queso-cheddar', sku_code: 'SKU-103', name: 'Queso Cheddar Madurado', category_id: 'cat-lacteos', current_stock: 4.5, unit_id: 'unit-kg', min_stock: 2.0, unit_cost: 5800, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-tocino', sku_code: 'SKU-104', name: 'Tocino Ahumado', category_id: 'cat-carnes', current_stock: 8.0, unit_id: 'unit-kg', min_stock: 2.0, unit_cost: 4900, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-corvina', sku_code: 'SKU-105', name: 'Corvina Reina Fresca', category_id: 'cat-carnes', current_stock: 12.0, unit_id: 'unit-kg', min_stock: 3.0, unit_cost: 8200, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-limon-mandarina', sku_code: 'SKU-106', name: 'Limón Mandarina', category_id: 'cat-vegetales', current_stock: 15.0, unit_id: 'unit-kg', min_stock: 4.0, unit_cost: 850, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-tomate', sku_code: 'SKU-107', name: 'Tomate Fresco Orgánico', category_id: 'cat-vegetales', current_stock: 10.0, unit_id: 'unit-kg', min_stock: 3.0, unit_cost: 950, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-mozzarella-bufala', sku_code: 'SKU-108', name: 'Mozzarella de Búfala', category_id: 'cat-lacteos', current_stock: 3.0, unit_id: 'unit-kg', min_stock: 1.5, unit_cost: 7500, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-pesto', sku_code: 'SKU-109', name: 'Pesto de Albahaca', category_id: 'cat-vegetales', current_stock: 2.0, unit_id: 'unit-kg', min_stock: 0.8, unit_cost: 6200, status: 'disponible', updated_at: new Date().toISOString() },
      { id: 'ing-papas-freir', sku_code: 'SKU-110', name: 'Papas Rústicas Criollas', category_id: 'cat-vegetales', current_stock: 35.0, unit_id: 'unit-kg', min_stock: 10.0, unit_cost: 900, status: 'disponible', updated_at: new Date().toISOString() }
    ];
    for (const item of seedItems) await dbPut('inventory_items', item);
  }
}
