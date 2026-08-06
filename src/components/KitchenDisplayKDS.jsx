import React from 'react';
import { 
  ChefHat, Flame, GlassWater, Clock, CheckCircle2, AlertTriangle, 
  Sparkles, Coffee, Cake, UtensilsCrossed 
} from 'lucide-react';

export default function KitchenDisplayKDS({ orders, setOrders, currentRole }) {
  const [activeStation, setActiveStation] = React.useState('todas');

  const stations = [
    { id: 'todas', label: 'Todas las Estaciones', icon: UtensilsCrossed },
    { id: 'cocina_caliente', label: 'Cocina Caliente', icon: Flame },
    { id: 'cocina_fria', label: 'Cocina Fría', icon: ChefHat },
    { id: 'barra', label: 'Barra & Bebidas', icon: GlassWater },
    { id: 'cafeteria', label: 'Cafetería', icon: Coffee },
    { id: 'postres', label: 'Postres', icon: Cake }
  ];

  // Filter active orders that are in kitchen or ready
  const activeOrders = orders.filter(o => o.status !== 'pagado');

  const handleUpdateItemStatus = (orderId, itemId, newStatus) => {
    setOrders(orders.map(order => {
      if (order.id !== orderId) return order;

      const updatedItems = order.items.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      );

      // Check if all items ready
      const allReady = updatedItems.every(i => i.status === 'listo' || i.status === 'servido');

      return {
        ...order,
        items: updatedItems,
        status: allReady ? 'listo' : 'en_preparacion'
      };
    }));
  };

  const getTimerBadge = (startTime) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);

    if (elapsedMinutes > 15) {
      return { text: `${elapsedMinutes} min (Retrasado!)`, bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' };
    } else if (elapsedMinutes > 10) {
      return { text: `${elapsedMinutes} min (Atención)`, bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    return { text: `${elapsedMinutes} min`, bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  return (
    <div className="space-y-6">
      {/* Top Station Selector Tabs */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase mr-1">Estación:</span>
          {stations.map(st => {
            const Icon = st.icon;
            const isActive = activeStation === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setActiveStation(st.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Comandas Activas: <strong className="text-amber-400 font-mono">{activeOrders.length}</strong></span>
        </div>
      </div>

      {/* KDS Ticket Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center glass-panel rounded-3xl border border-slate-800 text-slate-400">
            <ChefHat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No hay comandas pendientes</h3>
            <p className="text-xs text-slate-500 mt-1">Todas las estaciones están al día</p>
          </div>
        ) : (
          activeOrders.map(order => {
            const timer = getTimerBadge(order.startTime);

            // Filter items matching current active station
            const stationItems = activeStation === 'todas'
              ? order.items
              : order.items.filter(i => i.station === activeStation);

            if (stationItems.length === 0) return null;

            return (
              <div
                key={order.id}
                className="glass-card rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between shadow-xl"
              >
                {/* Ticket Header */}
                <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                      {order.tableName}
                      <span className="text-xs text-slate-400 font-mono">({order.id})</span>
                    </h3>
                    <p className="text-xs text-slate-400">Salonero: {order.waiter}</p>
                  </div>

                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${timer.bg}`}>
                    {timer.text}
                  </span>
                </div>

                {/* Ticket Items List */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[320px]">
                  {stationItems.map(item => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        item.status === 'listo'
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-lg font-mono">
                            {item.quantity}x
                          </span>
                          <span className="font-bold text-xs">{item.name}</span>
                        </div>

                        {item.status === 'listo' ? (
                          <button
                            onClick={() => handleUpdateItemStatus(order.id, item.id, 'en_marcha')}
                            className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> LISTO
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateItemStatus(order.id, item.id, 'listo')}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-md shadow-amber-500/20"
                          >
                            Marcar Listo
                          </button>
                        )}
                      </div>

                      {/* Notes / Allergy Banner */}
                      {item.notes && (
                        <div className="mt-2 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[11px] text-rose-300 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>{item.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Ticket Footer */}
                <div className="bg-slate-900/80 p-3 border-t border-slate-800 text-xs flex justify-between text-slate-400">
                  <span>Tipo: <strong className="text-slate-200 uppercase">{order.type}</strong></span>
                  <span>Estaciones: <strong className="text-amber-400">{stationItems.length} items</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
