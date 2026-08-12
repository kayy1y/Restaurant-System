import React from 'react';
import { 
  Package, AlertTriangle, Plus, Search, Filter, History, 
  RefreshCw, DollarSign, Layers, ArrowRight, Eye, Edit3, ShieldAlert 
} from 'lucide-react';
import { 
  initInventoryModule, 
  getInventoryItems, 
  getCategories, 
  getUnitsOfMeasure 
} from '../../services/inventoryService';

import QuickStockModal from './QuickStockModal';
import ItemFormModal from './ItemFormModal';
import ItemDetailModal from './ItemDetailModal';
import MovementHistoryView from './MovementHistoryView';

export default function InventoryDashboard({ currentRole }) {
  const [items, setItems] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [units, setUnits] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Filtros
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState('ALL');
  const [selectedUnit, setSelectedUnit] = React.useState('ALL');

  // Vistas y Modales
  const [viewMode, setViewMode] = React.useState('grid'); // grid, history
  const [quickStockItem, setQuickStockItem] = React.useState(null);
  const [itemFormTarget, setItemFormTarget] = React.useState(null); // null = cerrado, 'NEW' = nuevo, Object = editar
  const [itemDetailTarget, setItemDetailTarget] = React.useState(null);

  // Carga inicial y refresco desde la Base de Datos
  const loadDataFromDB = React.useCallback(async () => {
    setLoading(true);
    try {
      await initInventoryModule();
      const [catsData, unitsData, itemsData] = await Promise.all([
        getCategories(),
        getUnitsOfMeasure(),
        getInventoryItems({
          search,
          categoryId: selectedCategory,
          status: selectedStatus,
          unitId: selectedUnit
        })
      ]);

      setCategories(catsData);
      setUnits(unitsData);
      setItems(itemsData);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando inventario desde DB:', err);
      setLoading(false);
    }
  }, [search, selectedCategory, selectedStatus, selectedUnit]);

  React.useEffect(() => {
    loadDataFromDB();
  }, [loadDataFromDB]);

  // Cálculos de métricas de resumen KPI
  const totalItemsCount = items.length;
  const lowStockCount = items.filter(i => i.current_stock > 0 && i.current_stock <= i.min_stock).length;
  const outOfStockCount = items.filter(i => i.current_stock <= 0).length;
  const totalInventoryValuation = items.reduce((sum, i) => sum + (parseFloat(i.current_stock || 0) * parseFloat(i.unit_cost || 0)), 0);

  const [toastMsg, setToastMsg] = React.useState('');

  const handleFormSuccess = (result) => {
    loadDataFromDB();
    if (result && result.isAccumulated) {
      setToastMsg(`✓ Insumo detectado: Se acumuló +${result.addedQty} a "${result.name}" (Existencia total: ${result.current_stock} ${result.unit_id || 'kg'}).`);
    } else if (result) {
      setToastMsg(`✓ Se registró el nuevo insumo "${result.name}" en la Base de Datos con ${result.current_stock} de stock.`);
    }
    setTimeout(() => setToastMsg(''), 4500);
  };

  if (viewMode === 'history') {
    return <MovementHistoryView onBack={() => setViewMode('grid')} />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notificación */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1f140d] text-[#f7f2e9] border border-amber-500 font-bold text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toastMsg}
        </div>
      )}

      {/* Header Principal del Módulo */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-tr from-amber-500 to-amber-600 p-3 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-lg text-slate-100 flex items-center gap-2">
              Módulo Profesional de Inventarios & Insumos
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                Conectado a DB
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Control transaccional de existencias, mermas y valorización de insumos
            </p>
          </div>
        </div>

        {/* Botones de Acción Principal */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setViewMode('history')}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Bitácora Kardex DB</span>
          </button>

          <button
            onClick={() => setItemFormTarget('NEW')}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar Stock / Insumo</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen Intuitivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Insumos Registrados</p>
            <p className="text-2xl font-black text-slate-100 font-mono mt-1">{totalItemsCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">En catálogo de DB</p>
          </div>
          <div className="p-3 bg-slate-900 rounded-2xl text-slate-400 border border-slate-800">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatus('BAJO')}
          className="glass-card p-4 rounded-2xl border border-amber-500/30 cursor-pointer flex items-center justify-between hover:border-amber-500 transition-all"
        >
          <div>
            <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Bajo Inventario</p>
            <p className="text-2xl font-black text-amber-300 font-mono mt-1">{lowStockCount}</p>
            <p className="text-[10px] text-amber-400/80 mt-0.5">Requieren reposición</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatus('AGOTADO')}
          className="glass-card p-4 rounded-2xl border border-rose-500/30 cursor-pointer flex items-center justify-between hover:border-rose-500 transition-all"
        >
          <div>
            <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Agotados</p>
            <p className="text-2xl font-black text-rose-300 font-mono mt-1">{outOfStockCount}</p>
            <p className="text-[10px] text-rose-400/80 mt-0.5">Existencia cero (0)</p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Valorización Bodega</p>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
              ₡{totalInventoryValuation.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">Valor total en almacén</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda & Filtros Dinámicos */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar insumo por nombre o código SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filtro por Estado */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="BAJO">Bajo Inventario</option>
            <option value="AGOTADO">Agotados</option>
          </select>

          {/* Filtro por Categoría */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todas las Categorías</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Filtro por Unidad */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todas las Unidades</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
            ))}
          </select>
        </div>

        {/* Resetear Filtros */}
        {(search || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedUnit !== 'ALL') && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
              setSelectedUnit('ALL');
            }}
            className="text-xs text-amber-400 hover:underline font-semibold"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Catálogo de Inventario (Tabla Limpia & Responsiva) */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-slate-400">Consultando Base de Datos de Inventario...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl text-xs space-y-3">
            <Package className="w-10 h-10 mx-auto text-amber-500/70" />
            <p className="font-bold text-slate-200 text-sm">No hay artículos registrados o no coinciden con los filtros</p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Ingresa el nombre o código SKU de cualquier insumo para sumar existencias automáticamente o crear un nuevo registro en la Base de Datos.
            </p>
            <button
              onClick={() => setItemFormTarget('NEW')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Stock / Insumo a la DB</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Artículo / SKU</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Existencia Actual</th>
                  <th className="py-3 px-3">Mínimo Recomendado</th>
                  <th className="py-3 px-3">Costo Unitario</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {items.map(item => {
                  const cat = categories.find(c => c.id === item.category_id) || { name: 'General' };
                  const unit = units.find(u => u.id === item.unit_id) || { code: item.unit_id };

                  const isOut = item.current_stock <= 0;
                  const isLow = item.current_stock > 0 && item.current_stock <= item.min_stock;

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3.5 px-3 font-sans font-bold text-slate-100">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                            {item.sku_code}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-sans text-slate-300">{cat.name}</td>
                      <td className="py-3.5 px-3 font-extrabold text-amber-300 text-sm">
                        {item.current_stock} <span className="text-xs font-normal text-slate-400">{unit.code}</span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">
                        {item.min_stock} {unit.code}
                      </td>
                      <td className="py-3.5 px-3 text-emerald-400 font-bold">
                        ₡{parseFloat(item.unit_cost || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 font-sans">
                        {isOut ? (
                          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" /> Agotado
                          </span>
                        ) : isLow ? (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" /> Bajo Stock
                          </span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full w-max">
                            OK Disponible
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Acción Rápida: Actualizar Existencia */}
                          <button
                            onClick={() => setQuickStockItem(item)}
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-sm"
                            title="Aumentar o retirar existencias"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Actualizar Existencia</span>
                          </button>

                          {/* Ver Ficha & Historial */}
                          <button
                            onClick={() => setItemDetailTarget(item)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-xl border border-slate-700 text-xs font-medium"
                            title="Ver ficha técnica e historial"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Editar Insumo */}
                          {(currentRole.id === 'admin' || currentRole.id === 'gerente' || currentRole.id === 'inventario') && (
                            <button
                              onClick={() => setItemFormTarget(item)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-xl border border-slate-700 text-xs font-medium"
                              title="Editar insumo"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Actualización Rápida de Stock */}
      {quickStockItem && (
        <QuickStockModal
          item={quickStockItem}
          categories={categories}
          units={units}
          onClose={() => setQuickStockItem(null)}
          onSuccess={loadDataFromDB}
          currentRole={currentRole}
        />
      )}

      {/* Modal de Formulario de Creación / Edición */}
      {itemFormTarget && (
        <ItemFormModal
          itemToEdit={itemFormTarget === 'NEW' ? null : itemFormTarget}
          categories={categories}
          units={units}
          onClose={() => setItemFormTarget(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de Detalle e Historial del Insumo */}
      {itemDetailTarget && (
        <ItemDetailModal
          item={itemDetailTarget}
          categories={categories}
          units={units}
          onClose={() => setItemDetailTarget(null)}
          onRefresh={loadDataFromDB}
          currentRole={currentRole}
        />
      )}
    </div>
  );
}
