import React from 'react';
import { 
  X, ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, 
  CheckCircle2, ShieldAlert, Package, Calculator, Lock 
} from 'lucide-react';
import { MOVEMENT_TYPES, recordStockMovement } from '../../services/inventoryService';

export default function QuickStockModal({ 
  item, 
  categories, 
  units, 
  onClose, 
  onSuccess, 
  currentRole 
}) {
  const [movementType, setMovementType] = React.useState('ENTRADA');
  const [qtyChanged, setQtyChanged] = React.useState('');
  const [selectedUnit, setSelectedUnit] = React.useState(item?.unit_id || 'unit-kg');
  const [reason, setReason] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [adminOverride, setAdminOverride] = React.useState(false);

  if (!item) return null;

  const currentStock = parseFloat(item.current_stock || 0);
  const minStock = parseFloat(item.min_stock || 0);
  const qtyInput = parseFloat(qtyChanged) || 0;

  // Calcular la nueva cantidad estimada en tiempo real
  const movMeta = MOVEMENT_TYPES[movementType];
  let calculatedNewStock = currentStock;
  if (movMeta.direction === 'in') {
    calculatedNewStock = currentStock + qtyInput;
  } else if (movMeta.direction === 'out') {
    calculatedNewStock = currentStock - qtyInput;
  } else if (movMeta.direction === 'set') {
    calculatedNewStock = qtyInput;
  }

  const isBelowMin = calculatedNewStock > 0 && calculatedNewStock <= minStock;
  const isNegative = calculatedNewStock < 0;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (qtyInput <= 0) {
      setErrorMsg('Debe ingresar una cantidad válida mayor a cero.');
      return;
    }

    if (isNegative && !adminOverride && currentRole.id !== 'admin' && currentRole.id !== 'gerente') {
      setErrorMsg(`La salida de ${qtyInput} supera la existencia actual (${currentStock}). Se requiere rol de Administrador o Gerente.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await recordStockMovement({
        itemId: item.id,
        movementType,
        qtyChanged: qtyInput,
        unitId: selectedUnit,
        reason: reason.trim() || movMeta.label,
        userName: currentRole.name,
        isAdminOverride: adminOverride
      });

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Error al guardar el movimiento en la base de datos.');
    }
  };

  const unitObj = units.find(u => u.id === item.unit_id) || { code: item.unit_id };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel border border-slate-700/80 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl space-y-0 animate-in fade-in zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/30 text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-slate-100">
                Actualizar Existencias
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {item.name} • <span className="font-mono text-amber-300">Existencia Actual: {currentStock} {unitObj.code}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          {/* Tipo de Movimiento Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'ENTRADA', label: 'Entrada (+)', icon: ArrowUpRight, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                { id: 'SALIDA', label: 'Salida (-)', icon: ArrowDownRight, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
                { id: 'AJUSTE', label: 'Ajuste Físico (=)', icon: RefreshCw, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
                { id: 'DESPERDICIO', label: 'Merma / Desperdicio (-)', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
              ].map(m => {
                const Icon = m.icon;
                const isSel = movementType === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMovementType(m.id)}
                    className={`p-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${
                      isSel 
                        ? `${m.color} ring-2 ring-amber-500/40 border-amber-500` 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input de Cantidad & Unidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Cantidad
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ej. 5.5"
                value={qtyChanged}
                onChange={(e) => setQtyChanged(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Unidad de Medida
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {units.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campo de Motivo / Observaciones */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Motivo o Observación (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Compra semanal a proveedor, Merma de corte..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Panel de Vista Previa Transaccional */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-400" /> Vista Previa del Cambio
              </span>
              <span className="font-mono text-slate-300">ID: {item.sku_code}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono py-1">
              <span className="text-slate-400">Existencia Actual:</span>
              <span className="font-bold text-slate-200">{currentStock} {unitObj.code}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono py-1">
              <span className="text-slate-400">Movimiento ({movMeta.label}):</span>
              <span className={`font-bold ${movMeta.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {movMeta.direction === 'in' ? '+' : movMeta.direction === 'out' ? '-' : '='} {qtyInput} {unitObj.code}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono py-2 border-t border-slate-800 font-extrabold">
              <span className="text-slate-200">NUEVA EXISTENCIA:</span>
              <span className={`text-sm ${calculatedNewStock <= 0 ? 'text-rose-400' : isBelowMin ? 'text-amber-400' : 'text-emerald-400'}`}>
                {calculatedNewStock.toFixed(2)} {unitObj.code}
              </span>
            </div>

            {/* Alert por bajo inventario */}
            {isBelowMin && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Atención: La nueva cantidad estará por debajo del stock mínimo recomendado ({minStock} {unitObj.code}).</span>
              </div>
            )}

            {/* Alert por intento de saldo negativo */}
            {isNegative && (
              <div className="bg-rose-500/10 border border-rose-500/40 p-2.5 rounded-xl text-[11px] text-rose-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Advertencia: La salida supera las existencias disponibles.</span>
                </div>
                {(currentRole.id === 'admin' || currentRole.id === 'gerente') && (
                  <label className="flex items-center gap-2 pt-1 text-[10px] cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={adminOverride}
                      onChange={(e) => setAdminOverride(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Autorizar ajuste especial como {currentRole.name}</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (isNegative && !adminOverride)}
              className="w-1/2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Guardando en DB...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Movimiento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
