import React from 'react';
import { 
  ShieldCheck, Briefcase, User, ChefHat, GlassWater, 
  CreditCard, Package, Wifi, WifiOff, Sparkles, Building2, Clock, LogOut 
} from 'lucide-react';
import { ROLES, RESTAURANT_INFO } from '../data/mockData';

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

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-CR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleIcon = (roleId) => {
    switch (roleId) {
      case 'ADMINISTRADOR': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'gerente': return <Briefcase className="w-4 h-4 text-amber-400" />;
      case 'SALONERO': return <User className="w-4 h-4 text-sky-400" />;
      case 'COCINA': return <ChefHat className="w-4 h-4 text-rose-400" />;
      case 'barra': return <GlassWater className="w-4 h-4 text-purple-400" />;
      case 'CAJERO': return <CreditCard className="w-4 h-4 text-indigo-400" />;
      case 'inventario': return <Package className="w-4 h-4 text-orange-400" />;
      default: return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <header className="glass-panel sticky top-0 z-40 px-4 py-3 border-b border-slate-800/80 shadow-lg backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-rose-600 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl flex items-center justify-center transform hover:scale-105 transition-transform">
            🍷
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-rose-400 bg-clip-text text-transparent">
                GastroFlow OS
              </h1>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shadow-sm">
                CR v4.3 Fiscal
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {RESTAURANT_INFO.legalName} • <span className="font-mono text-slate-300">Cédula: {RESTAURANT_INFO.idNumber}</span>
            </p>
          </div>
        </div>

        {/* Control Bar: User Badge, Offline Mode, Clock */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Employee Identity Badge (Dinamico Real Sin Texto Fijo) */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-md">
            {getRoleIcon(currentRole.id)}
            <div className="text-xs">
              <p className="font-bold text-slate-100 flex items-center gap-1">
                {activeSessionUser?.name || 'Empleado'}
              </p>
              <p className="text-[10px] text-amber-400 font-mono font-semibold">
                Rol: {currentRole.name || currentRole.id}
              </p>
            </div>
          </div>

          {/* Offline Simulator Switch */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            title="Simular pérdida o reconexión de red local / Internet"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
              isOffline 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse-subtle' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-rose-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isOffline ? 'MODO OFFLINE' : 'EN LÍNEA'}</span>
          </button>

          {/* Real-time Clock */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 font-mono shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{time}</span>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 p-2 rounded-xl transition-all"
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
