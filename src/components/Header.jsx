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
    <header className="bg-[#2c1d13] text-[#f7f2e9] border-b border-[#c86414]/30 sticky top-0 z-40 px-4 py-2.5 shadow-2xl backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity La Vid Steak House & Pizza Decorativo */}
        <div className="flex items-center gap-3">
          <div className="bg-[#5d402b] p-2.5 rounded-2xl shadow-lg border border-[#c86414]/50 text-[#fbf7f0] font-black text-xl flex items-center justify-center transform hover:scale-105 transition-transform">
            🍷
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-lg tracking-tight text-[#f7f2e9] flex items-center gap-1.5">
                {identity.name}
                <span className="text-xs text-[#c86414]" title="Steakhouse Premium">🥩</span>
              </h1>
              <span className="bg-[#c86414]/20 text-[#f7f2e9] border border-[#c86414]/40 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                La Fortuna, CR
              </span>
            </div>
            <p className="text-xs text-[#c4b1a1] font-medium flex items-center gap-1">
              {identity.address} • <span className="font-mono text-[#d8c4a7] font-semibold">GastroFlow OS v4.3</span>
            </p>
          </div>
        </div>

        {/* Control Bar: User Badge, Offline Mode, Clock */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Employee Identity Badge */}
          <div className="bg-[#1f140d] border border-[#4a3324] rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-md">
            {getRoleIcon(currentRole.id)}
            <div className="text-xs">
              <p className="font-bold text-[#f7f2e9] flex items-center gap-1">
                {activeSessionUser?.name || 'Empleado'}
              </p>
              <p className="text-[10px] text-[#d8c4a7] font-mono font-semibold">
                Rol: {currentRole.name || currentRole.id}
              </p>
            </div>
          </div>

          {/* Sistema En Línea */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-sm bg-[#46593a]/30 text-[#d4e6c8] border-[#46593a]">
            <Wifi className="w-3.5 h-3.5 text-emerald-300" />
            <span>EN LÍNEA</span>
          </div>

          {/* Real-time Clock */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#1f140d] border border-[#4a3324] px-3 py-1.5 rounded-xl text-xs text-[#d8c4a7] font-mono shadow-inner">
            <Clock className="w-3.5 h-3.5 text-[#c86414]" />
            <span>{time}</span>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-[#1f140d] hover:bg-rose-950/60 text-[#c4b1a1] hover:text-rose-200 border border-[#4a3324] hover:border-rose-600 p-2 rounded-xl transition-all"
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
