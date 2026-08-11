import React from 'react';
import { 
  Users, Clock, Plus, UtensilsCrossed, Lock, UserCheck, 
  ShoppingBag, CheckCircle2, AlertTriangle, Sparkles, X, Check, Filter, Sliders, Trash2, Edit3, Mic, Volume2 
} from 'lucide-react';

import { getMenuProducts, getMenuCategories, checkProductStockAvailability } from '../../services/menuService.js';
import { 
  createOrderWithStockDeduction, 
  getActiveOrdersForWaiters, 
  requestBillForTable, 
  markOrderDelivered,
  addItemToActiveOrder,
  removeItemFromOrder 
} from '../../services/orderService.js';
import { authenticateByPin } from '../../services/authService.js';
import { liveSync } from '../../services/liveSync.js';
import { PRODUCT_SPECIFIC_MODIFIERS } from '../../services/db.js';
import AudioMemoRecorder from '../AudioMemoRecorder.jsx';

export default function SaloneroView({ activeSessionUser }) {
  const [activeUser, setActiveUser] = React.useState(activeSessionUser || { id: 'usr-laura', name: 'Laura' });
  const [categories, setCategories] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [selectedCategory, setSelectedCategory] = React.useState('ALL');
  
  const [readyNotification, setReadyNotification] = React.useState(null);

  // Mesa activa seleccionada
  const [activeTable, setActiveTable] = React.useState(null);
  const [cartItems, setCartItems] = React.useState([]);
  const [diners, setDiners] = React.useState(2);
  const [stockWarning, setStockWarning] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Personalización por Producto Coherente
  const [customizingProduct, setCustomizingProduct] = React.useState(null);
  const [selectedCustomizations, setSelectedCustomizations] = React.useState([]);
  const [customNotes, setCustomNotes] = React.useState('');
  const [showAudioRecorder, setShowAudioRecorder] = React.useState(false);
  const [attachedAudio, setAttachedAudio] = React.useState(null);

  // Modal para Quitar Producto con Motivo Escrito Obligatorio
  const [removingItemIndex, setRemovingItemIndex] = React.useState(null);
  const [writtenReason, setWrittenReason] = React.useState('');
  const [managerPin, setManagerPin] = React.useState('');
  const [removeError, setRemoveError] = React.useState('');

  const tables = [
    { id: 'T-01', name: 'Mesa 1', capacity: 4, zone: 'Salón Principal' },
    { id: 'T-02', name: 'Mesa 2', capacity: 2, zone: 'Salón Principal' },
    { id: 'T-03', name: 'Mesa 3', capacity: 6, zone: 'Terraza Bar' },
    { id: 'T-04', name: 'Mesa 4', capacity: 4, zone: 'Terraza Bar' },
    { id: 'T-05', name: 'Mesa 5 VIP', capacity: 8, zone: 'Cava Privada' },
    { id: 'T-06', name: 'Mesa 6', capacity: 2, zone: 'Salón Principal' }
  ];

  const loadData = React.useCallback(async () => {
    try {
      const [cData, pData, oData] = await Promise.all([
        getMenuCategories(),
        getMenuProducts(),
        getActiveOrdersForWaiters()
      ]);
      setCategories(cData);
      setProducts(pData);
      setOrders(oData);
    } catch (err) {
      console.error('Error cargando datos del salonero:', err);
    }
  }, []);

  React.useEffect(() => {
    loadData();

    const unsubKds = liveSync.subscribe('KDS_STATUS_CHANGED', (data) => {
      loadData();
      if (data && (data.status === 'Listo' || data.status === 'LISTO_PARA_ENTREGA')) {
        setReadyNotification({
          tableName: data.table_name,
          orderId: data.order_id,
          time: new Date().toLocaleTimeString('es-CR')
        });
      }
    });

    const unsubTable = liveSync.subscribe('TABLE_RELEASED', () => loadData());
    const unsubPayment = liveSync.subscribe('PAYMENT_COMPLETED', () => loadData());
    const unsubUpdated = liveSync.subscribe('ORDER_UPDATED', () => loadData());

    const interval = setInterval(loadData, 4000);
    return () => {
      unsubKds();
      unsubTable();
      unsubPayment();
      unsubUpdated();
      clearInterval(interval);
    };
  }, [loadData]);

  // Abrir Modal de Personalizaciones Coherentes según la Categoría del Producto
  const handleOpenCustomize = async (prod) => {
    setStockWarning(null);
    const availability = await checkProductStockAvailability(prod.id, 1);

    if (!availability.available) {
      setStockWarning({
        product: prod.name,
        missing: availability.missingIngredient,
        needed: availability.needed,
        current: availability.current,
        unitCode: availability.unitCode
      });
      return;
    }

    setCustomizingProduct(prod);
    setSelectedCustomizations([]);
    setCustomNotes('');
    setShowAudioRecorder(false);
    setAttachedAudio(null);
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;

    let extraPrice = 0;
    if (selectedCustomizations.includes('QUESO_EXTRA')) extraPrice += 800;
    const unitPrice = customizingProduct.base_price + extraPrice;

    setCartItems([
      ...cartItems,
      {
        product_id: customizingProduct.id,
        product_name: customizingProduct.name,
        unit_price: unitPrice,
        quantity: 1,
        customizations: selectedCustomizations,
        notes: customNotes.trim(),
        audioMemo: attachedAudio
      }
    ]);

    setCustomizingProduct(null);
  };

  const handleConfirmOrder = async () => {
    if (cartItems.length === 0 || !activeTable) return;

    const existingOrder = orders.find(o => o.table_id === activeTable.id && o.status !== 'PAGADO');

    setIsSubmitting(true);
    try {
      if (existingOrder) {
        await addItemToActiveOrder({
          orderId: existingOrder.id,
          items: cartItems,
          waiterName: activeUser.name
        });
      } else {
        await createOrderWithStockDeduction({
          tableId: activeTable.id,
          tableName: activeTable.name,
          waiterId: activeUser.id,
          waiterName: activeUser.name,
          diners: diners,
          items: cartItems,
          isTakeout: activeTable.id === 'TAKEOUT'
        }, { id: 'SALONERO', name: activeUser.name });
      }

      setIsSubmitting(false);
      setCartItems([]);
      setActiveTable(null);
      await loadData();
    } catch (err) {
      setIsSubmitting(false);
      alert('Error en pedido: ' + err.message);
    }
  };

  const handleConfirmRemoveItem = async (e) => {
    e.preventDefault();
    setRemoveError('');

    if (!writtenReason || writtenReason.trim().length < 8) {
      setRemoveError('Debe escribir la explicación del motivo (mínimo 8 caracteres).');
      return;
    }

    const activeOrd = orders.find(o => o.table_id === activeTable.id && o.status !== 'PAGADO');
    if (!activeOrd) return;

    setIsSubmitting(true);
    try {
      await removeItemFromOrder({
        orderId: activeOrd.id,
        itemIndex: removingItemIndex,
        writtenReason: writtenReason,
        userName: activeUser.name,
        managerPin: managerPin
      });

      setIsSubmitting(false);
      setRemovingItemIndex(null);
      setWrittenReason('');
      setManagerPin('');
      await loadData();
    } catch (err) {
      setIsSubmitting(false);
      setRemoveError(err.message || 'Error al retirar producto.');
    }
  };

  const handleRequestBill = async (orderId) => {
    try {
      await requestBillForTable(orderId, activeUser.name);
      await loadData();
    } catch (err) {
      alert('Error al solicitar pre-cuenta: ' + err.message);
    }
  };

  const filteredProducts = selectedCategory === 'ALL'
    ? products
    : products.filter(p => p.category_id === selectedCategory);

  // Obtener Opciones Coherentes del Producto Activo
  const currentModifiers = customizingProduct 
    ? (PRODUCT_SPECIFIC_MODIFIERS[customizingProduct.category_id] || PRODUCT_SPECIFIC_MODIFIERS['cat-carnes-res'])
    : [];

  return (
    <div className="space-y-6">
      {/* Header Vista General de Mesas para Todos los Saloneros */}
      <div className="glass-panel p-4 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#5d402b]/15 p-2.5 rounded-2xl border border-[#5d402b]/30 text-[#5d402b]">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-base text-[#1f1209] flex items-center gap-2">
              Vista General de Mesas del Restaurante
            </h2>
            <p className="text-xs text-[#3d2717] font-semibold">
              Salonero Activo: <strong className="text-[#5d402b] font-bold">{activeUser.name}</strong> • Tarjetas consolidadas por mesa
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Pedidos Listos */}
      {readyNotification && (
        <div className="bg-[#46593a]/20 border border-[#46593a]/50 p-4 rounded-2xl flex items-center justify-between text-[#1f2d17] shadow-xl animate-bounce">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#46593a] shrink-0" />
            <div>
              <p className="font-bold text-sm text-[#1f2d17]">¡PLATILLO LISTO PARA ENTREGAR!</p>
              <p className="text-xs">Mesa: <strong className="text-[#1f1209]">{readyNotification.tableName}</strong> • Pedido {readyNotification.orderId} listo a las {readyNotification.time}</p>
            </div>
          </div>
          <button
            onClick={() => setReadyNotification(null)}
            className="bg-[#46593a] text-white font-bold px-3.5 py-1.5 rounded-xl text-xs hover:bg-[#34442a] transition-all shadow-sm"
          >
            Entregado a la Mesa
          </button>
        </div>
      )}

      {/* Grid de Mesas Consolidadas (UN SOLO CUADRO POR MESA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tables.map(t => {
          const activeOrd = orders.find(o => o.table_id === t.id && o.status !== 'PAGADO' && o.status !== 'pagado');

          return (
            <div
              key={t.id}
              onClick={() => setActiveTable(t)}
              className={`glass-card p-4 rounded-3xl border cursor-pointer flex flex-col justify-between min-h-[170px] transition-all bg-[#fffdf9] ${
                activeOrd 
                  ? activeOrd.account_status === 'EN_COBRO'
                    ? 'border-purple-700 bg-purple-50/50 ring-1 ring-purple-500/40'
                    : activeOrd.status === 'ESPERANDO_CUENTA'
                    ? 'border-indigo-700 bg-indigo-50/50 ring-1 ring-indigo-500/40'
                    : activeOrd.status === 'LISTO_PARA_ENTREGA' || activeOrd.status === 'listo'
                    ? 'border-[#46593a] bg-[#46593a]/15 ring-1 ring-[#46593a]/40 animate-pulse'
                    : 'border-[#5d402b] bg-[#faf6ee]'
                  : 'border-[#dac8b3] hover:border-[#5d402b]'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm text-[#1f1209]">{t.name} <span className="text-xs text-[#3d2717] font-mono">({t.capacity}p)</span></h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeOrd 
                      ? activeOrd.account_status === 'EN_COBRO'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : activeOrd.status === 'ESPERANDO_CUENTA'
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                        : activeOrd.status === 'LISTO_PARA_ENTREGA' || activeOrd.status === 'listo'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-[#5d402b]/15 text-[#5d402b] border-[#5d402b]/30' 
                      : 'bg-[#46593a]/20 text-[#1f2d17] border-[#46593a]/40'
                  }`}>
                    {activeOrd ? (activeOrd.account_status === 'EN_COBRO' ? 'En Cobro' : `Estado: ${activeOrd.status}`) : 'Disponible'}
                  </span>
                </div>
                <p className="text-xs text-[#3d2717] font-bold">{t.zone}</p>
              </div>

              {activeOrd ? (
                <div className="mt-3 pt-2 border-t border-[#dac8b3] space-y-2">
                  <div className="text-xs font-mono flex justify-between">
                    <span className="text-[#1f1209] font-sans font-bold">Responsable: <strong className="text-[#5d402b]">{activeOrd.waiter_name}</strong></span>
                    <strong className="text-[#5d402b] font-extrabold text-sm">₡{activeOrd.total.toLocaleString()}</strong>
                  </div>

                  {activeOrd.status !== 'ESPERANDO_CUENTA' && activeOrd.account_status !== 'EN_COBRO' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestBill(activeOrd.id);
                      }}
                      className="w-full bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold text-[11px] py-1.5 rounded-lg transition-all"
                    >
                      Solicitar Pre-Cuenta
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Abrir Pedido Rápidamente
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de Toma / Modificación de Pedido */}
      {activeTable && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#1f1209] w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#2c1d13] text-[#f7f2e9] border-b border-[#422c1d] p-4 flex justify-between items-center">
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#f7f2e9]">Gestionar Pedido - {activeTable.name}</h3>
                <p className="text-xs text-[#c4b1a1]">Menú La Vid Steakhouse 2025 • Salonero: <strong className="text-[#d8c4a7]">{activeUser.name}</strong></p>
              </div>
              <button onClick={() => setActiveTable(null)} className="p-2 bg-[#1f140d] text-[#c4b1a1] hover:text-[#f7f2e9] rounded-xl border border-[#4a3324]">✕</button>
            </div>

            {/* Si la mesa está en proceso de cobro en Caja, bloquear edición */}
            {orders.find(o => o.table_id === activeTable.id && o.status !== 'PAGADO')?.account_status === 'EN_COBRO' ? (
              <div className="p-12 text-center space-y-3 bg-[#faf6ee]">
                <Lock className="w-12 h-12 text-purple-700 mx-auto" />
                <h4 className="font-heading font-extrabold text-lg text-[#1f1209]">Esta cuenta está siendo procesada por Caja en este momento</h4>
                <p className="text-xs text-[#3d2717] font-semibold max-w-md mx-auto">
                  La cajera está emitiendo el pago y la factura. No se pueden realizar modificaciones concurrentes hasta finalizar el proceso.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden bg-[#faf6ee]">
                {/* Selección del Menú La Vid 2025 Left */}
                <div className="md:col-span-7 p-4 border-r border-[#dac8b3] overflow-y-auto space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button
                      onClick={() => setSelectedCategory('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === 'ALL' ? 'bg-[#5d402b] text-[#fffdf9] border border-[#3e2718]' : 'bg-[#fffdf9] text-[#3d2717] border border-[#dac8b3] hover:bg-[#f5efe6]'}`}
                    >
                      Todos
                    </button>
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === c.id ? 'bg-[#5d402b] text-[#fffdf9] border border-[#3e2718]' : 'bg-[#fffdf9] text-[#3d2717] border border-[#dac8b3] hover:bg-[#f5efe6]'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  {stockWarning && (
                    <div className="bg-rose-100 border border-rose-300 p-3 rounded-xl text-xs text-[#802319] flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#802319]" />
                      <span>No hay stock suficiente de {stockWarning.missing} para preparar {stockWarning.product}.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredProducts.map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => handleOpenCustomize(prod)}
                        className="glass-card p-3.5 rounded-2xl border border-[#dac8b3] bg-[#fffdf9] hover:border-[#5d402b] cursor-pointer flex flex-col justify-between shadow-sm transition-all"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-heading font-extrabold text-xs text-[#1f1209]">{prod.name}</h4>
                            {prod.is_gluten_free && <span className="bg-[#46593a]/20 text-[#1f2d17] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#46593a]/40">GF</span>}
                          </div>
                          <p className="text-[11px] text-[#3d2717] font-semibold mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[#dac8b3] font-mono font-extrabold text-[#5d402b] text-xs flex justify-between items-center">
                          <span>₡{prod.base_price.toLocaleString()}</span>
                          <span className="bg-[#46593a]/20 text-[#1f2d17] px-2 py-0.5 rounded-lg text-[10px] font-sans font-extrabold flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Agregar
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comanda en Servicio y Productos Activos Right */}
                <div className="md:col-span-5 p-4 bg-[#f5efe6] flex flex-col justify-between space-y-4 border-t md:border-t-0 border-[#dac8b3]">
                  <div className="space-y-3">
                    {orders.find(o => o.table_id === activeTable.id && o.status !== 'PAGADO') && (
                      <div>
                        <h4 className="font-heading font-extrabold text-xs text-[#1f1209] mb-1">Productos Registrados en Mesa</h4>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                          {orders.find(o => o.table_id === activeTable.id && o.status !== 'PAGADO')?.items.map((item, idx) => (
                            <div key={idx} className={`p-2 rounded-xl border flex justify-between items-center text-xs ${
                              item.status === 'RETIRADO_DE_CUENTA' ? 'bg-rose-100 border-rose-300 opacity-60 line-through text-[#802319]' : 'bg-[#fffdf9] border-[#dac8b3] text-[#1f1209]'
                            }`}>
                              <div>
                                <p className="font-bold text-[#1f1209]">{item.quantity}x {item.product_name}</p>
                                {item.notes && <p className="text-[10px] text-[#5d402b] font-mono font-bold">[{item.notes}]</p>}
                                {item.audioMemo && (
                                  <p className="text-[10px] text-sky-800 font-bold flex items-center gap-1">
                                    <Mic className="w-3 h-3 text-sky-700" /> Audio adjunto ({item.audioMemo.duration}s)
                                  </p>
                                )}
                              </div>
                              {item.status !== 'RETIRADO_DE_CUENTA' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRemovingItemIndex(idx);
                                    setWrittenReason('');
                                    setManagerPin('');
                                    setRemoveError('');
                                  }}
                                  className="p-1 bg-rose-100 text-[#802319] hover:bg-rose-200 border border-rose-300 rounded-lg text-[10px] font-bold"
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-heading font-extrabold text-xs text-[#1f1209] mb-1">Adiciones Nuevas ({cartItems.length})</h4>
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {cartItems.map((item, idx) => (
                          <div key={idx} className="bg-[#fffdf9] p-2.5 rounded-2xl border border-[#dac8b3] flex justify-between text-xs shadow-sm">
                            <div>
                              <p className="font-bold text-[#1f1209]">{item.product_name}</p>
                              {item.notes && <p className="text-[10px] text-[#5d402b] font-mono font-bold">[{item.notes}]</p>}
                              {item.audioMemo && <p className="text-[10px] text-sky-800 font-bold">🎤 Audio Grabado ({item.audioMemo.duration}s)</p>}
                              <p className="text-[10px] text-[#5d402b] font-mono font-extrabold">₡{(item.unit_price * item.quantity).toLocaleString()}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
                              className="text-rose-700 font-bold px-2 hover:bg-rose-100 rounded-lg"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmOrder}
                    disabled={cartItems.length === 0 || isSubmitting}
                    className="w-full bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] font-extrabold text-xs py-3.5 rounded-2xl transition-all shadow-lg border border-[#3e2718] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Procesando Transacción...' : 'ENVIAR A COCINA & ACTUALIZAR CUENTA'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Personalizaciones Coherentes + Grabador de Audio */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#1f1209] w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#dac8b3] pb-3">
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#1f1209]">Personalizar {customizingProduct.name}</h3>
                <p className="text-xs text-[#3d2717] font-semibold">Opciones e ingredientes de {customizingProduct.category_id}</p>
              </div>
              <button onClick={() => setCustomizingProduct(null)} className="text-[#3d2717] hover:text-[#1f1209] font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-extrabold text-[#1f1209] uppercase tracking-wider block font-mono">Opciones e Ingredientes</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentModifiers.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (selectedCustomizations.includes(opt.id)) {
                        setSelectedCustomizations(selectedCustomizations.filter(i => i !== opt.id));
                      } else {
                        setSelectedCustomizations([...selectedCustomizations, opt.id]);
                      }
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                      selectedCustomizations.includes(opt.id) ? 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718]' : 'bg-[#fffdf9] border-[#dac8b3] text-[#1f1209] hover:bg-[#f5efe6]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1f1209] uppercase tracking-wider block mb-1 font-mono">Indicación Especial Escrita</label>
                <input
                  type="text"
                  placeholder="Ej. Servir salsa en recipiente separado..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold placeholder-[#3d2717]/60"
                />
              </div>

              {/* Botón & Grabador por Audio */}
              <div className="pt-2">
                {!showAudioRecorder ? (
                  <button
                    type="button"
                    onClick={() => setShowAudioRecorder(true)}
                    className="w-full bg-[#fffdf9] hover:bg-[#f5efe6] text-[#5d402b] border border-[#dac8b3] text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Mic className="w-4 h-4 text-[#5d402b]" />
                    <span>{attachedAudio ? '🔊 Audio Adjunto (Cambiar)' : '🎤 Grabar Indicación por Audio'}</span>
                  </button>
                ) : (
                  <AudioMemoRecorder
                    onAudioRecorded={(data) => {
                      setAttachedAudio(data);
                      setShowAudioRecorder(false);
                    }}
                    onCancel={() => setShowAudioRecorder(false)}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#dac8b3]">
              <button type="button" onClick={() => setCustomizingProduct(null)} className="px-4 py-2 bg-[#fffdf9] border border-[#dac8b3] text-[#3d2717] text-xs font-bold rounded-xl hover:bg-[#f5efe6]">Cancelar</button>
              <button type="button" onClick={handleConfirmCustomization} className="px-4 py-2 bg-[#5d402b] text-[#fffdf9] font-bold text-xs rounded-xl shadow-md border border-[#3e2718]">Agregar al Pedido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Quitar Producto con Motivo Escrito Obligatorio */}
      {removingItemIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-700 w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" /> Quitar Producto del Pedido
            </h3>

            <form onSubmit={handleConfirmRemoveItem} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Motivo Escrito Obligatorio (Mínimo 8 caracteres)
                </label>
                <textarea
                  rows={3}
                  placeholder="Explique el motivo (Ej. El producto no fue entregado a la mesa)..."
                  value={writtenReason}
                  onChange={(e) => setWrittenReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  PIN de Autorización (Si ya fue preparado)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="PIN Gerente (9999)"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400"
                />
              </div>

              {removeError && (
                <div className="bg-rose-500/20 border border-rose-500/40 p-2.5 rounded-xl text-xs text-rose-300 font-bold">
                  {removeError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRemovingItemIndex(null)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl">Confirmar Retiro DB</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
