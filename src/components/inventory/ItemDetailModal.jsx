import React from 'react';
import { 
  X, Package, Clock, History, DollarSign, Tag, Trash2, 
  AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, FileText 
} from 'lucide-react';
import { getMovementsForItem, deleteInventoryItem } from '../../services/inventoryService';

export default function ItemDetailModal({ 
  item, 
  categories, 
  units, 
  onClose, 
  onRefresh, 
  currentRole 
}) {
  const [activeTab, setActiveTab] = React.useState('ficha'); // ficha, movimientos
  const [movements, setMovements] = React.useState([]);
  const [loadingMovs, setLoadingMovs] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (item) {
      setLoadingMovs(true);
      getMovementsForItem(item.id).then(movs => {
        setMovements(movs);
        setLoadingMovs(false);
      }).catch(() => setLoadingMovs(false));
    }
  }, [item]);

  if (!item) return null;

  const categoryObj = categories.find(c => c.id === item.category_id) || { name: 'Suministros' };
  const unitObj = units.find(u => u.id === item.unit_id) || { code: item.unit_id, name: 'Unidades' };

  const totalAssetValue = (parseFloat(item.current_stock || 0) * parseFloat(item.unit_cost || 0));

  const handleDelete = async () => {
    try {
      await deleteInventoryItem(item.id);
      onRefresh();
      onClose();
    } catch (err) {
      alert('Error al eliminar el artículo: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel border border-slate-700/80 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl space-y-0 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-slate-100 flex items-center gap-2">
                {item.name}
                <span className="text-xs font-mono font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {item.sku_code}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Categoría: {categoryObj.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-900/50 border-b border-slate-800/80 px-5 pt-3 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('ficha')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'ficha'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Ficha Técnica & Valorización</span>
          </button>

          <button
            onClick={() => setActiveTab('movimientos')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'movimientos'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial Transaccional DB ({movements.length})</span>
          </button>
        </div>

        {/* Tab 1: Technical Sheet & Valuation */}
        {activeTab === 'ficha' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Existencia Actual</span>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  {item.current_stock} <span className="text-xs text-slate-400">{unitObj.code}</span>
                </p>
                <p className="text-[10px] text-slate-500 font-mono">Mínimo recomendado: {item.min_stock} {unitObj.code}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Costo Unitario</span>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  ₡{parseFloat(item.unit_cost || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500">Por {unitObj.name}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor Total Invertido</span>
                <p className="text-2xl font-black text-sky-400 font-mono">
                  ₡{totalAssetValue.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500">Valorización en bodega</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Estado de Stock:</span>
                <span className="font-bold text-slate-200 uppercase font-mono">{item.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Unidad de Medida:</span>
                <span className="text-slate-200">{unitObj.name} ({unitObj.code})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Última Actualización en DB:</span>
                <span className="text-slate-200 font-mono">{new Date(item.updated_at).toLocaleString('es-CR')}</span>
              </div>
              {item.notes && (
                <div className="pt-2">
                  <span className="text-slate-400 font-semibold block mb-1">Notas & Observaciones:</span>
                  <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300 italic">{item.notes}</p>
                </div>
              )}
            </div>

            {/* Admin Delete Action */}
            {(currentRole.id === 'admin' || currentRole.id === 'gerente') && (
              <div className="pt-2">
                {confirmDelete ? (
                  <div className="bg-rose-500/10 border border-rose-500/40 p-3 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-rose-300 font-bold">¿Confirmar eliminación de {item.name}?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                      >
                        Eliminar Definitivamente
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-semibold py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar este insumo de la base de datos</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Transactional Movement History Table */}
        {activeTab === 'movimientos' && (
          <div className="p-5 space-y-3">
            {loadingMovs ? (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">Cargando historial desde DB...</div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl text-xs">
                No hay movimientos registrados para este insumo.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Fecha & Hora</th>
                      <th className="py-2.5 px-3">Tipo Movimiento</th>
                      <th className="py-2.5 px-3">Modificación</th>
                      <th className="py-2.5 px-3">Resultado</th>
                      <th className="py-2.5 px-3">Usuario</th>
                      <th className="py-2.5 px-3">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {movements.map(m => (
                      <tr key={m.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-sans">{new Date(m.timestamp).toLocaleString('es-CR')}</td>
                        <td className="py-2.5 px-3 font-bold font-sans">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                            m.movement_type.includes('ENTRADA') || m.movement_type.includes('COMPRA')
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {m.movement_label || m.movement_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-extrabold">
                          {m.qty_changed} {unitObj.code}
                        </td>
                        <td className="py-2.5 px-3 text-amber-400 font-bold">
                          {m.qty_before} ➔ {m.qty_after} {unitObj.code}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans">{m.user_name}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans max-w-xs truncate">{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
