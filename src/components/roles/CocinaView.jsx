import React from 'react';
import { ChefHat, Flame, Clock, CheckCircle2, AlertTriangle, RefreshCw, Volume2, Mic } from 'lucide-react';
import { getComandasForKitchen, updateComandaStatus } from '../../services/orderService.js';
import { getInventoryItems, recordStockMovement } from '../../services/inventoryService.js';
import { liveSync } from '../../services/liveSync.js';

export default function CocinaView() {
  const [comandas, setComandas] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [showWasteModal, setShowWasteModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState('');
  const [wasteQty, setWasteQty] = React.useState('');
  const [wasteReason, setWasteReason] = React.useState('');

  const loadComandas = React.useCallback(async () => {
    try {
      const data = await getComandasForKitchen();
      setComandas(data);
      const invItems = await getInventoryItems();
      setItems(invItems);
    } catch (err) {
      console.error('Error cargando comandas de cocina:', err);
    }
  }, []);

  React.useEffect(() => {
    loadComandas();

    const unsubOrder = liveSync.subscribe('ORDER_CREATED', () => loadComandas());
    const unsubUpdated = liveSync.subscribe('ORDER_UPDATED', () => loadComandas());

    const timer = setInterval(loadComandas, 3000);
    return () => {
      unsubOrder();
      unsubUpdated();
      clearInterval(timer);
    };
  }, [loadComandas]);

  const handleStatusChange = async (comandaId, newStatus) => {
    try {
      await updateComandaStatus(comandaId, newStatus);
      await loadComandas();
    } catch (err) {
      alert('Error al actualizar comanda: ' + err.message);
    }
  };

  const handlePlayAudio = (audioUrl) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(err => alert('No se pudo reproducir el audio: ' + err.message));
    }
  };

  const handleRegisterWaste = async (e) => {
    e.preventDefault();
    if (!selectedItem || !wasteQty) return;

    try {
      await recordStockMovement({
        itemId: selectedItem,
        movementType: 'DESPERDICIO',
        qtyChanged: parseFloat(wasteQty),
        reason: wasteReason || 'Merma autorizada en cocina',
        userName: 'Jefe de Cocina'
      });
      setShowWasteModal(false);
      setWasteQty('');
      setWasteReason('');
      await loadComandas();
    } catch (err) {
      alert('Error al registrar merma: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de Cocina KDS */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30 text-rose-400">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-lg text-slate-100 flex items-center gap-2">
              Pantalla KDS de Cocina & Barra
              <span className="bg-rose-500/20 text-rose-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                Monitores Táctiles
              </span>
            </h2>
            <p className="text-xs text-slate-400">Comandas en tiempo real con audios e indicaciones especiales en vivo</p>
          </div>
        </div>

        <button
          onClick={() => setShowWasteModal(true)}
          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Registrar Merma de Cocina</span>
        </button>
      </div>

      {/* Grid de Tickets de Comanda KDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {comandas.length === 0 ? (
          <div className="col-span-full py-16 text-center glass-panel rounded-3xl border border-[#dac8b3] bg-[#faf6ee] text-[#3d2717]">
            <ChefHat className="w-12 h-12 mx-auto text-[#5d402b] mb-2" />
            <p className="font-bold text-[#1f1209] text-sm">No hay comandas pendientes en cocina</p>
            <p className="text-xs text-[#3d2717] font-semibold">Todas las estaciones están al día.</p>
          </div>
        ) : (
          comandas.map(cmd => (
            <div key={cmd.id} className="glass-card rounded-3xl border border-[#dac8b3] bg-[#fffdf9] overflow-hidden flex flex-col justify-between shadow-md">
              <div className="bg-[#2c1d13] text-[#f7f2e9] border-b border-[#422c1d] p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base text-[#f7f2e9]">{cmd.table_name}</h3>
                  <p className="text-xs text-[#c4b1a1]">Salonero: {cmd.waiter_name}</p>
                </div>
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg border ${
                  cmd.status === 'Nuevo' || cmd.status?.includes('Nuevo') ? 'bg-rose-900/60 text-rose-200 border-rose-600 animate-pulse' :
                  cmd.status === 'En preparación' ? 'bg-[#c86414]/30 text-[#f7f2e9] border-[#c86414]' :
                  'bg-[#46593a]/40 text-[#d4e6c8] border-[#46593a]'
                }`}>
                  {cmd.status}
                </span>
              </div>

              <div className="p-4 space-y-2.5">
                {cmd.items.map((i, idx) => (
                  <div key={idx} className="bg-[#faf6ee] p-3 rounded-2xl border border-[#dac8b3] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-sm text-[#1f1209]">{i.quantity}x {i.product_name}</p>
                    </div>

                    {/* Indicación Especial Escrita */}
                    {i.notes && (
                      <div className="bg-[#5d402b]/15 border border-[#5d402b]/30 px-2.5 py-1 rounded-lg text-[#5d402b] text-xs font-mono font-extrabold">
                        ⚠️ INDICACIÓN: {i.notes.toUpperCase()}
                      </div>
                    )}

                    {/* Audio Memo Grabado por el Salonero */}
                    {i.audioMemo && (
                      <div className="bg-sky-950/40 border border-sky-500/40 p-2 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-sky-300 font-bold flex items-center gap-1 text-[11px]">
                          <Mic className="w-3.5 h-3.5" /> Audio ({i.audioMemo.duration}s)
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(i.audioMemo.audioUrl)}
                          className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-md"
                        >
                          <Volume2 className="w-3 h-3" /> Reproducir Audio
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex gap-2">
                {(cmd.status === 'Nuevo' || cmd.status?.includes('Nuevo')) && (
                  <button
                    onClick={() => handleStatusChange(cmd.id, 'En preparación')}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all"
                  >
                    Iniciar Preparación
                  </button>
                )}
                {cmd.status === 'En preparación' && (
                  <button
                    onClick={() => handleStatusChange(cmd.id, 'Listo')}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all"
                  >
                    Marcar Listo para Servir
                  </button>
                )}
                {cmd.status === 'Listo' && (
                  <button
                    onClick={() => handleStatusChange(cmd.id, 'Entregado')}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition-all"
                  >
                    Marcar Entregado
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Merma Autorizada */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-700 w-full max-w-md rounded-3xl p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" /> Registrar Merma o Desperdicio
            </h3>
            <form onSubmit={handleRegisterWaste} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Insumo Afectado</label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                >
                  <option value="">-- Seleccionar Insumo --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Cantidad Merma</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej. 0.5"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Motivo / Causa</label>
                <input
                  type="text"
                  placeholder="Ej. Plato quemado, Insumo vencido..."
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowWasteModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl">Registrar Merma DB</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
