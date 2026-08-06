import React from 'react';
import { UserCheck, RefreshCw, Lock, ChevronDown, Sparkles, ChefHat, CreditCard, ShieldCheck, User } from 'lucide-react';
import { MODO_PRUEBAS } from '../config/appConfig';
import { getAllUsers } from '../services/authService';
import { dbPut } from '../services/db';

export default function TestWorkerSwitcher({ activeSession, onSwitchWorker }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [users, setUsers] = React.useState([]);

  React.useEffect(() => {
    if (MODO_PRUEBAS) {
      getAllUsers().then(setUsers).catch(console.error);
    }
  }, []);

  // Si MODO_PRUEBAS está desactivado (Modo Producción), no renderizar absolutamente nada
  if (!MODO_PRUEBAS) return null;

  const handleSelectWorker = async (user) => {
    // 1. Registrar auditoría del cambio en modo pruebas
    await dbPut('audit_logs', {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_name: user.name,
      role_id: user.role_id,
      action: 'CAMBIO_TRABAJADOR_MODO_PRUEBAS',
      details: `Cambio rápido de trabajador en Modo Pruebas de ${activeSession?.user?.name || 'Anon'} a ${user.name} (${user.role_id})`
    });

    // 2. Cambiar la identidad y el rol activo sin recargar la página
    onSwitchWorker(user);
    setIsOpen(false);
  };

  const getRoleIcon = (roleId) => {
    switch (roleId) {
      case 'SALONERO': return User;
      case 'COCINA': return ChefHat;
      case 'CAJERO': return CreditCard;
      case 'ADMINISTRADOR': return ShieldCheck;
      default: return User;
    }
  };

  // Agrupar usuarios por rol
  const saloneros = users.filter(u => u.role_id === 'SALONERO');
  const cocineros = users.filter(u => u.role_id === 'COCINA');
  const cajeros = users.filter(u => u.role_id === 'CAJERO');
  const admins = users.filter(u => u.role_id === 'ADMINISTRADOR');

  return (
    <>
      {/* Top Floating Pill Badge (Discreto y Profesional) */}
      <div className="bg-slate-900/90 border border-amber-500/40 text-amber-300 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono shadow-lg backdrop-blur-md">
        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
          🧪 MODO DE PRUEBAS
        </span>
        <span className="text-slate-300 font-sans text-[11px]">
          Usuario: <strong className="text-white">{activeSession?.user?.name || 'Laura'}</strong> ({activeSession?.user?.role_id || 'SALONERO'})
        </span>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-all shadow-sm"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Cambiar trabajador</span>
        </button>
      </div>

      {/* Modal de Selección Rápida de Empleado (Sin Recargar Página) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-700 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-extrabold text-lg text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Selector Rápido de Trabajador (Modo Pruebas)
                </h3>
                <p className="text-xs text-slate-400">Cambia de identidad sin recargar la página ni perder el pedido activo</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-800 text-slate-400 rounded-xl">✕</button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Saloneros */}
              <div>
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block mb-2">Saloneros</span>
                <div className="grid grid-cols-2 gap-2">
                  {saloneros.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectWorker(u)}
                      className={`p-3 rounded-2xl text-xs font-bold border flex items-center justify-between transition-all ${
                        activeSession?.user?.id === u.id ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-2 ring-sky-500/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-sky-400" /> {u.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">PIN: {u.pin}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cocina */}
              <div>
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-2">Cocina & Barra</span>
                <div className="grid grid-cols-2 gap-2">
                  {cocineros.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectWorker(u)}
                      className={`p-3 rounded-2xl text-xs font-bold border flex items-center justify-between transition-all ${
                        activeSession?.user?.id === u.id ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-rose-400" /> {u.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">PIN: {u.pin}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Caja */}
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">Caja & Cobros</span>
                <div className="grid grid-cols-2 gap-2">
                  {cajeros.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectWorker(u)}
                      className={`p-3 rounded-2xl text-xs font-bold border flex items-center justify-between transition-all ${
                        activeSession?.user?.id === u.id ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-400" /> {u.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">PIN: {u.pin}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Administración */}
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-2">Administración General</span>
                <div className="grid grid-cols-2 gap-2">
                  {admins.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectWorker(u)}
                      className={`p-3 rounded-2xl text-xs font-bold border flex items-center justify-between transition-all ${
                        activeSession?.user?.id === u.id ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400" /> {u.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">PIN: {u.pin}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
