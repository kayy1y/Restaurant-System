import React from 'react';
import { 
  ShieldCheck, Utensils, Package, Users, Play, CheckCircle2, 
  AlertTriangle, Lock, Edit3, Plus, Save, Sparkles, FileText, FolderPlus, 
  Trash2, EyeOff, Check, RotateCcw, Search, Tag, Flame
} from 'lucide-react';

import { 
  getMenuProducts, saveMenuProduct, getProductRecipe, saveProductRecipe, 
  createAdminMenuProduct, getMenuCategories, setProductStatus, deleteMenuProduct, saveCategory 
} from '../../services/menuService.js';
import { getInventoryItems, getUnitsOfMeasure } from '../../services/inventoryService.js';
import { getAllUsers, saveUser } from '../../services/authService.js';
import { runAutomatedSystemTests } from '../../services/testRunner.js';
import { runWorkerSwitchTestRunner } from '../../services/workerSwitchTestRunner.js';
import { testSupabaseConnection } from '../../services/supabaseDiagnostic.js';

export default function AdminView() {
  const [activeTab, setActiveTab] = React.useState('menu');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = React.useState(false);
  const [adminPinInput, setAdminPinInput] = React.useState('');
  const [pinError, setPinError] = React.useState('');

  const [categories, setCategories] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [inventoryItems, setInventoryItems] = React.useState([]);
  const [units, setUnits] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [testResults, setTestResults] = React.useState([]);
  const [runningTests, setRunningTests] = React.useState(false);
  const [supabaseDiag, setSupabaseDiag] = React.useState(null);

  const [searchFilter, setSearchFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('Todos');
  const [confirmDeleteProd, setConfirmDeleteProd] = React.useState(null);

  const [newProdForm, setNewProdForm] = React.useState({
    name: '',
    name_en: '',
    sku_code: '',
    category_id: 'cat-carnes-res',
    description: '',
    description_en: '',
    base_price: '',
    grammage: '',
    spicy_level: 0,
    available: true,
    status: 'disponible',
    is_gluten_free: false,
    is_daily_special: false,
    allows_modifiers: true
  });
  const [prodFormError, setProdFormError] = React.useState('');
  const [prodFormSuccess, setProdFormSuccess] = React.useState('');

  const [editingProduct, setEditingProduct] = React.useState(null);
  const [recipeProduct, setRecipeProduct] = React.useState(null);
  const [recipeIngredients, setRecipeIngredients] = React.useState([]);

  // Formulario para Crear/Editar Categoría
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatDesc, setNewCatDesc] = React.useState('');

  const loadAdminData = React.useCallback(async () => {
    try {
      const [cData, pData, iData, uData, usrData] = await Promise.all([
        getMenuCategories(),
        getMenuProducts(true),
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

  const handleCreateProductSubmit = async (e, publishStatus = 'disponible') => {
    if (e) e.preventDefault();
    setProdFormError('');
    setProdFormSuccess('');

    try {
      const created = await createAdminMenuProduct({
        ...newProdForm,
        status: publishStatus
      }, 'ADMINISTRADOR', 'Admin General');

      setProdFormSuccess(`¡Éxito! El producto "${created.name}" fue guardado correctamente en estado ${publishStatus}.`);
      setNewProdForm({
        name: '',
        name_en: '',
        sku_code: '',
        category_id: categories[0]?.id || 'cat-carnes-res',
        description: '',
        description_en: '',
        base_price: '',
        grammage: '',
        spicy_level: 0,
        available: true,
        status: 'disponible',
        is_gluten_free: false,
        is_daily_special: false,
        allows_modifiers: true
      });
      await loadAdminData();
    } catch (err) {
      setProdFormError(err.message || 'Error al crear producto.');
    }
  };

  const handleStatusToggle = async (productId, newStatus) => {
    try {
      await setProductStatus(productId, newStatus, 'ADMINISTRADOR', 'Admin General');
      await loadAdminData();
    } catch (err) {
      alert('Error cambiando estado del producto: ' + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteProd) return;
    try {
      await deleteMenuProduct(confirmDeleteProd.id, 'ADMINISTRADOR', 'Admin General');
      setConfirmDeleteProd(null);
      await loadAdminData();
    } catch (err) {
      alert('Error al eliminar producto: ' + err.message);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await saveMenuProduct(editingProduct, 'ADMINISTRADOR', 'Admin General');
      setEditingProduct(null);
      await loadAdminData();
    } catch (err) {
      alert('Error guardando producto: ' + err.message);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await saveCategory({ name: newCatName, description: newCatDesc }, 'ADMINISTRADOR');
      setNewCatName('');
      setNewCatDesc('');
      await loadAdminData();
    } catch (err) {
      alert('Error al guardar categoría: ' + err.message);
    }
  };

  const handleRunTests = async () => {
    setRunningTests(true);
    const r1 = await runAutomatedSystemTests();
    const r2 = await runWorkerSwitchTestRunner();
    setTestResults([...r1, ...r2]);
    const diag = await testSupabaseConnection();
    setSupabaseDiag(diag);
    setRunningTests(false);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#231710] w-full max-w-sm rounded-3xl p-6 space-y-4 text-center shadow-2xl">
          <div className="bg-[#5d402b]/15 w-12 h-12 rounded-2xl border border-[#5d402b]/30 text-[#5d402b] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-lg text-[#231710]">Sesión Administrativa Protegida</h3>
            <p className="text-xs text-[#6e5a4b] mt-1">Ingresa el PIN de Administrador (PIN: 9999)</p>
          </div>

          <form onSubmit={handleAdminAuth} className="space-y-3">
            <input
              type="password"
              maxLength={4}
              placeholder="PIN Admin (9999)"
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl py-3 text-center text-lg font-mono font-bold tracking-widest text-[#5d402b] focus:outline-none focus:border-[#5d402b]"
              autoFocus
            />
            {pinError && <p className="text-xs text-[#802319] font-bold">{pinError}</p>}
            <button
              type="submit"
              className="w-full bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] font-extrabold text-xs py-3 rounded-xl shadow-lg transition-all border border-[#3e2718]"
            >
              Autenticar Administrador
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredAdminProducts = products.filter(p => {
    const matchesCat = categoryFilter === 'Todos' || p.category_id === categoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 text-[#1f1209]">
      {/* Header Admin */}
      <div className="glass-panel p-4 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#5d402b]/15 p-2.5 rounded-2xl border border-[#5d402b]/30 text-[#5d402b]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-lg text-[#1f1209]">Administración del Menú & Sistema</h2>
            <p className="text-xs text-[#3d2717] font-semibold">La Vid Steak House & Pizza • La Fortuna, Costa Rica</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'menu', label: 'Administrar Menú', icon: Utensils },
            { id: 'crear_producto', label: '+ Agregar Producto', icon: FolderPlus },
            { id: 'especiales', label: 'Especiales del Día', icon: Sparkles },
            { id: 'categorias', label: 'Categorías', icon: Tag },
            { id: 'usuarios', label: 'Usuarios & PINs', icon: Users },
            { id: 'pruebas', label: 'Pruebas Sistema', icon: Play }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === t.id ? 'bg-[#5d402b] text-[#fffdf9] shadow-md border border-[#3e2718]' : 'bg-[#fffdf9] text-[#3d2717] border border-[#dac8b3] hover:bg-[#f5efe6]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pestaña 1: Administrar Menú La Vid */}
      {activeTab === 'menu' && (
        <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] space-y-4 shadow-md">
          <div className="flex flex-wrap justify-between items-center border-b border-[#dac8b3] pb-3 gap-3">
            <div>
              <h3 className="font-heading font-extrabold text-base text-[#1f1209]">
                Catálogo de Productos del Menú ({products.length} platillos registrados)
              </h3>
              <p className="text-xs text-[#3d2717] font-semibold">Permite cambiar precios, marcar como agotados, ocultar o editar platillos</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6e5a4b] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-[#fffdf9] border border-[#dac8b3] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#231710] font-bold focus:outline-none"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-1.5 text-xs text-[#231710] font-bold"
              >
                <option value="Todos">Todas las Categorías</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAdminProducts.map(p => {
              const isAgotado = p.status === 'agotado';
              const isOculto = p.status === 'oculto';

              return (
                <div key={p.id} className="glass-card p-4 rounded-2xl border border-[#dac8b3] bg-[#fffdf9] space-y-2 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-heading font-extrabold text-sm text-[#231710] flex items-center gap-1">
                        {p.name}
                        {p.spicy_level > 0 && <span>🌶️</span>}
                      </h4>
                      <span className="font-mono font-extrabold text-[#5d402b] text-sm">₡{p.base_price?.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[#6e5a4b] mt-1 line-clamp-2">{p.description}</p>
                  </div>

                  <div className="pt-2 border-t border-[#dac8b3] space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        isOculto ? 'bg-stone-300 text-stone-800' :
                        isAgotado ? 'bg-rose-100 text-[#802319]' : 'bg-[#46593a]/20 text-[#23351a]'
                      }`}>
                        {isOculto ? 'OCULTO' : isAgotado ? 'AGOTADO' : 'DISPONIBLE'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="bg-[#f5efe6] hover:bg-[#e2d7c5] text-[#231710] px-2 py-1 rounded-lg font-bold text-[10px] border border-[#dac8b3] flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-[#5d402b]" /> Editar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteProd(p)}
                          className="bg-rose-100 hover:bg-rose-200 text-[#802319] p-1 rounded-lg border border-rose-300"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Acciones Rápidas Admin */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => handleStatusToggle(p.id, isAgotado ? 'disponible' : 'agotado')}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                          isAgotado 
                            ? 'bg-[#46593a] text-[#fffdf9] border-[#2f3d25]' 
                            : 'bg-[#faf6ee] text-[#802319] border-[#dac8b3] hover:bg-rose-100'
                        }`}
                      >
                        {isAgotado ? 'Restablecer Stock' : 'Marcar Agotado'}
                      </button>

                      <button
                        onClick={() => handleStatusToggle(p.id, isOculto ? 'disponible' : 'oculto')}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                          isOculto 
                            ? 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718]' 
                            : 'bg-[#faf6ee] text-[#6e5a4b] border-[#dac8b3] hover:bg-[#e2d7c5]'
                        }`}
                      >
                        {isOculto ? 'Mostrar en Menú' : 'Ocultar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pestaña 2: Agregar Producto al Menú */}
      {activeTab === 'crear_producto' && (
        <div className="glass-panel p-6 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] space-y-5 max-w-3xl mx-auto shadow-md">
          <div className="border-b border-[#dac8b3] pb-3">
            <h3 className="font-heading font-extrabold text-base text-[#231710] flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-[#5d402b]" /> Registro de Nuevo Producto en el Menú
            </h3>
            <p className="text-xs text-[#6e5a4b]">Agrega platillos reales al catálogo oficial de La Vid Steak House & Pizza</p>
          </div>

          {prodFormSuccess && (
            <div className="bg-[#46593a]/20 border border-[#46593a]/50 p-3 rounded-2xl text-xs text-[#23351a] font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#46593a]" /> {prodFormSuccess}
            </div>
          )}

          {prodFormError && (
            <div className="bg-[#802319]/20 border border-[#802319]/40 p-3 rounded-2xl text-xs text-[#802319] font-bold">
              {prodFormError}
            </div>
          )}

          <form onSubmit={(e) => handleCreateProductSubmit(e, 'disponible')} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-[#231710] block mb-1">Nombre del Platillo *</label>
                <input
                  type="text"
                  placeholder="Ej. Tomahawk 600g"
                  value={newProdForm.name}
                  onChange={(e) => setNewProdForm({ ...newProdForm, name: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710] font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#231710] block mb-1">Nombre en Inglés</label>
                <input
                  type="text"
                  placeholder="Ej. Tomahawk Steak 600g"
                  value={newProdForm.name_en}
                  onChange={(e) => setNewProdForm({ ...newProdForm, name_en: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-[#231710] block mb-1">Categoría *</label>
                <select
                  value={newProdForm.category_id}
                  onChange={(e) => setNewProdForm({ ...newProdForm, category_id: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710] font-bold"
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#231710] block mb-1">Precio en Colones (₡) *</label>
                <input
                  type="number"
                  step="50"
                  placeholder="15600"
                  value={newProdForm.base_price}
                  onChange={(e) => setNewProdForm({ ...newProdForm, base_price: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#5d402b] font-mono font-extrabold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#231710] block mb-1">Gramaje (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. 350g"
                  value={newProdForm.grammage}
                  onChange={(e) => setNewProdForm({ ...newProdForm, grammage: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710]"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#231710] block mb-1">Descripción del Platillo</label>
              <textarea
                rows={2}
                placeholder="Descripción completa de ingredientes y notas..."
                value={newProdForm.description}
                onChange={(e) => setNewProdForm({ ...newProdForm, description: e.target.value })}
                className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-[#231710] block mb-1">Nivel de Picante</label>
                <select
                  value={newProdForm.spicy_level}
                  onChange={(e) => setNewProdForm({ ...newProdForm, spicy_level: parseInt(e.target.value) })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710] font-bold"
                >
                  <option value={0}>No picante</option>
                  <option value={1}>🌶️ Ligeramente Picante</option>
                  <option value={2}>🌶️🌶️ Muy Picante</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#231710] block mb-1">Es Especial del Día</label>
                <select
                  value={newProdForm.is_daily_special ? 'yes' : 'no'}
                  onChange={(e) => setNewProdForm({ ...newProdForm, is_daily_special: e.target.value === 'yes' })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710]"
                >
                  <option value="no">No</option>
                  <option value="yes">Sí (Especial / Pesca del Día)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#231710] block mb-1">Opción Gluten Free</label>
                <select
                  value={newProdForm.is_gluten_free ? 'yes' : 'no'}
                  onChange={(e) => setNewProdForm({ ...newProdForm, is_gluten_free: e.target.value === 'yes' })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710]"
                >
                  <option value="no">No</option>
                  <option value="yes">Sí (Apto Gluten Free)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#dac8b3] flex justify-end">
              <button
                type="submit"
                className="bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] font-extrabold text-xs px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-[#3e2718]"
              >
                <Save className="w-4 h-4 text-[#d8c4a7]" /> Registrar Producto en Menú
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pestaña 3: Especiales del Día */}
      {activeTab === 'especiales' && (
        <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] space-y-4 shadow-md">
          <div className="border-b border-[#dac8b3] pb-3">
            <h3 className="font-heading font-extrabold text-base text-[#231710] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5d402b]" /> Gestión de Especiales del Día & Cosas del Día
            </h3>
            <p className="text-xs text-[#6e5a4b]">Cortes especiales, Pesca del día, guarniciones y promociones temporales</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.filter(p => p.is_daily_special).map(spec => (
              <div key={spec.id} className="bg-[#fffdf9] border border-[#dac8b3] p-4 rounded-2xl space-y-2 shadow-sm">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-[#231710] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#5d402b]" /> {spec.name}
                  </h4>
                  <span className="font-mono font-extrabold text-[#5d402b] text-sm">₡{spec.base_price?.toLocaleString()}</span>
                </div>
                <p className="text-xs text-[#6e5a4b]">{spec.description}</p>
                <div className="pt-2 border-t border-[#dac8b3] flex justify-between items-center text-xs">
                  <span className="bg-[#5d402b]/15 text-[#5d402b] font-bold px-2 py-0.5 rounded-md text-[10px]">Especial Activo</span>
                  <button
                    onClick={() => setEditingProduct(spec)}
                    className="bg-[#f5efe6] text-[#231710] px-2.5 py-1 rounded-lg font-bold text-[10px] border border-[#dac8b3]"
                  >
                    Editar Especial
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña 4: Categorías */}
      {activeTab === 'categorias' && (
        <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] space-y-4 shadow-md">
          <div className="border-b border-[#dac8b3] pb-3">
            <h3 className="font-heading font-extrabold text-base text-[#231710]">Estructura de Categorías del Menú</h3>
            <p className="text-xs text-[#6e5a4b]">Crea o reordena las categorías principales del establecimiento</p>
          </div>

          <form onSubmit={handleCreateCategory} className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="Nombre nueva categoría (ej. Postres)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710] font-bold flex-1"
            />
            <button
              type="submit"
              className="bg-[#5d402b] text-[#fffdf9] font-bold px-4 py-2 rounded-xl"
            >
              + Crear Categoría
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {categories.map(c => (
              <div key={c.id} className="bg-[#fffdf9] border border-[#dac8b3] p-3 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-[#231710] block">{c.name}</span>
                <span className="text-[10px] text-[#6e5a4b] block">{c.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Producto */}
      {confirmDeleteProd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#231710] w-full max-w-md rounded-3xl p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-300 text-[#802319] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#231710]">Eliminar Producto del Menú</h3>
              <p className="text-xs text-[#6e5a4b] mt-1 leading-relaxed">
                ¿Está seguro de que desea eliminar el producto <strong className="text-[#802319]">{confirmDeleteProd.name}</strong> del menú? Las facturas históricas conservarán su registro.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteProd(null)}
                className="flex-1 py-2.5 bg-[#f5efe6] text-[#231710] font-bold text-xs rounded-xl border border-[#dac8b3]"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-[#802319] text-white font-extrabold text-xs rounded-xl shadow-lg"
              >
                Eliminar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición Rápida de Producto */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#231710] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#dac8b3] pb-3">
              <h3 className="font-heading font-extrabold text-base text-[#231710]">Editar Platillo: {editingProduct.name}</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1 rounded-lg bg-[#f5efe6] text-[#6e5a4b]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#231710] block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#231710] block mb-1">Precio en Colones (₡)</label>
                  <input
                    type="number"
                    step="50"
                    value={editingProduct.base_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, base_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-mono font-extrabold text-[#5d402b]"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-[#231710] block mb-1">Estado / Disponibilidad</label>
                  <select
                    value={editingProduct.status || 'disponible'}
                    onChange={(e) => setEditingProduct({ 
                      ...editingProduct, 
                      status: e.target.value, 
                      available: e.target.value === 'disponible' 
                    })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="agotado">Agotado</option>
                    <option value="oculto">Oculto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#231710] block mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-3 border-t border-[#dac8b3] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="py-2 px-4 bg-[#f5efe6] text-[#231710] font-bold rounded-xl border border-[#dac8b3]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[#5d402b] text-[#fffdf9] font-black rounded-xl shadow-lg border border-[#3e2718]"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
