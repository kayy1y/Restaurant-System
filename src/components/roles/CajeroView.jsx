import React from 'react';
import { 
  CreditCard, DollarSign, Receipt, CheckCircle2, ShieldCheck, 
  Send, RefreshCw, AlertCircle, FileText, Lock, MoreVertical, Trash2, Edit3 
} from 'lucide-react';

import { getActiveOrdersForWaiters, processPaymentAndReleaseTable, removeItemFromOrder } from '../../services/orderService.js';
import { getFiscalQueue, emitFiscalDocumentV43 } from '../../services/fiscalService.js';
import { liveSync } from '../../services/liveSync.js';

export default function CajeroView() {
  const [orders, setOrders] = React.useState([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState(null);
  const [paymentMethod, setPaymentMethod] = React.useState('Tarjeta POS');
  const [customerName, setCustomerName] = React.useState('Consumidor Final');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [fiscalQueue, setFiscalQueue] = React.useState([]);

  // Menú contextual desplegable [ ⋮ ] por línea de producto
  const [openLineMenuIndex, setOpenLineMenuIndex] = React.useState(null);

  // Formulario para Quitar Producto desde Caja con Motivo Escrito Obligatorio
  const [removingItemIndex, setRemovingItemIndex] = React.useState(null);
  const [writtenReason, setWrittenReason] = React.useState('');
  const [managerPin, setManagerPin] = React.useState('');
  const [removeError, setRemoveError] = React.useState('');
  const [recalcSummary, setRecalcSummary] = React.useState(null);

  const loadCajaData = React.useCallback(async () => {
    try {
      const activeOrds = await getActiveOrdersForWaiters();
      setOrders(activeOrds);
      const fq = await getFiscalQueue();
      setFiscalQueue(fq);

      setSelectedOrderId(prevId => {
        if (prevId && activeOrds.some(o => o.id === prevId)) return prevId;
        return activeOrds.length > 0 ? activeOrds[0].id : null;
      });
    } catch (err) {
      console.error('Error cargando datos de caja:', err);
    }
  }, []);

  React.useEffect(() => {
    loadCajaData();

    // Sincronización puramente orientada a eventos para 0 lag al cambiar de cuenta
    const unsubBill = liveSync.subscribe('BILL_REQUESTED', () => loadCajaData());
    const unsubOrder = liveSync.subscribe('ORDER_CREATED', () => loadCajaData());
    const unsubUpdated = liveSync.subscribe('ORDER_UPDATED', () => loadCajaData());
    const unsubTable = liveSync.subscribe('TABLE_RELEASED', () => loadCajaData());
    const unsubPayment = liveSync.subscribe('PAYMENT_COMPLETED', () => loadCajaData());

    return () => {
      unsubBill();
      unsubOrder();
      unsubUpdated();
      unsubTable();
      unsubPayment();
    };
  }, [loadCajaData]);

  // Selección fluida e instantánea de cuenta sin saltos de scroll ni re-renders innecesarios
  const handleSelectOrder = (ordId) => {
    setSelectedOrderId(ordId);
    setRecalcSummary(null);
    setOpenLineMenuIndex(null);
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  // Quitar Producto desde la Pantalla de Cobro con Motivo Escrito Obligatorio
  const handleConfirmRemoveFromCaja = async (e) => {
    e.preventDefault();
    setRemoveError('');

    if (!writtenReason || writtenReason.trim().length < 8) {
      setRemoveError('Debe escribir la explicación del motivo (mínimo 8 caracteres). Ej: "El producto no fue entregado al cliente".');
      return;
    }

    if (!selectedOrder) return;

    const previousTotal = selectedOrder.total;
    const itemTarget = selectedOrder.items[removingItemIndex];

    setIsProcessing(true);
    try {
      const updatedOrd = await removeItemFromOrder({
        orderId: selectedOrder.id,
        itemIndex: removingItemIndex,
        writtenReason: writtenReason,
        userName: 'Ana Cajera',
        managerPin: managerPin || '9999'
      });

      setIsProcessing(false);
      setRemovingItemIndex(null);
      setOpenLineMenuIndex(null);
      setWrittenReason('');
      setManagerPin('');

      // Desglose Transparente de Recálculo en Caja
      setRecalcSummary({
        previousTotal: previousTotal,
        removedItemName: itemTarget.product_name,
        removedAmount: itemTarget.item_total,
        newTotal: updatedOrd.total
      });

      await loadCajaData();
    } catch (err) {
      setIsProcessing(false);
      setRemoveError(err.message || 'Error al retirar producto desde Caja.');
    }
  };

  // Confirmar Pago y Generar Factura v4.3
  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;

    setIsProcessing(true);
    try {
      const paidOrder = await processPaymentAndReleaseTable({
        orderId: selectedOrder.id,
        paymentMethod: paymentMethod,
        customerName: customerName,
        cashierName: 'Ana Cajera'
      });

      await emitFiscalDocumentV43({
        orderId: paidOrder.id,
        customerName: customerName,
        customerEmail: customerEmail
      });

      setIsProcessing(false);
      alert(`¡Cobro de ₡${paidOrder.total.toLocaleString()} exitoso! Mesa ${paidOrder.table_name} liberada automáticamente.`);
      setSelectedOrderId(null);
      setRecalcSummary(null);
      await loadCajaData();
    } catch (err) {
      setIsProcessing(false);
      alert('Error en cobro: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 text-[#1f1209]">
      {/* Header de Caja */}
      <div className="glass-panel p-4 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#5d402b]/15 p-2.5 rounded-2xl border border-[#5d402b]/30 text-[#5d402b]">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-lg text-[#1f1209]">Módulo de Caja, Cobros & Comprobantes v4.3</h2>
            <p className="text-xs text-[#3d2717] font-semibold">Cajera: <strong className="text-[#5d402b]">Ana Cajera</strong> • Selección fluida y rápida de cuentas pendientes</p>
          </div>
        </div>

        <button
          onClick={loadCajaData}
          className="bg-[#fffdf9] hover:bg-[#f5efe6] text-[#1f1209] border border-[#dac8b3] text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#5d402b]" />
          <span>Actualizar Cuentas</span>
        </button>
      </div>

      {/* Grid Principal de Cobros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Lista de Cuentas Pendientes Left */}
        <div className="md:col-span-5 glass-panel p-4 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] space-y-3 shadow-md">
          <h3 className="font-bold text-xs text-[#3d2717] uppercase tracking-wider font-mono">Cuentas Pendientes ({orders.length})</h3>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {orders.length === 0 ? (
              <p className="text-xs text-[#3d2717] italic text-center py-8">No hay cuentas pendientes por cobrar.</p>
            ) : (
              orders.map(ord => (
                <div
                  key={ord.id}
                  onClick={() => handleSelectOrder(ord.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                    selectedOrderId === ord.id 
                      ? 'bg-[#5d402b] border-[#3e2718] text-[#fffdf9] shadow-md' 
                      : 'bg-[#fffdf9] border-[#dac8b3] text-[#1f1209] hover:bg-[#f5efe6]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm">{ord.table_name}</h4>
                      {ord.status === 'ESPERANDO_CUENTA' && (
                        <span className="bg-[#c86414]/20 text-[#c86414] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#c86414]/40">
                          Pre-cuenta Solicitada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">Salonero: {ord.waiter_name} • {ord.items.filter(i => i.status !== 'RETIRADO_DE_CUENTA').length} ítems activos</p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-extrabold text-amber-400 text-sm">₡{ord.total.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detalle de Cuenta Seleccionada & Acciones Contextuales Right */}
        <div className="md:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          {selectedOrder ? (
            <>
              <div>
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                      Detalle de Cuenta - {selectedOrder.table_name}
                      <span className="text-xs text-slate-400 font-mono">({selectedOrder.id})</span>
                    </h3>
                    <p className="text-xs text-slate-400">Atendido por <strong className="text-amber-300">{selectedOrder.waiter_name}</strong></p>
                  </div>
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> En Proceso de Cobro
                  </span>
                </div>

                {/* Banner de Recálculo Dinámico */}
                {recalcSummary && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/40 p-3 rounded-xl text-xs space-y-1 text-amber-200">
                    <p className="font-bold">⚠️ RECÁLCULO AUTOMÁTICO EN CAJA:</p>
                    <div className="flex justify-between font-mono text-[11px]">
                      <span>Monto Anterior: ₡{recalcSummary.previousTotal.toLocaleString()}</span>
                      <span>Retirado: {recalcSummary.removedItemName} (-₡{recalcSummary.removedAmount.toLocaleString()})</span>
                      <strong className="text-amber-400">Nuevo Total: ₡{recalcSummary.newTotal.toLocaleString()}</strong>
                    </div>
                  </div>
                )}

                {/* Lista de Productos con Menú Contextual [ ⋮ ] */}
                <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex justify-between items-center text-xs relative ${
                        item.status === 'RETIRADO_DE_CUENTA' ? 'bg-rose-950/20 border-rose-800/60 text-slate-500 line-through' : 'bg-slate-900 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{item.quantity}x {item.product_name}</p>
                        {item.notes && <p className="text-[10px] text-amber-300 font-mono">[{item.notes}]</p>}
                        {item.removal_reason && <p className="text-[9px] text-rose-400 italic">Motivo de retiro: {item.removal_reason}</p>}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-400">₡{item.item_total.toLocaleString()}</span>

                        {item.status !== 'RETIRADO_DE_CUENTA' && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenLineMenuIndex(openLineMenuIndex === idx ? null : idx)}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menú Contextual [ ⋮ ] */}
                            {openLineMenuIndex === idx && (
                              <div className="absolute right-0 top-7 z-20 bg-slate-950 border border-slate-700 rounded-xl p-1.5 shadow-2xl space-y-1 w-44">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRemovingItemIndex(idx);
                                    setWrittenReason('');
                                    setManagerPin('');
                                    setRemoveError('');
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 text-[11px] font-bold flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Quitar de la cuenta
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desglose de Totales Reales DB */}
                <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal Activo:</span>
                    <span>₡{selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>IVA (13%):</span>
                    <span>₡{selectedOrder.tax_iva.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Servicio (10%):</span>
                    <span>₡{selectedOrder.tax_service.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 text-base font-extrabold pt-1 border-t border-slate-800">
                    <span>Total a Cobrar:</span>
                    <span>₡{selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Formulario de Cobro */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Método de Pago</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="Tarjeta POS">Tarjeta POS / Datafono</option>
                      <option value="Efectivo">Efectivo Colones</option>
                      <option value="SINPE Movil">SINPE Móvil</option>
                      <option value="Dolares">Dólares USD</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nombre Cliente Factura</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs py-3.5 rounded-2xl shadow-xl transition-all"
                >
                  {isProcessing ? 'Procesando Pago & Factura v4.3...' : `CONFIRMAR COBRO Y LIBERAR MESA (₡${selectedOrder.total.toLocaleString()})`}
                </button>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-500 italic text-xs">
              Selecciona una cuenta pendiente a la izquierda para procesar el cobro.
            </div>
          )}
        </div>
      </div>

      {/* Modal para Quitar Producto desde Caja con Motivo Escrito Obligatorio */}
      {removingItemIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-700 w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" /> Quitar Producto de la Cuenta (Caja)
            </h3>

            <form onSubmit={handleConfirmRemoveFromCaja} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Motivo del Retiro Escrito Libremente (Mínimo 8 caracteres) *
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej. El producto no fue entregado a la mesa del cliente..."
                  value={writtenReason}
                  onChange={(e) => setWrittenReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  PIN de Autorización de Gerencia (9999)
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
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl">Confirmar Retiro & Recalcular</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
