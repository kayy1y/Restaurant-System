import React from 'react';
import { 
  LayoutGrid, ChefHat, Package, CreditCard, FileText, 
  RotateCcw, Sparkles, BarChart3, ShieldAlert 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentRole }) {
  const menuItems = [
    { id: 'mesas', label: 'POS & Mesas', icon: LayoutGrid, roles: ['ADMINISTRADOR', 'gerente', 'SALONERO', 'CAJERO'] },
    { id: 'cocina', label: 'KDS Cocina & Barra', icon: ChefHat, roles: ['ADMINISTRADOR', 'gerente', 'COCINA', 'barra', 'SALONERO'] },
    { id: 'caja', label: 'Caja & Cobros', icon: CreditCard, roles: ['ADMINISTRADOR', 'gerente', 'CAJERO'] },
    { id: 'inventario', label: 'Recetas & Stock', icon: Package, roles: ['ADMINISTRADOR', 'gerente', 'inventario', 'COCINA'] },
    { id: 'facturas', label: 'Facturación v4.3', icon: FileText, roles: ['ADMINISTRADOR', 'gerente', 'CAJERO'] },
    { id: 'devoluciones', label: 'Devoluciones', icon: RotateCcw, roles: ['ADMINISTRADOR', 'gerente', 'CAJERO'] },
    { id: 'ia', label: 'GastroAI Engine', icon: Sparkles, roles: ['ADMINISTRADOR', 'gerente', 'SALONERO', 'COCINA', 'inventario', 'CAJERO'], badge: 'AI' },
    { id: 'reportes', label: 'Reportes & Ventas', icon: BarChart3, roles: ['ADMINISTRADOR', 'gerente'] },
    { id: 'auditoria', label: 'Auditoría & Logs', icon: ShieldAlert, roles: ['ADMINISTRADOR', 'gerente'] }
  ];

  // Filtrar ítems visibles estrictamente según el rol de la sesión activa
  const visibleItems = menuItems.filter(item => 
    item.roles.includes(currentRole.id) || item.roles.includes(currentRole.id.toUpperCase())
  );

  return (
    <aside className="w-full md:w-64 glass-panel border-r border-slate-800 p-3 flex flex-row md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-y-auto">
      <div className="flex flex-row md:flex-col gap-1.5 w-full">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase hidden md:block">
          Módulos Operativos
        </div>

        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 rounded-md shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Identificación de Permisos del Rol */}
      <div className="hidden md:block mt-6 pt-4 border-t border-slate-800/80 px-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <p className="text-[11px] text-slate-400 font-semibold mb-1">Puesto: {currentRole.name}</p>
          <p className="text-[10px] text-slate-500 leading-snug">{currentRole.desc}</p>
        </div>
      </div>
    </aside>
  );
}
