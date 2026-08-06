import React from 'react';
import { History, Search, ArrowUpRight, ArrowDownRight, RefreshCw, Filter } from 'lucide-react';
import { getAllMovements, MOVEMENT_TYPES } from '../../services/inventoryService';

export default function MovementHistoryView({ onBack }) {
  const [movements, setMovements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('ALL');

  React.useEffect(() => {
    getAllMovements().then(data => {
      setMovements(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredMovements = movements.filter(m => {
    const matchesSearch = !searchTerm.trim() ||
      m.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || m.movement_type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            ← Volver al Inventario
          </button>
          <div>
            <h2 className="font-heading font-extrabold text-base text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              Bitácora Histórica de Movimientos DB
            </h2>
            <p className="text-xs text-slate-400">Auditoría inalterable de entradas, salidas, ajustes y consumos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por insumo, usuario o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filtro por Tipo */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todos los Tipos</option>
            {Object.keys(MOVEMENT_TYPES).map(key => (
              <option key={key} value={key}>
                {MOVEMENT_TYPES[key].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-slate-400">Cargando bitácora transaccional desde DB...</div>
        ) : filteredMovements.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl text-xs">
            No se encontraron movimientos registrados en la base de datos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Fecha & Hora</th>
                  <th className="py-3 px-3">Insumo / Producto</th>
                  <th className="py-3 px-3">Tipo de Movimiento</th>
                  <th className="py-3 px-3">Cambio Realizado</th>
                  <th className="py-3 px-3">Transición Stock</th>
                  <th className="py-3 px-3">Usuario Responsable</th>
                  <th className="py-3 px-3">Motivo / Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-sans">{new Date(m.timestamp).toLocaleString('es-CR')}</td>
                    <td className="py-3 px-3 font-bold text-slate-200 font-sans">{m.item_name}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        m.movement_type.includes('ENTRADA') || m.movement_type.includes('COMPRA')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : m.movement_type.includes('AJUSTE')
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {m.movement_label || m.movement_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-slate-100">
                      {m.qty_changed}
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-400">
                      {m.qty_before} ➔ {m.qty_after}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans">{m.user_name}</td>
                    <td className="py-3 px-3 text-slate-400 font-sans max-w-xs truncate" title={m.reason}>
                      {m.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
