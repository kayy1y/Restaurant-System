import React from 'react';
import { 
  X, Plus, Minus, Trash2, Send, AlertTriangle, Sparkles, 
  ChefHat, GlassWater, Utensils, Check, CreditCard, AlertCircle
} from 'lucide-react';
import { PRODUCTS, RAW_INGREDIENTS } from '../data/mockData';
import { calculateTaxesCR } from '../utils/fiscalCR';

export default function OrderModal({ 
  table, 
  onClose, 
  orders, 
  setOrders, 
  rawIngredients,
  setRawIngredients,
  onOpenCheckout,
  currentRole
}) {
  const [selectedCategory, setSelectedCategory] = React.useState('Todos');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [aiWarning, setAiWarning] = React.useState(null);

  // Find existing order or create new order state
  const existingOrder = orders.find(o => o.tableId === table.id && o.status !== 'pagado');

  const [currentItems, setCurrentItems] = React.useState(
    existingOrder ? [...existingOrder.items] : []
  );
  const [diners, setDiners] = React.useState(existingOrder ? existingOrder.diners : 2);
  const [waiter, setWaiter] = React.useState(existingOrder ? existingOrder.waiter : currentRole.name);

  const categories = ['Todos', 'Platos Fuertes', 'Entradas', 'Bebidas & Cocteles', 'Cafetería', 'Postres'];

  // Check ingredient recipe availability using GastroAI engine
  const checkProductRecipeStock = (product) => {
    if (!product.recipe || product.recipe.length === 0) return { available: true };

    for (const item of product.recipe) {
      const ing = rawIngredients.find(i => i.id === item.ingredientId);
      if (!ing || ing.stock < item.quantity) {
        // Suggest replacement
        const substitute = PRODUCTS.find(p => p.id !== product.id && p.category === product.category && p.available);
        return {
          available: false,
          missingIngredient: ing ? ing.name : 'Insumo faltante',
          needed: item.quantity,
          current: ing ? ing.stock : 0,
          suggestedSubstitute: substitute
        };
      }
    }
    return { available: true };
  };

  const handleAddItem = (product) => {
    const stockCheck = checkProductRecipeStock(product);
    if (!stockCheck.available) {
      setAiWarning({
        product,
        missing: stockCheck.missingIngredient,
        suggested: stockCheck.suggestedSubstitute
      });
      return;
    }

    setAiWarning(null);
    const existingIndex = currentItems.findIndex(i => i.productId === product.id && i.status !== 'servido');

    if (existingIndex >= 0) {
      const updated = [...currentItems];
      updated[existingIndex].quantity += 1;
      setCurrentItems(updated);
    } else {
      setCurrentItems([
        ...currentItems,
        {
          id: `item-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          notes: '',
          status: 'en_espera',
          station: product.station
        }
      ]);
    }
  };

  const handleUpdateNotes = (index, notes) => {
    const updated = [...currentItems];
    updated[index].notes = notes;
    setCurrentItems(updated);
  };

  const handleRemoveItem = (index) => {
    const updated = currentItems.filter((_, i) => i !== index);
    setCurrentItems(updated);
  };

  // Calculate totals using Costa Rica v4.3 tax rules
  const rawSubtotal = currentItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxes = calculateTaxesCR(rawSubtotal, table.type !== 'llevar');

  const handleSendToKitchen = () => {
    if (currentItems.length === 0) return;

    const newOrder = {
      id: existingOrder ? existingOrder.id : `ORD-${Date.now().toString().slice(-4)}`,
      tableId: table.id,
      tableName: table.name,
      type: table.type || 'mesa',
      waiter: waiter,
      diners: diners,
      status: 'en_preparacion',
      startTime: existingOrder ? existingOrder.startTime : new Date().toISOString(),
      items: currentItems.map(i => ({
        ...i,
        status: i.status === 'en_espera' ? 'en_marcha' : i.status
      })),
      subtotal: taxes.subtotal,
      serviceTax: taxes.serviceTax,
      ivaTax: taxes.ivaTax,
      total: taxes.total
    };

    if (existingOrder) {
      setOrders(orders.map(o => o.id === existingOrder.id ? newOrder : o));
    } else {
      setOrders([...orders, newOrder]);
    }

    onClose();
  };

  const filteredProducts = PRODUCTS.filter(p => {
    const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel border border-slate-700/80 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-amber-400" />
              Gestión de Pedido - {table.name}
            </h2>
            <p className="text-xs text-slate-400">Salonero: {waiter} • {diners} comensales</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Menu left, Order summary right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Menu Selector */}
          <div className="md:col-span-7 p-4 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* GastroAI Warning Banner if ingredient missing */}
            {aiWarning && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-200">
                  <p className="font-bold text-amber-300">GastroAI - Ingrediente Insuficiente</p>
                  <p className="mt-0.5">
                    El insumo <span className="font-semibold text-rose-300">{aiWarning.missing}</span> no alcanza para la receta de {aiWarning.product.name}.
                  </p>
                  {aiWarning.suggested && (
                    <button
                      onClick={() => handleAddItem(aiWarning.suggested)}
                      className="mt-2 bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] hover:bg-amber-400 transition-all"
                    >
                      Sustituir por: {aiWarning.suggested.name} (₡{aiWarning.suggested.price.toLocaleString()})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProducts.map(prod => {
                const stockCheck = checkProductRecipeStock(prod);

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleAddItem(prod)}
                    className={`glass-card p-3 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                      !stockCheck.available ? 'opacity-60 border-rose-500/40 bg-rose-950/10' : 'border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex gap-3">
                      <img 
                        src={prod.image} 
                        alt={prod.name} 
                        className="w-16 h-16 object-cover rounded-xl shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-200 truncate">{prod.name}</h4>
                          {prod.popular && (
                            <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0">TOP</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{prod.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-amber-400 font-mono">₡{prod.price.toLocaleString()}</span>
                      {stockCheck.available ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Agregar
                        </span>
                      ) : (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Agotado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Items Summary & Kitchen Send */}
          <div className="md:col-span-5 p-4 bg-slate-900/60 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-200 flex items-center justify-between">
                <span>Comanda del Pedido</span>
                <span className="text-xs text-slate-400 font-mono">{currentItems.length} líneas</span>
              </h3>

              {/* Items List */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {currentItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-xs">Selecciona productos del menú para agregarlos</p>
                  </div>
                ) : (
                  currentItems.map((item, idx) => (
                    <div key={item.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-xs text-slate-200">{item.name}</p>
                          <p className="text-[10px] text-amber-400 font-mono">₡{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                const updated = [...currentItems];
                                updated[idx].quantity -= 1;
                                setCurrentItems(updated);
                              } else {
                                handleRemoveItem(idx);
                              }
                            }}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => {
                              const updated = [...currentItems];
                              updated[idx].quantity += 1;
                              setCurrentItems(updated);
                            }}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Notes input */}
                      <input
                        type="text"
                        placeholder="Nota / Alergia (ej. Sin cebolla, extra salsa)..."
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateNotes(idx, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals Breakdown & Send Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-3 mt-4">
              <div className="space-y-1 text-xs text-slate-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal:</span>
                  <span>₡{taxes.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>IVA 13%:</span>
                  <span>₡{taxes.ivaTax.toLocaleString()}</span>
                </div>
                {table.type !== 'llevar' && (
                  <div className="flex justify-between text-slate-400">
                    <span>Servicio 10% (Ley 5635):</span>
                    <span>₡{taxes.serviceTax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-amber-400 pt-2 border-t border-slate-800">
                  <span>TOTAL ESTIMADO:</span>
                  <span>₡{taxes.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendToKitchen}
                  disabled={currentItems.length === 0}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar a Cocina</span>
                </button>

                <button
                  onClick={() => {
                    handleSendToKitchen();
                    if (existingOrder || currentItems.length > 0) {
                      onOpenCheckout(existingOrder || {
                        id: `ORD-${Date.now().toString().slice(-4)}`,
                        tableId: table.id,
                        tableName: table.name,
                        items: currentItems,
                        total: taxes.total,
                        subtotal: taxes.subtotal,
                        ivaTax: taxes.ivaTax,
                        serviceTax: taxes.serviceTax
                      });
                    }
                  }}
                  disabled={currentItems.length === 0}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Proceder al Cobro</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
