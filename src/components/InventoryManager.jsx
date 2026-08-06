import React from 'react';
import { 
  Package, AlertTriangle, Plus, ArrowUpRight, ArrowDownRight, 
  Utensils, DollarSign, RefreshCw, Layers 
} from 'lucide-react';
import { RAW_INGREDIENTS, PRODUCTS } from '../data/mockData';

export default function InventoryManager({ 
  rawIngredients, 
  setRawIngredients, 
  currentRole 
}) {
  const [activeTab, setActiveTab] = React.useState('insumos'); // insumos, recetas
  const [selectedProduct, setSelectedProduct] = React.useState(PRODUCTS[0]);

  const handleStockAdjustment = (ingId, delta) => {
    setRawIngredients(rawIngredients.map(ing => {
      if (ing.id === ingId) {
        const newStock = Math.max(0, parseFloat((ing.stock + delta).toFixed(2)));
        return { ...ing, stock: newStock };
      }
      return ing;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Toggle */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 text-amber-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-100">Gestión de Inventario Basado en Recetas</h2>
            <p className="text-xs text-slate-400">Descuento automático por cada comanda servida</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('insumos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'insumos'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Insumos & Stock
          </button>
          <button
            onClick={() => setActiveTab('recetas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'recetas'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Fichas Técnicas & Recetas
          </button>
        </div>
      </div>

      {/* Tab 1: Raw Ingredients Inventory */}
      {activeTab === 'insumos' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Insumo / Ingrediente</th>
                  <th className="py-3 px-3">Unidad</th>
                  <th className="py-3 px-3">Stock Actual</th>
                  <th className="py-3 px-3">Stock Mínimo</th>
                  <th className="py-3 px-3">Costo Unitario</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Ajuste Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {rawIngredients.map(ing => {
                  const isLow = ing.stock <= ing.minStock;
                  const isCritical = ing.stock === 0;

                  return (
                    <tr key={ing.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-3 font-sans font-bold text-slate-200">{ing.name}</td>
                      <td className="py-3 px-3 text-slate-400">{ing.unit}</td>
                      <td className="py-3 px-3 font-extrabold text-amber-300">{ing.stock} {ing.unit}</td>
                      <td className="py-3 px-3 text-slate-400">{ing.minStock} {ing.unit}</td>
                      <td className="py-3 px-3 text-slate-300">₡{ing.costPerUnit.toLocaleString()}</td>
                      <td className="py-3 px-3">
                        {isCritical ? (
                          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" /> Agotado
                          </span>
                        ) : isLow ? (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" /> Bajo Stock
                          </span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full w-max">
                            OK Normal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStockAdjustment(ing.id, -1)}
                            className="bg-slate-800 hover:bg-rose-950 text-rose-300 p-1.5 rounded-lg border border-slate-700 font-bold"
                            title="Merma / Salida"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleStockAdjustment(ing.id, 5)}
                            className="bg-slate-800 hover:bg-emerald-950 text-emerald-300 p-1.5 rounded-lg border border-slate-700 font-bold"
                            title="Entrada de Compra (+5)"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Recipe Technical Sheets & Cost Calculator */}
      {activeTab === 'recetas' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-5 glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
              Seleccionar Producto del Menú
            </h3>

            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {PRODUCTS.map(prod => (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedProduct?.id === prod.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img src={prod.image} alt={prod.name} className="w-10 h-10 object-cover rounded-lg" />
                    <div>
                      <h4 className="font-bold text-xs">{prod.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">₡{prod.price.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            {selectedProduct && (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-100">{selectedProduct.name}</h3>
                    <p className="text-xs text-slate-400">Ficha Técnica de Receta & Costo Insumos</p>
                  </div>
                  <span className="font-mono font-extrabold text-amber-400 text-base">
                    Precio Venta: ₡{selectedProduct.price.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Ingredientes Requeridos:</h4>
                  <div className="space-y-2">
                    {selectedProduct.recipe.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">No requiere receta de insumos directos.</p>
                    ) : (
                      selectedProduct.recipe.map(item => {
                        const ing = rawIngredients.find(i => i.id === item.ingredientId);
                        const cost = ing ? (ing.costPerUnit * item.quantity) : 0;

                        return (
                          <div key={item.ingredientId} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                            <div>
                              <p className="font-bold text-slate-200 font-sans">{ing ? ing.name : 'Insumo'}</p>
                              <p className="text-[10px] text-slate-400">Cantidad: {item.quantity} {item.unit}</p>
                            </div>
                            <span className="text-emerald-400 font-bold">Costo: ₡{Math.round(cost).toLocaleString()}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
