import React from 'react';
import { 
  Users, Clock, Plus, CheckCircle, AlertCircle, ShoppingBag, 
  UtensilsCrossed, ArrowRightLeft, Sparkles, AlertTriangle, Layers,
  Receipt, Flame, Calendar
} from 'lucide-react';

import { getAllReservations, getTableReservationDetails, subscribeToReservations } from '../services/reservationService.js';
import { liveSync } from '../services/liveSync.js';

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
  const [reservations, setReservations] = React.useState([]);

  const zones = ['Todos', 'Salón Principal', 'Terraza Bar', 'Cava Privada'];

  // Cargar reservas y sincronizar en tiempo real
  const loadReservations = React.useCallback(async () => {
    const list = await getAllReservations();
    setReservations(list);
  }, []);

  React.useEffect(() => {
    loadReservations();
    const unsubscribeLiveSync = liveSync.subscribe('RESERVATION_UPDATED', () => {
      loadReservations();
    });
    const unsubscribeRealtime = subscribeToReservations(() => {
      loadReservations();
    });
    return () => {
      if (unsubscribeLiveSync) unsubscribeLiveSync();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [loadReservations]);

  const filteredTables = zoneFilter === 'Todos' 
    ? tables 
    : tables.filter(t => t.zone === zoneFilter);

  return (
    <div className="space-y-6 text-[#231710]">
      {/* Top Controls: Zones & Fast Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-[#5d402b] uppercase tracking-wider mr-1 font-mono">Zonas:</span>
          {zones.map(zone => (
            <button
              key={zone}
              onClick={() => setZoneFilter(zone)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                zoneFilter === zone
                  ? 'bg-[#5d402b] text-[#fffdf9] font-extrabold shadow-md border border-[#3e2718]'
                  : 'bg-[#fffdf9] text-[#6e5a4b] hover:bg-[#f5efe6] border border-[#dac8b3]'
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
            className="flex items-center gap-2 bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] text-xs font-bold px-4 py-2 rounded-xl shadow-lg border border-[#3e2718] transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-[#d8c4a7]" />
            <span>Nuevo Pedido Para Llevar</span>
          </button>
        </div>
      </div>

      {/* Interactive Table Map Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map(table => {
          const activeOrder = orders.find(o => o.tableId === table.id && o.status !== 'pagado');
          const resDetails = getTableReservationDetails(table.id, activeOrder, reservations);

          // Determinar estado visual exacto combinando la orden POS y reservas en tiempo real
          let statusLabel = 'DISPONIBLE';
          let statusBadgeClass = 'bg-[#46593a]/20 text-[#1f2d17] border-[#46593a]/50';

          if (activeOrder) {
            statusLabel = 'OCUPADA';
            statusBadgeClass = 'bg-[#735036]/20 text-[#362214] border-[#735036]/50';
          } else if (resDetails.currentReservation) {
            if (resDetails.currentReservation.estado === 'cliente_llego') {
              statusLabel = 'CLIENTE LLEGÓ';
              statusBadgeClass = 'bg-sky-700 text-white border-sky-800 font-extrabold animate-pulse';
            } else if (resDetails.currentReservation.estado === 'sentado') {
              statusLabel = 'SENTADO / POR PEDIR';
              statusBadgeClass = 'bg-amber-900 text-amber-100 border-amber-950 font-black';
            } else {
              statusLabel = 'RESERVADA';
              statusBadgeClass = 'bg-[#5d402b] text-[#fffdf9] border-[#3e2718] font-black';
            }
          } else if (resDetails.upcomingReservation) {
            const resStart = new Date(resDetails.upcomingReservation.fecha_hora_inicio).getTime();
            const nowTime = new Date().getTime();
            if ((resStart - nowTime) <= 30 * 60 * 1000) {
              statusLabel = 'PRÓXIMA RESERVA';
              statusBadgeClass = 'bg-[#c86414] text-[#fffdf9] border-[#a14b08] font-black animate-pulse';
            }
          }

          return (
            <div
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`glass-card p-4 rounded-3xl cursor-pointer relative group flex flex-col justify-between min-h-[210px] border transition-all bg-[#fffdf9] ${
                selectedTable?.id === table.id ? 'border-[#5d402b] ring-2 ring-[#5d402b]/30 shadow-xl' : 'border-[#dac8b3]'
              }`}
            >
              {/* Table Top Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-heading font-extrabold text-base text-[#1f1209] flex items-center gap-2">
                      {table.name}
                      <span className="text-[11px] font-normal text-[#3d2717] font-mono">
                        ({table.capacity}p)
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#3d2717] font-bold">{table.zone}</p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-extrabold ${statusBadgeClass}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* ALERTA DE CONFLICTO: Si la mesa está ocupada y tiene una reserva próxima */}
                {resDetails.conflictAlert && (
                  <div className="bg-[#802319]/15 border border-[#802319]/40 p-2 rounded-xl text-[10px] text-[#802319] font-bold flex items-start gap-1 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{resDetails.conflictAlert}</span>
                  </div>
                )}

                {/* Waiter & Order Info if occupied */}
                {activeOrder ? (
                  <div className="mt-2 space-y-1.5 bg-[#faf6ee] p-2.5 rounded-2xl border border-[#dac8b3] text-xs">
                    <div className="flex justify-between text-[#1f1209]">
                      <span className="text-[#3d2717] font-bold">Salonero:</span>
                      <span className="font-extrabold text-[#5d402b]">{activeOrder.waiter}</span>
                    </div>
                    <div className="flex justify-between text-[#1f1209]">
                      <span className="text-[#3d2717] font-bold">Items:</span>
                      <span className="font-bold">{activeOrder.items.reduce((sum, i) => sum + i.quantity, 0)} productos</span>
                    </div>
                    <div className="flex justify-between text-[#1f1209] pt-1 border-t border-[#dac8b3] font-mono">
                      <span className="text-[#3d2717] font-bold">Total:</span>
                      <span className="font-extrabold text-[#5d402b] text-sm">₡{activeOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                ) : resDetails.currentReservation ? (
                  <div className="mt-2 p-2.5 rounded-2xl bg-[#5d402b]/10 border border-[#5d402b]/30 text-xs space-y-1">
                    <p className="font-bold text-[#5d402b] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#c86414]" /> Reserva Activa
                    </p>
                    <p className="text-[#1f1209] font-extrabold">{resDetails.currentReservation.nombre_cliente} ({resDetails.currentReservation.cantidad_personas}p)</p>
                    <p className="text-[10px] text-[#3d2717] font-mono font-bold">
                      De {new Date(resDetails.currentReservation.fecha_hora_inicio).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })} a {new Date(resDetails.currentReservation.fecha_hora_fin).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 py-3 px-2 text-center border border-dashed border-[#dac8b3] rounded-2xl bg-[#faf6ee]/50 text-xs">
                    <p className="text-[#3d2717] font-extrabold">Mesa disponible</p>
                    {resDetails.upcomingReservation && (
                      <p className="text-[10px] text-[#c86414] font-bold mt-1 font-mono">
                        Próxima reserva: {new Date(resDetails.upcomingReservation.fecha_hora_inicio).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })} ({resDetails.upcomingReservation.nombre_cliente})
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-3 pt-2 flex items-center justify-between text-xs border-t border-[#dac8b3]">
                <div className="flex items-center gap-1 text-[#3d2717] text-[11px] font-bold">
                  <Clock className="w-3.5 h-3.5 text-[#3d2717]" />
                  <span>{table.minutesActive > 0 ? `${table.minutesActive} min` : 'Libre'}</span>
                </div>

                {activeOrder ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOrderModal(table);
                    }}
                    className="bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] border border-[#3e2718] text-[11px] font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <UtensilsCrossed className="w-3 h-3 text-[#d8c4a7]" />
                    <span>Ver Pedido</span>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOrderModal(table);
                    }}
                    className="bg-[#46593a] hover:bg-[#34442a] text-[#fffdf9] border border-[#2f3d25] text-[11px] font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3 h-3 text-[#d4e6c8]" />
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
