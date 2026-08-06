import React from 'react';
import { 
  ShieldCheck, Utensils, Package, Users, Play, CheckCircle2, 
  AlertTriangle, Lock, Edit3, Plus, Save, Sparkles, FileText, FolderPlus 
} from 'lucide-react';

import { getMenuProducts, saveMenuProduct, getProductRecipe, saveProductRecipe, createAdminMenuProduct, getMenuCategories } from '../../services/menuService.js';
import { getInventoryItems, getUnitsOfMeasure } from '../../services/inventoryService.js';
import { getAllUsers, saveUser } from '../../services/authService.js';
import { runAutomatedSystemTests } from '../../services/testRunner.js';
import { runWorkerSwitchTestRunner } from '../../services/workerSwitchTestRunner.js';

export default function AdminView() {
  const [activeTab, setActiveTab] = React.useState('menu'); // menu, crear_producto, recetas, usuarios, pruebas
  const [isAdminAuthenticated, setIsAdminAuthenticated] = React.useState(false);
  const [adminPinInput, setAdminPinInput] = React.useState('');
  const [pinError, setPinError] = React.useState('');

  // Datos
  const [categories, setCategories] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [inventoryItems, setInventoryItems] = React.useState([]);
  const [units, setUnits] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [testResults, setTestResults] = React.useState([]);
  const [runningTests, setRunningTests] = React.useState(false);

  // Formulario de Nuevo Producto (Wizard de Creación Admin)
  const [newProdForm, setNewProdForm] = React.useState({
    name: '',
    sku_code: '',
    category_id: 'cat-carnes-res',
    description: '',
    base_price: '',
    tax_rate: 0.13,
    service_rate: 0.10,
    preparation_area: 'cocina_caliente',
    prep_time_minutes: 12,
    available: true,
    status: 'ACTIVO',
    is_gluten_free: false,
    is_spicy: false,
    ingredients: []
  });
  const [prodFormError, setProdFormError] = React.useState('');
  const [prodFormSuccess, setProdFormSuccess] = React.useState('');

  // Edición del Menú La Vid 2025
  const [editingProduct, setEditingProduct] = React.useState(null);

  // Configurador de Receta
  const [recipeProduct, setRecipeProduct] = React.useState(null);
  const [recipeIngredients, setRecipeIngredients] = React.useState([]);

  // Usuario Form
  const [userForm, setUserForm] = React.useState(null);

  const loadAdminData = React.useCallback(async () => {
    try {
      const [cData, pData, iData, uData, usrData] = await Promise.all([
        getMenuCategories(),
        getMenuProducts(true), // Incluye borradores para Admin
        getInventoryItems(),
        getUnitsOfMeasure(),
        getAllUsers()
      ]);
      setCategories(cData);
      setProducts(pData);
      setInventoryItems(iData);
      setUnits(uData);
      setUsers(usrData);
    } catch (err) {
      console.error('Error cargando datos de administración:', err);
    }
  }, []);

  React.useEffect(() => {
    if (isAdminAuthenticated) {
      loadAdminData();
    }
  }, [isAdminAuthenticated, loadAdminData]);

  const handleAdminAuth = (e) => {
    e.preventDefault();
    setPinError('');
    if (adminPinInput.trim() === '9999') {
      setIsAdminAuthenticated(true);
      setAdminPinInput('');
    } else {
      setPinError('PIN de Administrador incorrecto (PIN Demo: 9999).');
    }
  };

  // Crear Nuevo Producto desde Formulario Completo Admin
  const handleCreateProductSubmit = async (e, publishStatus = 'ACTIVO') => {
    if (e) e.preventDefault();
    setProdFormError('');
    setProdFormSuccess('');

    try {
      const created = await createAdminMenuProduct({
        ...newProdForm,
        status: publishStatus
      }, 'ADMINISTRADOR');

      setProdFormSuccess(`¡Éxito! El producto "${created.name}" fue guardado correctamente en estado ${publishStatus}.`);
      setNewProdForm({
        name: '',
        sku_code: '',
        category_id: categories[0]?.id || 'cat-carnes-res',
        description: '',
        base_price: '',
        tax_rate: 0.13,
        service_rate: 0.10,
        preparation_area: 'cocina_caliente',
        prep_time_minutes: 12,
        available: true,
        status: 'ACTIVO',
        is_gluten_free: false,
        is_spicy: false,
        ingredients: []
      });
      await loadAdminData();
    } catch (err) {
      setProdFormError(err.message || 'Error al crear producto.');
    }
  };

  // Guardar Cambios en Platillo Existente
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await saveMenuProduct(editingProduct, 'ADMINISTRADOR');
      setEditingProduct(null);
      await loadAdminData();
    } catch (err) {
      alert('Error guardando producto: ' + err.message);
    }
  };

  const handleSelectRecipeProduct = async (prod) => {
    setRecipeProduct(prod);
    const recData = await getProductRecipe(prod.id);
    setRecipeIngredients(recData.ingredients.map(i => ({
      inventory_item_id: i.inventory_item_id,
      quantity: i.quantity,
      unit_id: i.unit_id
    })));
  };

  const handleAddRecipeIngredient = () => {
    if (inventoryItems.length === 0) return;
    setRecipeIngredients([
      ...recipeIngredients,
      { inventory_item_id: inventoryItems[0].id, quantity: 0.1, unit_id: units[0]?.id || 'unit-kg' }
    ]);
  };

  const handleSaveRecipe = async () => {
    if (!recipeProduct) return;
    try {
      await saveProductRecipe({
        productId: recipeProduct.id,
        ingredients: recipeIngredients
      }, 'ADMINISTRADOR');
      alert(`Receta guardada exitosamente para ${recipeProduct.name}`);
      setRecipeProduct(null);
      await loadAdminData();
    } catch (err) {
      alert('Error guardando receta: ' + err.message);
    }
  };

  const handleRunTests = async () => {
    setRunningTests(true);
    const r1 = await runAutomatedSystemTests();
    const r2 = await runWorkerSwitchTestRunner();
    setTestResults([...r1, ...r2]);
    setRunningTests(false);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="glass-panel border border-slate-700 w-full max-w-sm rounded-3xl p-6 space-y-4 text-center">
          <div className="bg-amber-500/10 w-12 h-12 rounded-2xl border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-100">Sesión Administrativa Protegida</h3>
            <p className="text-xs text-slate-400 mt-1">Ingresa el PIN de Administrador (PIN: 9999)</p>
          </div>

          <form onSubmit={handleAdminAuth} className="space-y-3">
            <input
              type="password"
              maxLength={4}
              placeholder="PIN Admin (9999)"
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 text-center text-lg font-mono font-bold tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
              autoFocus
            />
            {pinError && <p className="text-xs text-rose-400 font-semibold">{pinError}</p>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg transition-all"
            >
              Autenticar Administrador
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Admin */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-lg text-slate-100">Portal de Administración General</h2>
            <p className="text-xs text-slate-400">Edición de Menú La Vid 2025, Creación de Productos, Recetas, Usuarios DB y Pruebas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'menu', label: 'Menú La Vid 2025', icon: Utensils },
            { id: 'crear_producto', label: '+ Nuevo Producto', icon: FolderPlus },
            { id: 'recetas', label: 'Configurador Recetas', icon: Package },
            { id: 'usuarios', label: 'Usuarios & PINs', icon: Users },
            { id: 'pruebas', label: 'Pruebas Sistema', icon: Play }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === t.id ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pestaña 1: Menú La Vid Steakhouse 2025 */}
      {activeTab === 'menu' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-200">Catálogo de Productos ({products.length} platillos en DB)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-slate-100">{p.name}</h4>
                    <span className="font-mono font-extrabold text-amber-400 text-xs">₡{p.base_price?.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    p.status === 'BORRADOR' ? 'bg-purple-500/20 text-purple-300' :
                    p.available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {p.status === 'BORRADOR' ? 'Borrador' : p.available ? 'Disponible' : 'Agotado'}
                  </span>

                  <button
                    onClick={() => setEditingProduct(p)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <Edit3 className="w-3 h-3 text-amber-400" /> Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña NUEVA: Creación Completa de Producto desde Administración */}
      {activeTab === 'crear_producto' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 max-w-3xl mx-auto">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-heading font-extrabold text-base text-slate-100 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-400" /> Formulario de Registro de Nuevo Producto
            </h3>
            <p className="text-xs text-slate-400">Agrega nuevos platillos al menú con precios, impuestos, recetas y opciones sin modificar código</p>
          </div>

          {prodFormSuccess && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {prodFormSuccess}
            </div>
          )}

          {prodFormError && (
            <div className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {prodFormError}
            </div>
          )}

          <form className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  placeholder="Ej. Rib Eye Especial 400g"
                  value={newProdForm.name}
                  onChange={(e) => setNewProdForm({ ...newProdForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Código SKU / Interno</label>
                <input
                  type="text"
                  placeholder="Ej. SKU-901"
                  value={newProdForm.sku_code}
                  onChange={(e) => setNewProdForm({ ...newProdForm, sku_code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Categoría del Menú *</label>
                <select
                  value={newProdForm.category_id}
                  onChange={(e) => setNewProdForm({ ...newProdForm, category_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Precio Base sin Impuestos (₡) *</label>
                <input
                  type="number"
                  step="100"
                  placeholder="Ej. 12500"
                  value={newProdForm.base_price}
                  onChange={(e) => setNewProdForm({ ...newProdForm, base_price: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Descripción del Platillo</label>
              <textarea
                rows={2}
                placeholder="Descripción detallada para el menú..."
                value={newProdForm.description}
                onChange={(e) => setNewProdForm({ ...newProdForm, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Área de Preparación</label>
                <select
                  value={newProdForm.preparation_area}
                  onChange={(e) => setNewProdForm({ ...newProdForm, preparation_area: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="cocina_caliente">Cocina Caliente / Parrilla</option>
                  <option value="cocina_fria">Cocina Fría / Entradas</option>
                  <option value="barra">Barra & Coctelería</option>
                </select>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdForm.is_gluten_free}
                    onChange={(e) => setNewProdForm({ ...newProdForm, is_gluten_free: e.target.checked })}
                  />
                  <span>Libre de Gluten (GF)</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdForm.is_spicy}
                    onChange={(e) => setNewProdForm({ ...newProdForm, is_spicy: e.target.checked })}
                  />
                  <span>Picante</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={(e) => handleCreateProductSubmit(e, 'BORRADOR')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
              >
                💾 Guardar como Borrador
              </button>
              <button
                type="button"
                onClick={(e) => handleCreateProductSubmit(e, 'ACTIVO')}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg"
              >
                ➕ Publicar en el Menú (Activo)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pestaña 3: Recetas */}
      {activeTab === 'recetas' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-5 glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Seleccionar Platillo</h3>
            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {products.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectRecipeProduct(p)}
                  className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                    recipeProduct?.id === p.id ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs">{p.name}</h4>
                    <span className="text-[10px] text-slate-500">{p.has_recipe ? 'Receta Configurada' : 'Receta Pendiente'}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.has_recipe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {p.has_recipe ? 'OK' : 'PENDIENTE'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            {recipeProduct ? (
              <>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-100">Receta: {recipeProduct.name}</h3>
                    <p className="text-xs text-slate-400">Descuento automático de insumos en bodega al confirmar comanda</p>
                  </div>
                  <button onClick={handleAddRecipeIngredient} className="bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl">+ Ingrediente</button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {recipeIngredients.map((ri, idx) => (
                    <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex gap-2 items-center text-xs">
                      <select
                        value={ri.inventory_item_id}
                        onChange={(e) => {
                          const updated = [...recipeIngredients];
                          updated[idx].inventory_item_id = e.target.value;
                          setRecipeIngredients(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 flex-1"
                      >
                        {inventoryItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name} ({item.current_stock} {item.unit_id})</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.001"
                        placeholder="Cant..."
                        value={ri.quantity}
                        onChange={(e) => {
                          const updated = [...recipeIngredients];
                          updated[idx].quantity = parseFloat(e.target.value) || 0;
                          setRecipeIngredients(updated);
                        }}
                        className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-400"
                      />

                      <button onClick={() => setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx))} className="text-rose-400 font-bold">✕</button>
                    </div>
                  ))}
                </div>

                <button onClick={handleSaveRecipe} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3 rounded-xl">
                  Guardar Receta en DB
                </button>
              </>
            ) : (
              <div className="py-16 text-center text-slate-500 italic text-xs">
                Selecciona un platillo a la izquierda para configurar su receta de ingredientes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pestaña 4: Usuarios */}
      {activeTab === 'usuarios' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-200">Usuarios & Códigos PIN de Empleados</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {users.map(u => (
              <div key={u.id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                <h4 className="font-bold text-sm text-slate-100">{u.name}</h4>
                <p className="text-xs text-amber-400 font-semibold">Rol: {u.role_id}</p>
                <p className="text-xs text-slate-400 font-mono">PIN: {u.pin}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña 5: Pruebas */}
      {activeTab === 'pruebas' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-200">Verificador de Integridad y Pruebas Transaccionales DB</h3>
              <p className="text-xs text-slate-400">Ejecuta las pruebas unitarias y de integración del sistema</p>
            </div>
            <button
              onClick={handleRunTests}
              disabled={runningTests}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>{runningTests ? 'Ejecutando Pruebas DB...' : 'Ejecutar Pruebas Sistema'}</span>
            </button>
          </div>

          <div className="space-y-2">
            {testResults.map((t, idx) => (
              <div key={idx} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${t.passed ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/20 border-rose-500/40 text-rose-200'}`}>
                <div>
                  <p className="font-bold flex items-center gap-2">
                    {t.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span>{t.testName}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">{t.details}</p>
                </div>
                <span className="font-mono text-[10px] text-slate-500">{t.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
