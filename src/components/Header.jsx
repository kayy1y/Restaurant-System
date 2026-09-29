import React from 'react';
import { 
  ShieldCheck, Briefcase, User, ChefHat, GlassWater, 
  CreditCard, Package, Wifi, WifiOff, Clock, LogOut, Flame
} from 'lucide-react';
import { getRestaurantIdentity } from '../services/themeService.js';

export default function Header({ 
  currentRole, 
  setCurrentRole, 
  activeSessionUser,
  isOffline, 
  setIsOffline, 
  activeBranch, 
  setActiveBranch,
  pendingFiscalQueue,
  onLogout
}) {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString('es-CR'));
  const [identity, setIdentity] = React.useState({
    name: 'La Vid Steak House & Pizza',
    address: 'La Fortuna, Costa Rica'
  });

  React.useEffect(() => {
    getRestaurantIdentity().then(data => setIdentity(data));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-CR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleIcon = (roleId) => {
    switch (roleId) {
      case 'ADMINISTRADOR': return <ShieldCheck className="w-4 h-4 text-emerald-300" />;
      case 'gerente': return <Briefcase className="w-4 h-4 text-amber-300" />;
      case 'SALONERO': return <User className="w-4 h-4 text-sky-300" />;
      case 'COCINA': return <ChefHat className="w-4 h-4 text-rose-300" />;
      case 'barra': return <GlassWater className="w-4 h-4 text-purple-300" />;
      case 'CAJERO': return <CreditCard className="w-4 h-4 text-indigo-300" />;
      case 'inventario': return <Package className="w-4 h-4 text-orange-300" />;
      default: return <User className="w-4 h-4 text-stone-300" />;
    }
  };

  return (
    <header className="bg-[var(--bg-sidebar)] text-[var(--sidebar-text)] border-b border-slate-700 sticky top-0 z-40 px-3 sm:px-5 py-2.5 shadow-lg backdrop-blur-xl transition-all">
      <div className="w-full max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity La Vid Steak House & Pizza Decorativo */}
        <div className="flex items-center gap-3">
          <div className="bg-[var(--primary-color)] p-2.5 rounded-xl border border-[var(--border-color)] text-white font-semibold text-lg flex items-center justify-center">
            LV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                {identity.name}
              </h1>
              <span className="hidden sm:inline-flex bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold">
                OPERACIÓN
              </span>
            </div>
            <p className="hidden sm:flex text-xs text-slate-400 font-medium items-center gap-1">
              {identity.address} <span className="font-mono text-slate-300 font-semibold">• GastroFlow OS</span>
            </p>
          </div>
        </div>

        {/* Control Bar: User Badge, Offline Mode, Clock */}
        <div className="flex flex-wrap items-center gap-2.5 ml-auto">
          {/* Active Employee Identity Badge */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-md">
            {getRoleIcon(currentRole.id)}
            <div className="text-xs">
              <p className="font-bold text-white flex items-center gap-1">
                {activeSessionUser?.name || 'Empleado'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono font-semibold">
                Rol: {currentRole.name || currentRole.id}
              </p>
            </div>
          </div>

          {/* Sistema En Línea */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-sm bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
            <Wifi className="w-3.5 h-3.5 text-emerald-300" />
            <span>EN LÍNEA</span>
          </div>

          {/* Real-time Clock */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300 font-mono shadow-inner">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>{time}</span>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-200 border border-slate-700 hover:border-rose-600 p-2 rounded-xl transition-all"
              title="Cerrar sesión de empleado"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
