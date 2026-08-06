import React from 'react';
import { 
  RotateCcw, ShieldAlert, AlertTriangle, CheckCircle2, 
  FileText, Sparkles, UserCheck 
} from 'lucide-react';

export default function ReturnsModal({ orders, currentRole, onLogAudit }) {
  const [selectedOrder, setSelectedOrder] = React.useState('');
  const [reason, setReason] = React.useState('Platillo llegó frío');
  const [solution, setSolution] = React.useState('reemplazo');
  const [managerPass, setManagerPass] = React.useState('');
  const [details, setDetails] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState(false);

  const reasons = [
    'Platillo llegó frío',
    'Al cliente no le gustó el sabor',
    'Pedido equivocado por salonero',
    'Faltó un ingrediente principal',
    'Retraso excesivo en cocina (>30 min)',
    'Doble cobro por error'
  ];

  const handleProcessReturn = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    onLogAudit({
      user: currentRole.name,
      role: currentRole.id,
      action: 'DEVOLUCION_Y_RECLAMO',
      details: `Devolución en Pedido ${selectedOrder}: ${reason}. Solución: ${solution}. Justificación: ${details}`
    });

    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setSelectedOrder('');
      setDetails('');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30 text-rose-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-100">Devoluciones, Reclamos & Notas de Crédito</h2>
            <p className="text-xs text-slate-400">Control de mermas, cancelaciones y ajustes fiscales autorizados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="md:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <form onSubmit={handleProcessReturn} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Seleccionar Pedido Afectado
              </label>
              <select
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="">-- Seleccionar Pedido --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.id} - {o.tableName} (Total: ₡{o.total.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Motivo del Reclamo / Incidencia
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {reasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Solución Aplicada al Cliente
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'reemplazo', label: 'Reemplazo de Cortesía (Rehacer)' },
                  { id: 'reembolso', label: 'Reembolso Parcial / Total' },
                  { id: 'cupon', label: 'Cupón para Próxima Visita' },
                  { id: 'nota_credito', label: 'Emitir Nota de Crédito v4.3' }
                ].map(sol => (
                  <button
                    key={sol.id}
                    type="button"
                    onClick={() => setSolution(sol.id)}
                    className={`p-3 rounded-xl text-xs font-semibold border text-left transition-all ${
                      solution === sol.id
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {sol.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Observaciones y Evidencia
              </label>
              <textarea
                rows={3}
                placeholder="Detalle la situación ocurrida..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                <UserCheck className="w-4 h-4" />
                <span>Autorización de Gerencia Requerida</span>
              </div>
              <input
                type="password"
                placeholder="Clave PIN de Gerente..."
                value={managerPass}
                onChange={(e) => setManagerPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedOrder}
              className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>PROCESAR DEVOLUCIÓN & AUDITAR</span>
            </button>
          </form>

          {successMsg && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-3.5 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Devolución procesada exitosamente. Registrado en bitácora inmutable.</span>
            </div>
          )}
        </div>

        {/* Audit Log Preview Right */}
        <div className="md:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
            Reglas de Trazabilidad e Impacto
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <strong className="text-amber-400 block mb-1">Impacto Fiscal:</strong>
              Si la venta ya fue declarada a Hacienda v4.3, se genera automáticamente una Nota de Crédito Electrónica de anulación.
            </li>
            <li className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <strong className="text-amber-400 block mb-1">Impacto de Inventario:</strong>
              Si el producto se rehace, se descuenta nuevamente el lote. Si fue merma por plato frío/derramado, se clasifica como Pérdida Operativa.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
