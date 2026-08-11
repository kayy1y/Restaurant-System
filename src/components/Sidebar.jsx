import React from 'react';
import { 
  LayoutGrid, ChefHat, Package, CreditCard, FileText, 
  RotateCcw, Sparkles, BarChart3, ShieldAlert, Palette, Store, ChevronLeft, ChevronRight, Calendar 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentRole, isCompact, setIsCompact }) {
  const menuItems = [
    { id: 'mesas', label: 'POS & Mesas', icon: LayoutGrid, roles: ['ADMINISTRADOR', 'gerente', 'SALONERO', 'CAJERO'] },
    { id: 'reservas', label: 'Reservas', icon: Calendar, roles: ['ADMINISTRADOR', 'gerente', 'SALONERO', 'CAJERO'], badge: 'Nuevo' },
    { id: 'cocina', label: 'KDS Cocina & Barra', icon: ChefHat, roles: ['ADMINISTRADOR', 'gerente', 'COCINA', 'barra', 'SALONERO'] },
    { id: 'caja', label: 'Caja & Cobros', icon: CreditCard, roles: ['ADMINISTRADOR', 'gerente', 'CAJERO'] },
    { id: 'inventario', label: 'Recetas & Stock', icon: Package, roles: ['ADMINISTRADOR', 'gerente', 'inventario', 'COCINA'] },
    { id: 'facturas', label: 'Facturación v4.3', icon: FileText, roles: ['ADMINISTRADOR', 'gerente', 'CAJERO'] },
    { id: 'identidad', label: 'Identidad La Vid', icon: Store, roles: ['ADMINISTRADOR', 'gerente'] },
    { id: 'devoluciones', label: 'Devoluciones', icon: RotateCcw, roles: ['ADMINISTRADOR', 'gerente', 'CAJERO'] },
    { id: 'ia', label: 'GastroAI Engine', icon: Sparkles, roles: ['ADMINISTRADOR', 'gerente', 'SALONERO', 'COCINA', 'inventario', 'CAJERO'], badge: 'AI' },
    { id: 'reportes', label: 'Reportes & Ventas', icon: BarChart3, roles: ['ADMINISTRADOR', 'gerente'] },
    { id: 'auditoria', label: 'Auditoría & Logs', icon: ShieldAlert, roles: ['ADMINISTRADOR', 'gerente'] }
  ];

  const visibleItems = menuItems.filter(item => 
    item.roles.includes(currentRole.id) || item.roles.includes(currentRole.id.toUpperCase())
  );

  return (
    <aside className={`bg-[#2c1d13] text-[#f7f2e9] border-r border-[#422c1d] p-3 flex flex-row md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-y-auto transition-all duration-300 ${
      isCompact ? 'w-full md:w-20' : 'w-full md:w-64'
    }`}>
      <div className="flex flex-row md:flex-col gap-1.5 w-full">
        {/* Toggle Expandir / Contraer Barra Lateral */}
        <div className="px-3 py-2 flex items-center justify-between hidden md:flex">
          {!isCompact && (
            <span className="text-[11px] font-extrabold tracking-wider text-[#d8c4a7] uppercase font-mono">
              Módulos La Vid
            </span>
          )}
          <button
            onClick={() => setIsCompact && setIsCompact(!isCompact)}
            className="p-1 rounded-lg bg-[#1f140d] text-[#d8c4a7] hover:bg-[#3e2718] text-xs transition-all mx-auto md:ml-auto border border-[#4a3324]"
            title={isCompact ? "Expandir Barra Lateral" : "Contraer Barra Lateral"}
          >
            {isCompact ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCompact ? item.label : undefined}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#5d402b] text-[#fffdf9] border border-[#8c6544] shadow-lg shadow-[#1f140d]/40 font-bold'
                  : 'text-[#c4b1a1] hover:text-[#f7f2e9] hover:bg-[#3e2718] border border-transparent'
              } ${isCompact ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#f7f2e9]' : 'text-[#c4b1a1]'}`} />
              {!isCompact && <span className="truncate">{item.label}</span>}
              {!isCompact && item.badge && (
                <span className="ml-auto bg-[#c86414] text-[#fffdf9] font-bold text-[9px] px-1.5 py-0.2 rounded-md shadow-sm border border-[#a14b08]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Identificación de Permisos del Rol */}
      {!isCompact && (
        <div className="hidden md:block mt-6 pt-4 border-t border-[#422c1d] px-3">
          <div className="bg-[#1f140d] border border-[#4a3324] p-3 rounded-2xl shadow-inner">
            <p className="text-[11px] text-[#d8c4a7] font-bold mb-0.5">La Vid Steak House</p>
            <p className="text-[10px] text-[#c4b1a1] font-semibold">{currentRole.name}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
