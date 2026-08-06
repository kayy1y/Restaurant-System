import React from 'react';
import { 
  X, CreditCard, Banknote, PhoneCall, Gift, CheckCircle2, 
  Printer, Mail, FileText, Sparkles, QrCode, ArrowRight 
} from 'lucide-react';
import { calculateTaxesCR, generateClaveFiscalCR } from '../utils/fiscalCR';
import { RESTAURANT_INFO } from '../data/mockData';

export default function CheckoutModal({ 
  order, 
  onClose, 
  onCompletePayment, 
  isOffline,
  currentRole
}) {
  const [paymentMethod, setPaymentMethod] = React.useState('Tarjeta Crédito');
  const [docType, setDocType] = React.useState('01'); // 01=FE, 03=TE
  const [customerName, setCustomerName] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  
  // Payment split
  const [splitMode, setSplitMode] = React.useState('total'); // total, diner, custom
  const [customAmount, setCustomAmount] = React.useState('');
  const [cashGiven, setCashGiven] = React.useState('');
  const [tipPercentage, setTipPercentage] = React.useState(0);

  const taxes = calculateTaxesCR(order.subtotal, order.type !== 'llevar');
  const tipAmount = Math.round(taxes.total * (tipPercentage / 100));
  const finalTotal = taxes.total + tipAmount;

  const cashChange = cashGiven ? Math.max(0, parseFloat(cashGiven) - finalTotal) : 0;

  const handleProcessPayment = () => {
    // Generate Costa Rica v4.3 Fiscal Clave & Consecutivo
    const fiscalData = generateClaveFiscalCR({
      idNumber: RESTAURANT_INFO.idNumber,
      branch: RESTAURANT_INFO.branch,
      terminal: RESTAURANT_INFO.terminal,
      docType: docType,
      sequence: Math.floor(Math.random() * 1000) + 100
    });

    const newInvoice = {
      id: fiscalData.consecutivo,
      clave: fiscalData.clave,
      consecutivo: fiscalData.consecutivo,
      type: fiscalData.docType,
      date: new Date().toISOString(),
      customerName: customerName || "Cliente General",
      customerId: customerId || "000000000",
      customerEmail: customerEmail || "cliente@sabortico.cr",
      orderId: order.id,
      tableName: order.tableName,
      paymentMethod: paymentMethod,
      subtotal: taxes.subtotal,
      serviceTax: taxes.serviceTax,
      ivaTax: taxes.ivaTax,
      tipAmount: tipAmount,
      total: finalTotal,
      status: isOffline ? "Pendiente Envío (Offline)" : "Aceptado Hacienda v4.3",
      items: order.items
    };

    onCompletePayment(newInvoice, order.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel border border-slate-700/80 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Módulo de Cobro y Facturación v4.3 - {order.tableName}
            </h2>
            <p className="text-xs text-slate-400">Pedido ID: {order.id} • Salonero: {order.waiter}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Form & Methods */}
          <div className="md:col-span-7 p-5 border-b md:border-b-0 md:border-r border-slate-800 space-y-5">
            {/* Fiscal Document Type */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Tipo de Comprobante Fiscal (CR v4.3)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDocType('01')}
                  className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                    docType === '01'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Factura Electrónica (FE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocType('03')}
                  className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                    docType === '03'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Tiquete Electrónico (TE)</span>
                </button>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300">Datos del Receptor / Cliente</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombre Completo..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Cédula (Física / Jurídica)..."
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <input
                type="email"
                placeholder="Correo electrónico para envío del XML/PDF..."
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Tarjeta Crédito', label: 'Tarjeta POS', icon: CreditCard },
                  { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
                  { id: 'SINPE Móvil', label: 'SINPE Móvil', icon: PhoneCall },
                  { id: 'Combinado', label: 'Combinado', icon: Gift }
                ].map(method => {
                  const Icon = method.icon;
                  const isSel = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1.5 transition-all ${
                        isSel
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SINPE Móvil Banner if selected */}
            {paymentMethod === 'SINPE Móvil' && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-indigo-300">Transferencia SINPE Móvil Costa Rica</p>
                  <p className="text-slate-400 mt-0.5">Teléfono: <strong className="text-amber-400 font-mono">+506 8899-2233</strong> (Sabor Tico S.A.)</p>
                </div>
                <QrCode className="w-8 h-8 text-indigo-400 shrink-0" />
              </div>
            )}

            {/* Cash Given & Change Calculator */}
            {paymentMethod === 'Efectivo' && (
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <label className="font-semibold">Monto Entregado por Cliente:</label>
                  <input
                    type="number"
                    placeholder="Monto ₡..."
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-amber-400 font-bold font-mono focus:outline-none focus:border-amber-500 text-right"
                  />
                </div>
                {cashGiven && (
                  <div className="flex justify-between text-xs font-mono font-bold text-emerald-400 pt-2 border-t border-slate-800">
                    <span>VUELTO / CAMBIO:</span>
                    <span>₡{cashChange.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Order Totals Breakdown & Complete Payment Button */}
          <div className="md:col-span-5 p-5 bg-slate-900/70 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-200 mb-3 border-b border-slate-800 pb-2">
                Resumen de Cuenta
              </h3>

              <div className="space-y-2 text-xs font-mono">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-slate-300">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₡{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs font-mono text-slate-300">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Neto:</span>
                  <span>₡{taxes.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Impuesto IVA 13%:</span>
                  <span>₡{taxes.ivaTax.toLocaleString()}</span>
                </div>
                {order.type !== 'llevar' && (
                  <div className="flex justify-between text-slate-400">
                    <span>Servicio 10% (Ley 5635):</span>
                    <span>₡{taxes.serviceTax.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-extrabold text-amber-400 pt-3 border-t border-slate-800">
                  <span>TOTAL A COBRAR:</span>
                  <span>₡{finalTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Complete Payment Button */}
            <button
              onClick={handleProcessPayment}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>EMITIR FACTURA Y PAGAR ₡{finalTotal.toLocaleString()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
