import React from 'react';
import { 
  Users, Clock, Plus, CheckCircle, AlertCircle, ShoppingBag, 
  UtensilsCrossed, ArrowRightLeft, Sparkles, AlertTriangle, Layers,
  Receipt, Flame, HelpCircle
} from 'lucide-react';
import { PRODUCTS, RAW_INGREDIENTS } from '../data/mockData';

export default function TableMapPOS({ 
  tables, 
  setTables, 
  orders, 
  setOrders, 
  rawIngredients,
  onOpenCheckout,
  onOpenOrderModal,
  currentRole
}) {
  const [zoneFilter, setZoneFilter] = React.useState('Todos');
  const [selectedTable, setSelectedTable] = React.useState(null);

  const zones = ['Todos', 'Salón Principal', 'Terraza Bar', 'Cava Privada'];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'disponible':
        return { label: 'Disponible', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'reservada':
        return { label: 'Reservada', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'ocupada':
        return { label: 'Ocupada', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'en_preparacion':
        return { label: 'En Cocina', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
      case 'servido':
        return { label: 'Servido', bg: 'bg-teal-500/10 text-teal-300 border-teal-500/30' };
      case 'esperando_pago':
        return { label: 'Esperando Pago', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
      case 'pendiente_limpieza':
        return { label: 'Limpieza', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      default:
        return { label: status, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const filteredTables = zoneFilter === 'Todos' 
    ? tables 
    : tables.filter(t => t.zone === zoneFilter);

  return (
    <div className="space-y-6">
      {/* Top Controls: Zones & Fast Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase mr-1">Zonas:</span>
          {zones.map(zone => (
            <button
              key={zone}
              onClick={() => setZoneFilter(zone)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                zoneFilter === zone
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>

        {/* Quick Order Buttons for Takeout & Delivery */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenOrderModal({ id: 'TAKEOUT', name: 'Para Llevar', type: 'llevar' })}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Nuevo Pedido Para Llevar</span>
          </button>
        </div>
      </div>

      {/* Interactive Table Map Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map(table => {
          const badge = getStatusBadge(table.status);
          const activeOrder = orders.find(o => o.tableId === table.id && o.status !== 'pagado');

          return (
            <div
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`glass-card p-4 rounded-2xl cursor-pointer relative group flex flex-col justify-between min-h-[190px] border transition-all ${
                selectedTable?.id === table.id ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-800/80'
              }`}
            >
              {/* Table Top Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                      {table.name}
                      <span className="text-[11px] font-normal text-slate-400 font-mono">
                        ({table.capacity}p)
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">{table.zone}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Waiter & Order Info if occupied */}
                {activeOrder ? (
                  <div className="mt-3 space-y-1.5 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/90 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Salonero:</span>
                      <span className="font-semibold text-amber-300">{activeOrder.waiter}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Items:</span>
                      <span className="font-semibold">{activeOrder.items.reduce((sum, i) => sum + i.quantity, 0)} productos</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800 font-mono">
                      <span className="text-slate-400">Total:</span>
                      <span className="font-bold text-amber-400">₡{activeOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 py-3 text-center border border-dashed border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500 font-medium">Mesa libre para abrir</p>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-2 flex items-center justify-between text-xs border-t border-slate-800/60">
                <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{table.minutesActive > 0 ? `${table.minutesActive} min` : 'Libre'}</span>
                </div>

                {activeOrder ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOrderModal(table);
                    }}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    <UtensilsCrossed className="w-3 h-3" />
                    <span>Ver Pedido</span>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOrderModal(table);
                    }}
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Abrir Mesa</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
