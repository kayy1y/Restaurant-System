import React from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, UserCheck } from 'lucide-react';
import { INCIDENT_CATEGORIES, processIncident } from '../services/incidentEngine';

export default function IncidentsModal({ 
  order, 
  onClose, 
  onSuccess, 
  currentRole 
}) {
  const [category, setCategory] = React.useState('PRODUCTO_INCORRECTO');
  const [selectedProduct, setSelectedProduct] = React.useState(order?.items?.[0]?.product_id || '');
  const [actionRequested, setActionRequested] = React.useState('REEMPLAZAR');
  const [notes, setNotes] = React.useState('');
  const [managerPin, setManagerPin] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const selectedCatObj = INCIDENT_CATEGORIES.find(c => c.id === category);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (category === 'OTRO' && !notes.trim()) {
      setErrorMsg('Debe escribir una explicación para la opción de incidencia "Otro".');
      return;
    }

    setIsSubmitting(true);
    try {
      await processIncident({
        orderId: order ? order.id : 'N/A',
        productId: selectedProduct,
        category,
        actionRequested,
        notes,
        userName: currentRole.name,
        managerPin
      }, currentRole);

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Error al procesar la incidencia.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel border border-slate-700/80 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl space-y-0 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/30 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-slate-100">
                Reportar Incidencia o Incidente
              </h3>
              <p className="text-xs text-slate-400">
                {order ? `Pedido: ${order.id} (${order.table_name})` : 'Registro general de incidencia'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Tipo de Incidencia
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {INCIDENT_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {order && order.items && order.items.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Producto Afectado
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                {order.items.map(i => (
                  <option key={i.product_id} value={i.product_id}>{i.product_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Acción Solicitada
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['REEMPLAZAR', 'CANCELAR', 'REEMBOLSAR', 'DESPERDICIO'].map(act => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setActionRequested(act)}
                  className={`p-2.5 rounded-xl text-xs font-bold border ${actionRequested === act ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Explicación / Observaciones
            </label>
            <textarea
              rows={2}
              placeholder="Detalle la situación ocurrida..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            />
          </div>

          {selectedCatObj?.requiresAuth && currentRole.id !== 'ADMINISTRADOR' && currentRole.id !== 'gerente' && (
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <UserCheck className="w-4 h-4" /> Autorización de Gerencia Requerida
              </div>
              <input
                type="password"
                maxLength={4}
                placeholder="PIN de Gerente (9999)"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold"
              />
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 font-bold">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="w-1/2 bg-slate-800 text-slate-300 text-xs font-bold py-3 rounded-xl">Cancelar</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg"
            >
              {isSubmitting ? 'Procesando DB...' : 'Enviar Incidencia DB'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
