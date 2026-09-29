import React from 'react';
import { SessionNavBar } from './ui/sidebar';
import { 
  LayoutGrid, ChefHat, Package, CreditCard, FileText, 
  RotateCcw, Sparkles, BarChart3, Calendar, ShieldCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentRole, activeSessionUser, onLogout }) {
  const roleIdUpper = (currentRole?.id || '').toUpperCase();

  const menuItems = [
    { id: 'mesas', label: 'POS & Mesas', icon: LayoutGrid, roles: ['ADMINISTRADOR', 'GERENTE', 'SALONERO', 'CAJERO'] },
    { id: 'reservas', label: 'Reservas', icon: Calendar, roles: ['ADMINISTRADOR', 'GERENTE', 'SALONERO', 'CAJERO'], badge: 'Nuevo' },
    { id: 'cocina', label: 'KDS Cocina & Barra', icon: ChefHat, roles: ['ADMINISTRADOR', 'GERENTE', 'COCINA', 'BARRA'] },
    { id: 'caja', label: 'Caja & Cobros', icon: CreditCard, roles: ['ADMINISTRADOR', 'GERENTE', 'CAJERO'] },
    { id: 'inventario', label: 'Recetas & Stock', icon: Package, roles: ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO', 'COCINA'] },
    { id: 'facturas', label: 'Facturación v4.3', icon: FileText, roles: ['ADMINISTRADOR', 'GERENTE', 'CAJERO'] },
    { id: 'devoluciones', label: 'Devoluciones', icon: RotateCcw, roles: ['ADMINISTRADOR', 'GERENTE', 'CAJERO'] },
    { id: 'ia', label: 'GastroAI Engine', icon: Sparkles, roles: ['ADMINISTRADOR', 'GERENTE', 'SALONERO', 'COCINA', 'INVENTARIO', 'CAJERO'], badge: 'AI' },
    { id: 'reportes', label: 'Reportes & Ventas', icon: BarChart3, roles: ['ADMINISTRADOR', 'GERENTE'] },
    { id: 'admin', label: 'Administrar Menú', icon: ShieldCheck, roles: ['ADMINISTRADOR'] }
  ];

  const visibleItems = menuItems.filter(item => 
    item.roles.map(r => r.toUpperCase()).includes(roleIdUpper)
  );

  return <SessionNavBar items={visibleItems} activeTab={activeTab} onNavigate={setActiveTab} userName={activeSessionUser?.name || 'Usuario'} roleName={currentRole?.name || 'Personal'} onLogout={onLogout} />;
}
