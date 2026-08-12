import React from 'react';
import { 
  Calendar as CalendarIcon, Clock, Users, Plus, Search, CheckCircle2, 
  XCircle, UserCheck, AlertTriangle, Edit3, Trash2, ChevronLeft, ChevronRight, 
  Sparkles, Phone, FileText, Check, MapPin, Filter 
} from 'lucide-react';

import { 
  getAllReservations, saveReservation, cancelReservation, updateReservationStatus, 
  getAvailableTablesForTimeSlot, RESERVATION_STATUSES, ESTIMATED_DURATIONS,
  subscribeToReservations, getCostaRicaDateString, updateReservationTable
} from '../services/reservationService.js';
import { liveSync } from '../services/liveSync.js';

export default function ReservationManager({ tables, currentRole, onSeatCustomer }) {
  const [activeTab, setActiveTab] = React.useState('hoy'); // hoy, proximas, calendario, historial
  const [reservations, setReservations] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [toastMsg, setToastMsg] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState('');

  // Modal Nueva / Editar Reserva
  const [showModal, setShowModal] = React.useState(false);
  const [editingRes, setEditingRes] = React.useState(null);
  const [availableTables, setAvailableTables] = React.useState([]);

  const todayStr = getCostaRicaDateString(new Date());

  const [form, setForm] = React.useState({
    nombre_cliente: '',
    telefono: '',
    cantidad_personas: 2,
    fecha: todayStr,
    hora: '19:00',
    duracion_minutos: 90,
    id_mesa: '',
    observaciones: '',
    estado: 'confirmada'
  });
  const [formError, setFormError] = React.useState('');

  // Cargar Reservas desde Supabase y Suscribir a WebSocket / LiveSync / Realtime
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const list = await getAllReservations();
      setReservations(list);
    } catch (err) {
      console.error('Error al cargar reservas:', err);
      setErrorMsg('No fue posible cargar las reservas.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();

    const unsubscribeLiveSync = liveSync.subscribe('RESERVATION_UPDATED', () => {
      loadData();
    });

    const unsubscribeRealtime = subscribeToReservations(() => {
      loadData();
    });

    return () => {
      if (unsubscribeLiveSync) unsubscribeLiveSync();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [loadData]);

  // Recalcular mesas reales disponibles cuando cambie fecha, hora, duración o comensales
  React.useEffect(() => {
    if (showModal) {
      getAvailableTablesForTimeSlot(
        tables,
        form.fecha,
        form.hora,
        form.duracion_minutos,
        form.cantidad_personas,
        editingRes?.id_reserva
      ).then(avail => {
        setAvailableTables(avail);
        if (avail.length > 0 && !form.id_mesa) {
          setForm(f => ({ ...f, id_mesa: avail[0].id }));
        }
      });
    }
  }, [showModal, form.fecha, form.hora, form.duracion_minutos, form.cantidad_personas, editingRes, tables]);

  const handleAssignTable = async (resId, newTableId) => {
    try {
      await updateReservationTable(resId, newTableId);
      await loadData();
      setToastMsg('Mesa asignada/actualizada correctamente en Supabase.');
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      alert('Error asignando mesa: ' + err.message);
    }
  };

  const handleOpenNewModal = () => {
    setEditingRes(null);
    setForm({
      nombre_cliente: '',
      telefono: '',
      cantidad_personas: 2,
      fecha: todayStr,
      hora: '19:00',
      duracion_minutos: 90,
      id_mesa: tables[0]?.id || '',
      observaciones: '',
      estado: 'confirmada'
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (res) => {
    setEditingRes(res);
    setForm({
      nombre_cliente: res.nombre_cliente,
      telefono: res.telefono,
      cantidad_personas: res.cantidad_personas,
      fecha: res.fecha || getCostaRicaDateString(res.fecha_hora_inicio),
      hora: res.hora || new Date(res.fecha_hora_inicio).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Costa_Rica' }),
      duracion_minutos: res.duracion_minutos || 90,
      id_mesa: res.id_mesa,
      observaciones: res.observaciones || '',
      estado: res.estado || 'confirmada'
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      await saveReservation({
        ...form,
        id_reserva: editingRes?.id_reserva
      }, currentRole?.name || 'Personal Interno');

      setShowModal(false);
      await loadData();
      setToastMsg(`Reserva de ${form.nombre_cliente} guardada correctamente.`);
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      setFormError(err.message || 'Error guardando reserva.');
    }
  };

  const handleCancelReservation = async (resId, clientName) => {
    if (!window.confirm(`¿Desea cancelar la reserva de ${clientName}? La mesa quedará liberada en este horario.`)) return;

    try {
      await cancelReservation(resId, currentRole?.name);
      await loadData();
      setToastMsg(`Reserva de ${clientName} fue cancelada.`);
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      alert('Error cancelando reserva: ' + err.message);
    }
  };

  const handleStatusChange = async (resId, newStatus) => {
    try {
      await updateReservationStatus(resId, newStatus);
      await loadData();
    } catch (err) {
      alert('Error cambiando estado: ' + err.message);
    }
  };

  const handleSeatClientAction = (res) => {
    if (onSeatCustomer) {
      onSeatCustomer(res);
    }
  };

  // Filtrar reservas por término de búsqueda y pestañas
  const filteredReservations = reservations.filter(r => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (r.nombre_cliente || '').toLowerCase().includes(term) ||
      (r.telefono || '').includes(term) ||
      (r.observaciones && r.observaciones.toLowerCase().includes(term)) ||
      (r.id_mesa || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;

    const resDateStr = r.fecha || getCostaRicaDateString(r.fecha_hora_inicio);

    if (activeTab === 'hoy') {
      return resDateStr === todayStr && r.estado !== 'cancelada' && r.estado !== 'completada';
    } else if (activeTab === 'proximas') {
      return resDateStr >= todayStr && r.estado !== 'cancelada' && r.estado !== 'completada';
    } else if (activeTab === 'historial') {
      return r.estado === 'completada' || r.estado === 'cancelada' || r.estado === 'no_se_presento';
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 text-[#231710]">
      {/* Toast Notificación */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2c1d13] text-[#f7f2e9] border border-[#c86414] font-bold text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-[#c86414]" /> {toastMsg}
        </div>
      )}

      {/* Encabezado Módulo Reservas */}
      <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] shadow-md flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#c86414] font-bold text-xs uppercase tracking-wider font-mono">
            <CalendarIcon className="w-4 h-4" /> La Vid Steak House & Pizza • Gestión de Reservas
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-[#1f1209] tracking-tight mt-0.5">
            Módulo de Reservas de Mesas
          </h2>
          <p className="text-xs text-[#3d2717] font-semibold mt-1">
            Administra reservas de comensales, sincronización con Supabase en tiempo real y mesas reales (Costa Rica).
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="bg-[#c86414] hover:bg-[#b45309] text-[#fffdf9] font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 border border-[#a14b08]"
        >
          <Plus className="w-4 h-4" /> + Nueva Reserva
        </button>
      </div>

      {/* Control Bar: Pestañas de Navegación & Buscador */}
      <div className="glass-panel p-4 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'hoy', label: 'Hoy', icon: CalendarIcon },
            { id: 'proximas', label: 'Próximas', icon: Clock },
            { id: 'calendario', label: 'Calendario', icon: CalendarIcon },
            { id: 'historial', label: 'Historial', icon: FileText }
          ].map(t => {
            const Icon = t.icon;
            const isAct = activeTab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isAct 
                    ? 'bg-[#5d402b] text-[#fffdf9] shadow-md border border-[#3e2718]' 
                    : 'bg-[#fffdf9] text-[#6e5a4b] hover:bg-[#f5efe6] border border-[#dac8b3]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isAct ? 'text-[#d8c4a7]' : 'text-[#6e5a4b]'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#6e5a4b] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono o mesa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#231710] font-bold focus:outline-none focus:border-[#5d402b]"
          />
        </div>
      </div>

      {/* VISTA 1, 2 Y 4: LISTA DE RESERVAS */}
      {activeTab !== 'calendario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-[#6e5a4b] glass-panel border border-[#dac8b3] rounded-3xl bg-[#fffdf9]">
              <CalendarIcon className="w-10 h-10 text-[#c86414] animate-bounce mx-auto mb-2" />
              <p className="font-bold text-sm text-[#231710]">Cargando reservas desde Supabase...</p>
            </div>
          ) : errorMsg ? (
            <div className="col-span-full py-12 text-center text-[#802319] glass-panel border border-[#802319]/30 rounded-3xl bg-[#fffdf9]">
              <AlertTriangle className="w-10 h-10 text-[#802319] mx-auto mb-2" />
              <p className="font-bold text-sm">{errorMsg}</p>
              <button
                onClick={loadData}
                className="mt-3 px-4 py-2 bg-[#5d402b] text-[#fffdf9] rounded-xl text-xs font-bold"
              >
                Reintentar
              </button>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="col-span-full py-16 text-center text-[#6e5a4b] glass-panel border border-[#dac8b3] rounded-3xl bg-[#fffdf9]">
              <CalendarIcon className="w-10 h-10 text-[#dac8b3] mx-auto mb-2" />
              <p className="font-bold text-sm text-[#231710]">No se encontraron reservas registradas</p>
              <p className="text-xs text-[#6e5a4b] mt-1">Presiona "+ Nueva Reserva" para agendar una mesa real.</p>
            </div>
          ) : (
            filteredReservations.map(res => {
              const statusObj = RESERVATION_STATUSES.find(s => s.id === res.estado) || RESERVATION_STATUSES[0];
              const tableObj = tables.find(t => t.id === res.id_mesa);
              const startTimeStr = new Date(res.fecha_hora_inicio).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' });
              const endTimeStr = new Date(res.fecha_hora_fin).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' });


              return (
                <div key={res.id_reserva} className="glass-card p-4 rounded-3xl border border-[#dac8b3] bg-[#fffdf9] space-y-3 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-heading font-extrabold text-base text-[#231710] flex items-center gap-1.5">
                          {res.nombre_cliente}
                        </h4>
                        <p className="text-xs text-[#6e5a4b] font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#c86414]" /> {res.telefono}
                        </p>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${statusObj.color}`}>
                        {statusObj.label.toUpperCase()}
                      </span>
                    </div>

                    <div className="bg-[#faf6ee] p-3 rounded-2xl border border-[#dac8b3] space-y-1.5 text-xs text-[#231710]">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[#6e5a4b] font-bold">Mesa Asignada:</span>
                        <select
                          value={res.id_mesa || ''}
                          onChange={(e) => handleAssignTable(res.id_reserva, e.target.value)}
                          className="bg-[#fffdf9] border border-[#dac8b3] rounded-lg px-2 py-0.5 text-xs font-extrabold text-[#5d402b] cursor-pointer focus:outline-none focus:border-[#5d402b]"
                          title="Seleccionar / Reasignar Mesa"
                        >
                          {tables.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.zone} - {t.capacity}p)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-between items-center font-mono text-[11px] text-[#6e5a4b]">
                        <span>Comensales:</span>
                        <span className="font-bold text-[#231710]">{res.cantidad_personas} personas</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-[#6e5a4b]">Horario:</span>
                        <span className="font-bold text-[#c86414]">{startTimeStr} - {endTimeStr}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px] text-[#6e5a4b]">
                        <span>Fecha:</span>
                        <span>{res.fecha || res.fecha_hora_inicio.split('T')[0]}</span>
                      </div>
                      {res.observaciones && (
                        <div className="pt-1.5 border-t border-[#dac8b3] text-[11px] italic text-[#6e5a4b]">
                          "{res.observaciones}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones de la Reserva */}
                  <div className="pt-2 border-t border-[#dac8b3] space-y-2 text-xs">
                    {/* Botones Flujo de Llegada y Asignación de Mesa */}
                    {res.estado !== 'cancelada' && res.estado !== 'completada' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleStatusChange(res.id_reserva, res.estado === 'cliente_llego' ? 'confirmada' : 'cliente_llego')}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                            res.estado === 'cliente_llego'
                              ? 'bg-sky-700 text-white border-sky-800'
                              : 'bg-[#faf6ee] text-[#231710] border-[#dac8b3] hover:bg-sky-50'
                          }`}
                        >
                          {res.estado === 'cliente_llego' ? '✓ Cliente llegó' : 'Marcar Llegada'}
                        </button>

                        <button
                          onClick={() => handleSeatClientAction(res)}
                          className="py-1.5 px-2 rounded-xl text-[11px] font-extrabold bg-[#5d402b] text-[#fffdf9] hover:bg-[#483120] border border-[#3e2718] text-center shadow-sm"
                        >
                          🪑 Sentar Cliente
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <button
                        onClick={() => handleOpenEditModal(res)}
                        className="text-[#5d402b] font-bold hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Editar
                      </button>

                      {res.estado !== 'cancelada' && (
                        <button
                          onClick={() => handleCancelReservation(res.id_reserva, res.nombre_cliente)}
                          className="text-[#802319] font-bold hover:underline flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VISTA 3: VISTA DE CALENDARIO INTERACTIVO */}
      {activeTab === 'calendario' && (
        <div className="glass-panel p-6 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] space-y-4 shadow-md">
          <div className="flex justify-between items-center border-b border-[#dac8b3] pb-3">
            <h3 className="font-heading font-extrabold text-base text-[#231710]">Calendario de Reservas La Vid</h3>
            <span className="text-xs font-mono font-bold text-[#c86414]">Zona Horaria: America/Costa_Rica</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2 text-center text-xs font-bold">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="py-2 bg-[#5d402b] text-[#fffdf9] rounded-xl font-mono">
                {d}
              </div>
            ))}
          </div>

          <div className="py-8 text-center text-[#6e5a4b] text-xs font-semibold bg-[#fffdf9] rounded-2xl border border-[#dac8b3]">
            <p>Selecciona un día en la lista o vista para ver todas las reservas agendadas.</p>
            <p className="mt-1 font-mono text-[#c86414]">Total de Reservas Registradas: {reservations.length}</p>
          </div>
        </div>
      )}

      {/* MODAL NUEVA / EDITAR RESERVA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#231710] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-[#dac8b3] pb-3">
              <h3 className="font-heading font-extrabold text-lg text-[#231710]">
                {editingRes ? `Editar Reserva: ${editingRes.nombre_cliente}` : 'Nueva Reserva de Mesa Real'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg bg-[#f5efe6] text-[#6e5a4b]">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-[#802319]/20 border border-[#802319]/40 p-3 rounded-2xl text-xs text-[#802319] font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#231710] block mb-1">Nombre del Cliente *</label>
                  <input
                    type="text"
                    placeholder="Carlos Rodríguez"
                    value={form.nombre_cliente}
                    onChange={(e) => setForm({ ...form, nombre_cliente: e.target.value })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710] font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-[#231710] block mb-1">Teléfono *</label>
                  <input
                    type="text"
                    placeholder="8888-8888"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#231710] block mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-[#231710] block mb-1">Hora *</label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm({ ...form, hora: e.target.value })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-[#231710] block mb-1">Comensales</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.cantidad_personas}
                    onChange={(e) => setForm({ ...form, cantidad_personas: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#5d402b] block mb-1">Mesa Real Disponible *</label>
                  <select
                    value={form.id_mesa}
                    onChange={(e) => setForm({ ...form, id_mesa: e.target.value })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-bold text-[#231710]"
                    required
                  >
                    {availableTables.length === 0 ? (
                      <option value="">No hay mesas disponibles en este horario</option>
                    ) : (
                      availableTables.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.zone} - {t.capacity}p)</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#231710] block mb-1">Duración Estimada</label>
                  <select
                    value={form.duracion_minutos}
                    onChange={(e) => setForm({ ...form, duracion_minutos: parseInt(e.target.value) })}
                    className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 font-bold text-[#231710]"
                  >
                    {ESTIMATED_DURATIONS.map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#231710] block mb-1">Observaciones Especiales</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Cumpleaños, solicitar mesa cerca de ventana..."
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl px-3 py-2 text-[#231710]"
                />
              </div>

              <div className="pt-3 border-t border-[#dac8b3] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2.5 px-4 bg-[#f5efe6] text-[#231710] font-bold rounded-xl border border-[#dac8b3]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={availableTables.length === 0 && !form.id_mesa}
                  className="py-2.5 px-5 bg-[#c86414] hover:bg-[#b45309] text-[#fffdf9] font-black rounded-xl shadow-lg border border-[#a14b08] disabled:opacity-50"
                >
                  Guardar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
