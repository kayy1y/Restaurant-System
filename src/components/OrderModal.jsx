import React from 'react';
import { 
  X, Plus, Minus, Trash2, Send, AlertTriangle, Sparkles, 
  ChefHat, GlassWater, Utensils, Check, CreditCard, AlertCircle, Search, Flame 
} from 'lucide-react';
import { LAVID_CATEGORIES, LAVID_PRODUCTS, LAVID_MODIFIERS } from '../data/lavidMenuData.js';
import { getMenuProducts, getMenuCategories } from '../services/menuService.js';
import { calculateTaxesCR } from '../utils/fiscalCR.js';

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
  const [categories, setCategories] = React.useState(LAVID_CATEGORIES);
  const [products, setProducts] = React.useState(LAVID_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = React.useState('Todos');
  const [searchTerm, setSearchTerm] = React.useState('');

  // Modal para configurar modificadores de un producto antes de añadirlo
  const [configuringProduct, setConfiguringProduct] = React.useState(null);
  const [selectedModifiers, setSelectedModifiers] = React.useState([]);
  const [itemNote, setItemNote] = React.useState('');

  // Find existing order or create new order state
  const existingOrder = orders.find(o => o.tableId === table.id && o.status !== 'pagado');

  const [currentItems, setCurrentItems] = React.useState(
    existingOrder ? [...existingOrder.items] : []
  );
  const [diners, setDiners] = React.useState(existingOrder ? existingOrder.diners : 2);
  const [waiter, setWaiter] = React.useState(existingOrder ? existingOrder.waiter : currentRole.name);

  React.useEffect(() => {
    getMenuCategories().then(cats => {
      if (cats && cats.length > 0) setCategories(cats);
    }).catch(() => {});

    getMenuProducts(true).then(prods => {
      if (prods && prods.length > 0) setProducts(prods);
    }).catch(() => {});
  }, []);

  // Abrir selector de modificadores o añadir producto directo
  const handleProductClick = (product) => {
    if (product.status === 'agotado') return;

    // Verificar si el producto requiere o permite modificadores específicos
    const hasSpecificMods = 
      product.id === 'prod-ensalada-la-huerta' ||
      product.id === 'prod-camarones-jumbo' ||
      product.category_id === 'cat-pastas' ||
      product.category_id === 'cat-pizzas' ||
      product.category_id === 'cat-carnes-res';

    if (hasSpecificMods) {
      setConfiguringProduct(product);
      setSelectedModifiers([]);
      setItemNote('');
    } else {
      addConfiguredItemToCart(product, [], '');
    }
  };

  const addConfiguredItemToCart = (product, mods = [], note = '') => {
    const extraTotal = mods.reduce((sum, m) => sum + (m.extra_price || 0), 0);
    const itemPrice = (product.base_price || product.price || 0) + extraTotal;
    const modsSummary = mods.map(m => m.name).join(', ');
    const fullNotes = [modsSummary, note].filter(Boolean).join(' | ');

    const existingIndex = currentItems.findIndex(
      i => i.productId === product.id && i.notes === fullNotes && i.status !== 'servido'
    );

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
          price: itemPrice,
          base_price: product.base_price || product.price,
          notes: fullNotes,
          status: 'en_espera'
        }
      ]);
    }
    setConfiguringProduct(null);
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

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'Todos' || p.category_id === selectedCategory || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch && p.status !== 'oculto';
  });

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#231710] w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#2c1d13] text-[#f7f2e9] border-b border-[#422c1d] p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-extrabold flex items-center gap-2 text-[#f7f2e9]">
              <Utensils className="w-5 h-5 text-[#d8c4a7]" />
              Gestión de Pedido - {table.name}
            </h2>
            <p className="text-xs text-[#c4b1a1]">Salonero: {waiter} • {diners} comensales</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1f140d] hover:bg-[#3e2718] text-[#c4b1a1] hover:text-[#f7f2e9] transition-all border border-[#4a3324]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Menu left, Order summary right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left Column: Menu Selector */}
          <div className="md:col-span-7 p-4 border-b md:border-b-0 md:border-r border-[#dac8b3] overflow-y-auto space-y-4">
            
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#3d2717] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar platillo (ej. Rib Eye, Ceviche, Pizza)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-2xl pl-10 pr-4 py-2 text-xs text-[#1f1209] font-bold focus:outline-none focus:border-[#5d402b] shadow-inner placeholder-[#3d2717]/60"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('Todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'Todos'
                    ? 'bg-[#5d402b] text-[#fffdf9] shadow-md border border-[#3e2718]'
                    : 'bg-[#fffdf9] text-[#3d2717] hover:bg-[#f5efe6] border border-[#dac8b3]'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#5d402b] text-[#fffdf9] shadow-md border border-[#3e2718]'
                      : 'bg-[#fffdf9] text-[#3d2717] hover:bg-[#f5efe6] border border-[#dac8b3]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProducts.map(prod => {
                const isAgotado = prod.status === 'agotado';

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleProductClick(prod)}
                    className={`glass-card p-3 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all bg-[#fffdf9] ${
                      isAgotado ? 'opacity-50 border-stone-400 cursor-not-allowed' : 'border-[#dac8b3] hover:border-[#5d402b] shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4 className="font-heading font-extrabold text-xs text-[#1f1209] flex items-center gap-1">
                          {prod.name}
                          {prod.spicy_level === 1 && <span title="Ligeramente Picante">🌶️</span>}
                          {prod.spicy_level >= 2 && <span title="Muy Picante">🌶️🌶️</span>}
                        </h4>
                        {prod.grammage && (
                          <span className="bg-[#5d402b]/10 text-[#5d402b] text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                            {prod.grammage}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#3d2717] font-semibold line-clamp-2 leading-relaxed">{prod.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#dac8b3] flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#5d402b] font-mono text-sm">
                        ₡{(prod.base_price || prod.price || 0).toLocaleString()}
                      </span>

                      {isAgotado ? (
                        <span className="bg-stone-300 text-stone-700 border border-stone-400 text-[10px] font-extrabold px-2 py-0.5 rounded-lg">
                          AGOTADO
                        </span>
                      ) : (
                        <span className="bg-[#46593a]/20 text-[#1f2d17] border border-[#46593a]/40 text-[10px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Agregar
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Items Summary & Kitchen Send */}
          <div className="md:col-span-5 p-4 bg-[#f5efe6] flex flex-col justify-between overflow-y-auto border-t md:border-t-0 border-[#dac8b3]">
            <div className="space-y-4">
              <h3 className="font-heading font-extrabold text-sm text-[#1f1209] flex items-center justify-between">
                <span>Comanda del Pedido</span>
                <span className="text-xs text-[#3d2717] font-mono font-extrabold">{currentItems.length} líneas</span>
              </h3>

              {/* Items List */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {currentItems.length === 0 ? (
                  <div className="py-12 text-center text-[#3d2717] border border-dashed border-[#dac8b3] rounded-2xl bg-[#fffdf9]">
                    <p className="text-xs font-bold">Selecciona productos del menú de La Vid para agregarlos</p>
                  </div>
                ) : (
                  currentItems.map((item, idx) => (
                    <div key={item.id} className="bg-[#fffdf9] border border-[#dac8b3] p-3 rounded-2xl space-y-2 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-xs text-[#1f1209]">{item.name}</p>
                          <p className="text-[11px] text-[#5d402b] font-mono font-extrabold">
                            ₡{(item.price * item.quantity).toLocaleString()}
                          </p>
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
                            className="p-1 rounded-lg bg-[#f5efe6] text-[#1f1209] hover:bg-[#e2d7c5] border border-[#dac8b3]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono text-xs font-bold w-4 text-center text-[#1f1209]">{item.quantity}</span>
                          <button
                            onClick={() => {
                              const updated = [...currentItems];
                              updated[idx].quantity += 1;
                              setCurrentItems(updated);
                            }}
                            className="p-1 rounded-lg bg-[#f5efe6] text-[#1f1209] hover:bg-[#e2d7c5] border border-[#dac8b3]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-lg bg-rose-100 text-[#802319] hover:bg-rose-200 border border-rose-300 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Notes input */}
                      <input
                        type="text"
                        placeholder="Nota u observación (ej. Término medio, sin cebolla)..."
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateNotes(idx, e.target.value)}
                        className="w-full bg-[#faf6ee] border border-[#dac8b3] rounded-xl px-2.5 py-1 text-[11px] text-[#231710] placeholder-[#6e5a4b] focus:outline-none focus:border-[#5d402b]"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals Breakdown & Send Actions */}
            <div className="pt-4 border-t border-[#dac8b3] space-y-3 mt-4">
              <div className="space-y-1 text-xs text-[#231710] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#6e5a4b]">Subtotal:</span>
                  <span>₡{taxes.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#6e5a4b]">
                  <span>IVA 13%:</span>
                  <span>₡{taxes.ivaTax.toLocaleString()}</span>
                </div>
                {table.type !== 'llevar' && (
                  <div className="flex justify-between text-[#6e5a4b]">
                    <span>Servicio 10% (Ley 5635):</span>
                    <span>₡{taxes.serviceTax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-[#5d402b] pt-2 border-t border-[#dac8b3]">
                  <span>TOTAL ESTIMADO:</span>
                  <span>₡{taxes.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendToKitchen}
                  disabled={currentItems.length === 0}
                  className="w-full bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all border border-[#3e2718]"
                >
                  <Send className="w-4 h-4 text-[#d8c4a7]" />
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
                  className="w-full bg-[#46593a] hover:bg-[#34442a] text-[#fffdf9] font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all border border-[#2f3d25]"
                >
                  <CreditCard className="w-4 h-4 text-[#d4e6c8]" />
                  <span>Proceder al Cobro</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL / DRAWER DE CONFIGURACIÓN DE MODIFICADORES Y OPCIONES */}
      {configuringProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#1f1209] w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start border-b border-[#dac8b3] pb-3">
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#1f1209]">{configuringProduct.name}</h3>
                <p className="text-xs text-[#5d402b] font-mono font-bold">
                  Base: ₡{(configuringProduct.base_price || configuringProduct.price).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setConfiguringProduct(null)}
                className="p-1 rounded-lg bg-[#f5efe6] text-[#3d2717] hover:text-[#1f1209]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Opciones Específicas por Producto */}
            <div className="space-y-4 text-xs">
              
              {/* Ensalada de La Huerta: Proteína Extra (+₡4.200) */}
              {configuringProduct.id === 'prod-ensalada-la-huerta' && (
                <div>
                  <label className="font-bold text-[#5d402b] block mb-1">Proteína Adicional (Opcional +₡4.200):</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LAVID_MODIFIERS.filter(m => m.category === 'proteina_huerta').map(m => {
                      const isSel = selectedModifiers.some(sm => sm.id === m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            if (isSel) setSelectedModifiers(selectedModifiers.filter(sm => sm.id !== m.id));
                            else setSelectedModifiers([...selectedModifiers, m]);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            isSel ? 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718]' : 'bg-[#fffdf9] text-[#1f1209] border-[#dac8b3]'
                          }`}
                        >
                          {m.name} (+₡4.200)
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Camarones Jumbo: Preparación (Al ajillo / Empanizados) */}
              {configuringProduct.id === 'prod-camarones-jumbo' && (
                <div>
                  <label className="font-bold text-[#5d402b] block mb-1">Tipo de Preparación *:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LAVID_MODIFIERS.filter(m => m.category === 'prep_camarones').map(m => {
                      const isSel = selectedModifiers.some(sm => sm.id === m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            const withoutPrep = selectedModifiers.filter(sm => sm.category !== 'prep_camarones');
                            setSelectedModifiers([...withoutPrep, m]);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            isSel ? 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718]' : 'bg-[#fffdf9] text-[#1f1209] border-[#dac8b3]'
                          }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pastas & Pizzas: Gluten Free (+₡3.500) */}
              {(configuringProduct.category_id === 'cat-pastas' || configuringProduct.category_id === 'cat-pizzas') && (
                <div>
                  <label className="font-bold text-[#5d402b] block mb-1">Opción de Masa / Pasta:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedModifiers(selectedModifiers.filter(sm => sm.category !== 'gluten_free'))}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        !selectedModifiers.some(sm => sm.category === 'gluten_free') 
                          ? 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718]' 
                          : 'bg-[#fffdf9] text-[#1f1209] border-[#dac8b3]'
                      }`}
                    >
                      Normal
                    </button>
                    {LAVID_MODIFIERS.filter(m => m.category === 'gluten_free').map(m => {
                      const isSel = selectedModifiers.some(sm => sm.id === m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            const withoutGf = selectedModifiers.filter(sm => sm.category !== 'gluten_free');
                            setSelectedModifiers([...withoutGf, m]);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            isSel ? 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718]' : 'bg-[#fffdf9] text-[#1f1209] border-[#dac8b3]'
                          }`}
                        >
                          Gluten Free (+₡3.500)
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Carnes Res: Término de Cocción & Salsa */}
              {configuringProduct.category_id === 'cat-carnes-res' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-[#5d402b] block mb-1">Término de Cocción:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {LAVID_MODIFIERS.filter(m => m.category === 'coccion').map(m => {
                        const isSel = selectedModifiers.some(sm => sm.id === m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              const withoutCoccion = selectedModifiers.filter(sm => sm.category !== 'coccion');
                              setSelectedModifiers([...withoutCoccion, m]);
                            }}
                            className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                              isSel ? 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718]' : 'bg-[#fffdf9] text-[#1f1209] border-[#dac8b3]'
                            }`}
                          >
                            {m.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#5d402b] block mb-1">Salsa Acompañante:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LAVID_MODIFIERS.filter(m => m.category === 'salsas_carne').map(m => {
                        const isSel = selectedModifiers.some(sm => sm.id === m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              const withoutSalsa = selectedModifiers.filter(sm => sm.category !== 'salsas_carne');
                              setSelectedModifiers([...withoutSalsa, m]);
                            }}
                            className={`p-2 rounded-xl border text-[11px] font-bold text-left transition-all ${
                              isSel ? 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718]' : 'bg-[#fffdf9] text-[#1f1209] border-[#dac8b3]'
                            }`}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Observación Libre Manual */}
              <div>
                <label className="font-bold text-[#1f1209] block mb-1">Observación Personalizada:</label>
                <input
                  type="text"
                  placeholder="Ej. Sin cebolla, término 3/4 bien marcado..."
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold placeholder-[#3d2717]/60"
                />
              </div>

            </div>

            <div className="pt-3 border-t border-[#dac8b3] flex justify-end gap-2">
              <button
                onClick={() => setConfiguringProduct(null)}
                className="py-2.5 px-4 bg-[#f5efe6] hover:bg-[#e2d7c5] text-[#231710] font-bold text-xs rounded-xl border border-[#dac8b3]"
              >
                Cancelar
              </button>
              <button
                onClick={() => addConfiguredItemToCart(configuringProduct, selectedModifiers, itemNote)}
                className="py-2.5 px-5 bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] font-black text-xs rounded-xl shadow-lg border border-[#3e2718]"
              >
                Agregar al Pedido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
