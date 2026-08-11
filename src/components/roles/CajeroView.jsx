import React from 'react';
import { 
  CreditCard, DollarSign, CheckCircle2, RefreshCw, 
  Trash2, AlertTriangle, Lock, FileText, ArrowRight, ShieldCheck
} from 'lucide-react';
import { dbGetAll, dbGet } from '../../services/db.js';
import { removeItemFromOrder, setOrderCheckoutLock } from '../../services/orderService.js';
import { processOrderPayment } from '../../services/paymentService.js';
import { getFiscalQueue } from '../../services/fiscalService.js';

export default function CajeroView() {
  const [orders, setOrders] = React.useState([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState(null);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Formulario de Pago
  const [paymentMethod, setPaymentMethod] = React.useState('Efectivo');
  const [amountPaidInput, setAmountPaidInput] = React.useState('');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [cardType, setCardType] = React.useState('Visa');
  const [customerName, setCustomerName] = React.useState('Consumidor Final');
  const [customerId, setCustomerId] = React.useState('000000000');
  const [customerEmail, setCustomerEmail] = React.useState('cliente@lavidsteakhouse.cr');
  const [paymentNotes, setPaymentNotes] = React.useState('');
  const [paymentError, setPaymentError] = React.useState('');

  // Modal para Quitar Producto
  const [removingItemIndex, setRemovingItemIndex] = React.useState(null);
  const [writtenReason, setWrittenReason] = React.useState('');
  const [managerPin, setManagerPin] = React.useState('');
  const [removeError, setRemoveError] = React.useState('');
  const [recalcSummary, setRecalcSummary] = React.useState(null);

  const loadCajaData = React.useCallback(async () => {
    const allOrders = await dbGetAll('orders');
    const pendingOrders = allOrders.filter(o => o.status !== 'PAGADO' && o.status !== 'CANCELADO');
    setOrders(pendingOrders);

    if (selectedOrderId) {
      const currentSelected = pendingOrders.find(o => o.id === selectedOrderId);
      setSelectedOrder(currentSelected || null);
      if (currentSelected && (!amountPaidInput || Number(amountPaidInput) < currentSelected.total)) {
        setAmountPaidInput(currentSelected.total.toString());
      }
    } else if (pendingOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(pendingOrders[0].id);
      setSelectedOrder(pendingOrders[0]);
      setAmountPaidInput(pendingOrders[0].total.toString());
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, amountPaidInput]);

  React.useEffect(() => {
    loadCajaData();
  }, [loadCajaData]);

  const handleSelectOrder = async (orderId) => {
    setSelectedOrderId(orderId);
    setPaymentError('');
    setRecalcSummary(null);
    const ord = orders.find(o => o.id === orderId);
    if (ord) {
      setSelectedOrder(ord);
      setAmountPaidInput(ord.total.toString());
      await setOrderCheckoutLock(orderId, true);
    }
  };

  // Quitar Producto de la Cuenta con Recálculo Dinámico
  const handleConfirmRemoveItem = async (e) => {
    e.preventDefault();
    setRemoveError('');

    if (!writtenReason || writtenReason.trim().length < 8) {
      setRemoveError('Debe escribir la explicación del motivo (mínimo 8 caracteres).');
      return;
    }

    if (!selectedOrder) return;
    const itemTarget = selectedOrder.items[removingItemIndex];
    if (!itemTarget) return;

    const previousTotal = selectedOrder.total;
    setIsProcessing(true);

    try {
      const updatedOrd = await removeItemFromOrder({
        orderId: selectedOrder.id,
        itemIndex: removingItemIndex,
        writtenReason: writtenReason,
        userName: 'Ana Cajera',
        managerPin: managerPin
      });

      setIsProcessing(false);
      setSelectedOrder(updatedOrd);
      setRemovingItemIndex(null);
      setWrittenReason('');
      setManagerPin('');
      setAmountPaidInput(updatedOrd.total.toString());

      setRecalcSummary({
        previousTotal: previousTotal,
        removedItemName: itemTarget.product_name,
        removedAmount: itemTarget.item_total || (itemTarget.unit_price * itemTarget.quantity),
        newTotal: updatedOrd.total
      });

      await loadCajaData();
    } catch (err) {
      setIsProcessing(false);
      setRemoveError(err.message || 'Error al retirar producto desde Caja.');
    }
  };

  // Confirmar Pago Transaccional & Generar Factura Automática
  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    setPaymentError('');

    const numericPaid = Number(amountPaidInput) || selectedOrder.total;

    if (paymentMethod === 'Efectivo' && numericPaid < selectedOrder.total) {
      setPaymentError(`El monto recibido (₡${numericPaid.toLocaleString()}) no puede ser menor al total a pagar (₡${selectedOrder.total.toLocaleString()}).`);
      return;
    }

    setIsProcessing(true);

    try {
      const result = await processOrderPayment({
        orderId: selectedOrder.id,
        paymentMethod: paymentMethod,
        amountPaid: numericPaid,
        referenceNumber: referenceNumber,
        cardType: cardType,
        customerName: customerName.trim() || 'Consumidor Final',
        customerId: customerId.trim() || '000000000',
        customerEmail: customerEmail.trim() || 'cliente@lavidsteakhouse.cr',
        cashierName: 'Ana Cajera',
        notes: paymentNotes
      });

      setIsProcessing(false);

      let msg = `¡Cobro exitoso!\n\n` +
        `• Factura Emitida: ${result.invoice.consecutivo}\n` +
        `• Total: ₡${result.order.total.toLocaleString()}\n` +
        `• Método: ${paymentMethod}\n`;

      if (paymentMethod === 'Efectivo' && result.change > 0) {
        msg += `• Monto Recibido: ₡${numericPaid.toLocaleString()}\n` +
          `• CAMBIO / VUELTO: ₡${result.change.toLocaleString()}\n`;
      }

      msg += `\nMesa ${selectedOrder.table_name} liberada automáticamente. Guardado en apartado Facturas.`;

      alert(msg);

      setSelectedOrderId(null);
      setSelectedOrder(null);
      setRecalcSummary(null);
      setReferenceNumber('');
      setPaymentNotes('');
      await loadCajaData();
    } catch (err) {
      setIsProcessing(false);
      setPaymentError(err.message || 'Error en el procesamiento del pago.');
    }
  };

  const calculatedChange = Math.max(0, (Number(amountPaidInput) || 0) - (selectedOrder?.total || 0));

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
            <p className="text-xs text-[#3d2717] font-semibold">Cajera: <strong className="text-[#5d402b]">Ana Cajera</strong> • Selección fluida y cobro de cuentas</p>
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
        
        {/* Lista de Cuentas Pendientes (Columna Izquierda) */}
        <div className="md:col-span-5 glass-panel p-4 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] space-y-3 shadow-md">
          <h3 className="font-bold text-xs text-[#3d2717] uppercase tracking-wider font-mono">Cuentas Pendientes ({orders.length})</h3>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
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
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          selectedOrderId === ord.id ? 'bg-[#fffdf9]/20 text-[#fffdf9] border-[#fffdf9]/40' : 'bg-[#c86414]/20 text-[#c86414] border-[#c86414]/40'
                        }`}>
                          Pre-cuenta
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${selectedOrderId === ord.id ? 'text-[#e2d7c5]' : 'text-[#3d2717]'}`}>
                      Salonero: {ord.waiter_name} • {ord.items.filter(i => i.status !== 'RETIRADO_DE_CUENTA').length} ítems
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`font-mono font-extrabold text-sm ${selectedOrderId === ord.id ? 'text-[#fffdf9]' : 'text-[#5d402b]'}`}>
                      ₡{ord.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detalle de Cuenta Seleccionada & Formulario de Pago (Columna Derecha) */}
        <div className="md:col-span-7 glass-panel p-5 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] space-y-4 flex flex-col justify-between shadow-md">
          {selectedOrder ? (
            <>
              <div>
                <div className="flex justify-between items-start border-b border-[#dac8b3] pb-3">
                  <div>
                    <h3 className="font-heading font-extrabold text-base text-[#1f1209] flex items-center gap-2">
                      Detalle de Cuenta - {selectedOrder.table_name}
                      <span className="text-xs text-[#3d2717] font-mono font-bold">({selectedOrder.id})</span>
                    </h3>
                    <p className="text-xs text-[#3d2717] font-semibold">Salonero: <strong className="text-[#5d402b]">{selectedOrder.waiter_name}</strong></p>
                  </div>
                  <span className="bg-[#5d402b]/15 text-[#5d402b] border border-[#5d402b]/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> En Proceso de Cobro
                  </span>
                </div>

                {/* Banner de Recálculo Dinámico al Quitar Productos */}
                {recalcSummary && (
                  <div className="mt-3 bg-[#c86414]/15 border border-[#c86414]/40 p-3 rounded-2xl text-xs space-y-1 text-[#1f1209]">
                    <p className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-[#c86414]" /> Recálculo Automático por Retiro de Producto:
                    </p>
                    <div className="flex flex-wrap justify-between font-mono text-[11px] font-bold">
                      <span>Monto Anterior: ₡{recalcSummary.previousTotal.toLocaleString()}</span>
                      <span className="text-[#802319]">Retirado: {recalcSummary.removedItemName} (-₡{recalcSummary.removedAmount.toLocaleString()})</span>
                      <strong className="text-[#5d402b]">Nuevo Total: ₡{recalcSummary.newTotal.toLocaleString()}</strong>
                    </div>
                  </div>
                )}

                {/* REQUERIMIENTO 5: LISTA DE PRODUCTOS CON BOTÓN "QUITAR" DIRECTAMENTE AL LADO */}
                <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => {
                    const isRemoved = item.status === 'RETIRADO_DE_CUENTA';
                    const itemSubtotal = item.item_total || (item.unit_price * item.quantity);

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                          isRemoved 
                            ? 'bg-rose-100/60 border-rose-300 text-stone-500 line-through' 
                            : 'bg-[#fffdf9] border-[#dac8b3] text-[#1f1209] shadow-sm'
                        }`}
                      >
                        {/* Nombre del Producto y Especificaciones */}
                        <div className="flex-1">
                          <p className="font-bold text-[#1f1209] text-xs">
                            {item.quantity}x {item.product_name}
                          </p>
                          {item.notes && <p className="text-[10px] text-[#5d402b] font-mono font-bold">[{item.notes}]</p>}
                          {item.removal_reason && <p className="text-[10px] text-[#802319] italic font-semibold">Motivo retiro: {item.removal_reason}</p>}
                        </div>

                        {/* Precio Subtotal y BOTÓN QUITAR DIRECTAMENTE AL LADO */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <span className="font-mono font-extrabold text-[#5d402b] text-xs">
                            ₡{itemSubtotal.toLocaleString()}
                          </span>

                          {!isRemoved && (
                            <button
                              type="button"
                              onClick={() => {
                                setRemovingItemIndex(idx);
                                setWrittenReason('');
                                setManagerPin('');
                                setRemoveError('');
                              }}
                              className="bg-rose-100 hover:bg-rose-200 text-[#802319] border border-rose-300 font-extrabold px-2.5 py-1 rounded-xl text-[11px] flex items-center gap-1 transition-all shadow-sm"
                              title="Quitar este producto del cobro antes de pagar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>[- Quitar]</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desglose Fiscal & Totales Reales */}
                <div className="mt-4 p-3.5 bg-[#fffdf9] rounded-2xl border border-[#dac8b3] space-y-1 text-xs font-mono shadow-sm">
                  <div className="flex justify-between text-[#3d2717] font-semibold">
                    <span>Subtotal Activo:</span>
                    <span>₡{selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#3d2717] font-semibold">
                    <span>IVA (13%):</span>
                    <span>₡{selectedOrder.tax_iva.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#3d2717] font-semibold">
                    <span>Servicio Mesa (10%):</span>
                    <span>₡{selectedOrder.tax_service.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#5d402b] text-base font-extrabold pt-1.5 border-t border-[#dac8b3]">
                    <span>TOTAL A COBRAR:</span>
                    <span className="text-lg">₡{selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Formulario Completo de Registro de Pago (Efectivo, Tarjeta, SINPE) */}
              <div className="space-y-3 pt-3 border-t border-[#dac8b3]">
                {paymentError && (
                  <div className="bg-rose-100 border border-rose-300 p-2.5 rounded-xl text-xs text-[#802319] font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#802319]" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Selector Método de Pago */}
                  <div>
                    <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Método de Pago *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setPaymentError('');
                        if (e.target.value === 'Efectivo') {
                          setAmountPaidInput(selectedOrder.total.toString());
                        }
                      }}
                      className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold focus:outline-none focus:border-[#5d402b]"
                    >
                      <option value="Efectivo">Efectivo Colones</option>
                      <option value="Tarjeta POS">Tarjeta POS / Datafono</option>
                      <option value="SINPE Movil">SINPE Móvil</option>
                      <option value="Otro">Otro Método</option>
                    </select>
                  </div>

                  {/* Campos Dinámicos según Método de Pago */}
                  {paymentMethod === 'Efectivo' ? (
                    <>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Monto Recibido *</label>
                        <input
                          type="number"
                          value={amountPaidInput}
                          onChange={(e) => setAmountPaidInput(e.target.value)}
                          placeholder="Monto entregado..."
                          className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold font-mono focus:outline-none focus:border-[#5d402b]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Cambio / Vuelto</label>
                        <div className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-extrabold flex items-center justify-between ${
                          calculatedChange >= 0 ? 'bg-[#46593a]/15 text-[#1f2d17] border-[#46593a]/40' : 'bg-rose-100 text-[#802319] border-rose-300'
                        }`}>
                          <span>₡{calculatedChange.toLocaleString()}</span>
                          <span className="text-[10px]">Vuelto</span>
                        </div>
                      </div>
                    </>
                  ) : paymentMethod === 'Tarjeta POS' ? (
                    <>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Tipo Tarjeta</label>
                        <select
                          value={cardType}
                          onChange={(e) => setCardType(e.target.value)}
                          className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold"
                        >
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="AMEX">American Express</option>
                          <option value="BAC">BAC Credomatic</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Voucher / Referencia *</label>
                        <input
                          type="text"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="Nº Autorización..."
                          className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Comprobante SINPE *</label>
                        <input
                          type="text"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="Nº Referencia SINPE..."
                          className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Estado Pago</label>
                        <div className="w-full bg-[#46593a]/15 text-[#1f2d17] border border-[#46593a]/40 rounded-xl px-3 py-2 text-xs font-bold font-mono">
                          Confirmado
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Datos de Factura Electrónica */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Cliente Factura</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre o Razón Social..."
                      className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-[#1f1209] uppercase block mb-1 font-mono">Cédula / Correo</label>
                    <input
                      type="text"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="correo@cliente.cr"
                      className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold"
                    />
                  </div>
                </div>

                {/* Botón Principal de Confirmación */}
                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] font-extrabold text-xs py-3.5 rounded-2xl shadow-xl transition-all border border-[#3e2718] flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    'Procesando Pago & Factura Automática...'
                  ) : (
                    <>
                      <span>CONFIRMAR PAGO & EMITIR FACTURA (₡{selectedOrder.total.toLocaleString()})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-[#3d2717]">
              <FileText className="w-12 h-12 mx-auto text-[#5d402b] mb-2 opacity-60" />
              <p className="font-bold text-sm text-[#1f1209]">Selecciona una cuenta pendiente de la izquierda</p>
              <p className="text-xs text-[#3d2717]">Podrás revisar productos, quitar ítems y procesar el cobro.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal para Quitar Producto con Motivo Escrito y PIN */}
      {removingItemIndex !== null && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#1f1209] w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="font-heading font-extrabold text-base text-[#1f1209] flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-[#802319]" /> Quitar Producto de la Cuenta
            </h3>

            <p className="text-xs text-[#3d2717] font-semibold">
              Producto: <strong className="text-[#1f1209]">{selectedOrder.items[removingItemIndex]?.product_name}</strong>
            </p>

            <form onSubmit={handleConfirmRemoveItem} className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-[#1f1209] block mb-1 font-mono">
                  Explicación del Motivo * (Mínimo 8 caracteres)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej. El cliente decidió no consumir la entrada..."
                  value={writtenReason}
                  onChange={(e) => setWrittenReason(e.target.value)}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-xs text-[#1f1209] font-bold focus:outline-none focus:border-[#5d402b]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1f1209] block mb-1 font-mono">
                  PIN de Autorización (PIN: 9999 si ya se preparó)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="PIN Gerente (9999)"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-center text-xs font-mono font-bold text-[#5d402b]"
                />
              </div>

              {removeError && <p className="text-xs text-[#802319] font-bold">{removeError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#dac8b3]">
                <button
                  type="button"
                  onClick={() => setRemovingItemIndex(null)}
                  className="px-4 py-2 bg-[#fffdf9] border border-[#dac8b3] text-[#3d2717] text-xs font-bold rounded-xl hover:bg-[#f5efe6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#802319] hover:bg-[#601912] text-[#fffdf9] font-bold text-xs rounded-xl shadow-md"
                >
                  Confirmar Retiro & Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
