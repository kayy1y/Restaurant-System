import React from 'react';
import { X, Package, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { saveInventoryItem, findInventoryItemByNameOrCode } from '../../services/inventoryService';

export default function ItemFormModal({ 
  itemToEdit, 
  categories, 
  units, 
  onClose, 
  onSuccess 
}) {
  const isEditing = !!itemToEdit;

  const [formData, setFormData] = React.useState({
    id: itemToEdit?.id || '',
    sku_code: itemToEdit?.sku_code || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    name: itemToEdit?.name || '',
    category_id: itemToEdit?.category_id || categories[0]?.id || 'cat-carnes',
    unit_id: itemToEdit?.unit_id || units[0]?.id || 'unit-kg',
    current_stock: itemToEdit?.current_stock !== undefined ? itemToEdit.current_stock : 0,
    min_stock: itemToEdit?.min_stock !== undefined ? itemToEdit.min_stock : 5,
    unit_cost: itemToEdit?.unit_cost !== undefined ? itemToEdit.unit_cost : 0,
    notes: itemToEdit?.notes || ''
  });

  const [errorMsg, setErrorMsg] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [matchingItem, setMatchingItem] = React.useState(null);

  // Búsqueda en tiempo real para detectar si ya existe un insumo por Nombre o SKU
  React.useEffect(() => {
    if (isEditing) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      const match = await findInventoryItemByNameOrCode(formData.sku_code) || 
                    await findInventoryItemByNameOrCode(formData.name);
      if (isMounted) {
        setMatchingItem(match);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.name, formData.sku_code, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('El nombre del insumo es obligatorio.');
      return;
    }

    if (formData.current_stock < 0 || formData.min_stock < 0 || formData.unit_cost < 0) {
      setErrorMsg('Las cantidades y costos no pueden ser valores negativos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveInventoryItem(formData);
      setIsSubmitting(false);
      onSuccess(result);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Error al guardar en la base de datos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel border border-slate-700/80 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl space-y-0 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-slate-100">
                {isEditing ? 'Editar Insumo de Inventario' : 'Registrar Nuevo Insumo'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? `Modificando ${formData.name}` : 'Ingresa los datos para registrar en la Base de Datos'}
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Código SKU
              </label>
              <input
                type="text"
                value={formData.sku_code}
                onChange={(e) => setFormData({ ...formData, sku_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Nombre del Insumo *
              </label>
              <input
                type="text"
                placeholder="Ej. Carne Angus, Harina, Ron..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Categoría *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Unidad de Medida Principal *
              </label>
              <select
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {units.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Existencia Actual
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Stock Mínimo Alerta
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Costo Unitario (₡)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Notas & Especificaciones
            </label>
            <textarea
              rows={2}
              placeholder="Especificaciones del proveedor, temperatura de almacenamiento..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Indicador en tiempo real de Acumulación o Nuevo Registro */}
          {!isEditing && (formData.name.trim() || formData.sku_code.trim()) && (
            <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 transition-all ${
              matchingItem 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              {matchingItem ? (
                <>
                  <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold">Insumo Existente Detectado:</span> "{matchingItem.name}" (Existencia actual: {matchingItem.current_stock} {matchingItem.unit_id}).
                    <p className="text-[11px] text-amber-200/80 font-normal mt-0.5">
                      La cantidad ingresada (+{formData.current_stock || 0}) se <strong>SUMARÁ al stock actual</strong> en la Base de Datos.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">Insumo Nuevo:</span> Sin coincidencias previas por nombre o código SKU.
                    <p className="text-[11px] text-emerald-200/80 font-normal mt-0.5">
                      Se registrará un <strong>nuevo artículo en la Base de Datos</strong> con {formData.current_stock || 0} de existencia inicial.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Guardar Cambios' : 'Registrar Insumo DB'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
