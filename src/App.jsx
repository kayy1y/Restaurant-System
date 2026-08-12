import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import IncidentsModal from './components/IncidentsModal';

// Interfaces Especializadas por Puesto de Empleado
import SaloneroView from './components/roles/SaloneroView';
import CocinaView from './components/roles/CocinaView';
import CajeroView from './components/roles/CajeroView';
import AdminView from './components/roles/AdminView';

// Módulos Comunes & Personalización
import InventoryDashboard from './components/inventory/InventoryDashboard';
import InvoiceManager from './components/InvoiceManager';
import ReturnsModal from './components/ReturnsModal';
import GastroAIAssistant from './components/GastroAIAssistant';
import ReportsDashboard from './components/ReportsDashboard';
import AuditLogViewer from './components/AuditLogViewer';
import ReservationManager from './components/ReservationManager';

import { ROLES, TABLES } from './data/mockData';
import { seedUnifiedDatabase } from './services/db';
import { getUserPreferences, applyThemeToDOM } from './services/themeService';
import { updateReservationStatus } from './services/reservationService';

export default function App() {
  const [activeSession, setActiveSession] = React.useState(null);
  const [currentRole, setCurrentRole] = React.useState(ROLES[0]);
  const [activeTab, setActiveTab] = React.useState('mesas');
  const [isOffline, setIsOffline] = React.useState(false);
  const [activeBranch, setActiveBranch] = React.useState('001');
  const [isSidebarCompact, setIsSidebarCompact] = React.useState(false);
  const [tables, setTables] = React.useState(TABLES);

  // Modal de Incidencia Universal
  const [showIncidentModal, setShowIncidentModal] = React.useState(false);

  // Inicializar Base de Datos Unificada & Cargar Tema por Defecto
  React.useEffect(() => {
    seedUnifiedDatabase().catch(err => console.error('Error seeding DB:', err));
    getUserPreferences('global').then(prefs => applyThemeToDOM(prefs));
  }, []);

  // Al autenticar empleado en la pantalla inicial: Cargar sus preferencias personales de tema
  const handleLoginSuccess = async (session) => {
    setActiveSession(session);
    const matchedRole = ROLES.find(r => r.id.toUpperCase() === session.user.role_id.toUpperCase()) || ROLES[0];
    setCurrentRole(matchedRole);

    const userPrefs = await getUserPreferences(session.user.id);
    applyThemeToDOM(userPrefs);
    if (userPrefs.sidebar_style === 'compact') setIsSidebarCompact(true);

    if (session.user.role_id === 'SALONERO') setActiveTab('mesas');
    else if (session.user.role_id === 'COCINA') setActiveTab('cocina');
    else if (session.user.role_id === 'CAJERO') setActiveTab('caja');
    else setActiveTab('mesas');
  };

  // Acción Sentar Cliente desde el módulo de Reservas: cambia mesa a OCUPADA y pasa a la vista POS
  const handleSeatCustomerFromReservation = async (reservation) => {
    try {
      await updateReservationStatus(reservation.id_reserva, 'sentado');
      setTables(prevTables => prevTables.map(t => 
        t.id === reservation.id_mesa ? { ...t, status: 'ocupada' } : t
      ));
      setActiveTab('mesas');
    } catch (err) {
      console.error('Error sentando cliente:', err);
    }
  };

  // Enforzar restricción estricta de pestañas permitidas por rol
  React.useEffect(() => {
    const roleIdUpper = (currentRole?.id || '').toUpperCase();
    const roleAllowedTabs = {
      SALONERO: ['mesas', 'reservas', 'ia'],
      CAJERO: ['mesas', 'reservas', 'caja', 'facturas', 'devoluciones', 'ia'],
      COCINA: ['cocina', 'inventario', 'ia'],
      BARRA: ['cocina', 'inventario', 'ia'],
      INVENTARIO: ['inventario', 'ia'],
      GERENTE: ['mesas', 'reservas', 'cocina', 'caja', 'inventario', 'facturas', 'devoluciones', 'ia', 'reportes'],
      ADMINISTRADOR: ['mesas', 'reservas', 'cocina', 'caja', 'inventario', 'facturas', 'devoluciones', 'ia', 'reportes', 'auditoria', 'admin']
    };

    const allowed = roleAllowedTabs[roleIdUpper];
    if (allowed && !allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [currentRole, activeTab]);

  // Si no hay sesión iniciada, mostrar Pantalla de Login Obligatoria
  if (!activeSession) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col font-sans transition-colors duration-300">
      {/* Top Header */}
      <Header
        currentRole={currentRole}
        setCurrentRole={(role) => setCurrentRole(role)}
        activeSessionUser={activeSession.user}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        activeBranch={activeBranch}
        setActiveBranch={setActiveBranch}
        pendingFiscalQueue={0}
        onLogout={() => setActiveSession(null)}
        onOpenAppearance={() => setActiveTab('apariencia')}
      />

      {/* Main Layout: Sidebar Left, Content Right */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentRole={currentRole}
          isCompact={isSidebarCompact}
          setIsCompact={setIsSidebarCompact}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto w-full relative">
          {/* Barra de Herramientas Superior: Incidencias */}
          <div className="mb-4 flex justify-end items-center gap-2">
            <button
              onClick={() => setShowIncidentModal(true)}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>⚠️ Reportar Incidencia</span>
            </button>
          </div>

          {/* Módulo de Reservas de Mesas */}
          {activeTab === 'reservas' && (
            <ReservationManager 
              tables={tables} 
              currentRole={currentRole} 
              onSeatCustomer={handleSeatCustomerFromReservation} 
            />
          )}

          {/* Módulo de Facturación v4.3 */}
          {activeTab === 'facturas' && (
            <InvoiceManager currentRole={currentRole} />
          )}

          {/* Renderizado de Pestañas Operativas Generales */}
          {activeTab !== 'reservas' && activeTab !== 'facturas' && (
            <>
              {activeTab === 'mesas' && <SaloneroView activeSessionUser={activeSession.user} />}
              {activeTab === 'cocina' && <CocinaView />}
              {activeTab === 'caja' && <CajeroView />}
              {activeTab === 'inventario' && <InventoryDashboard currentRole={currentRole} />}
              {activeTab === 'devoluciones' && <ReturnsModal orders={[]} currentRole={currentRole} onLogAudit={() => {}} />}
              {activeTab === 'ia' && <GastroAIAssistant orders={[]} rawIngredients={[]} currentRole={currentRole} />}
              {activeTab === 'reportes' && <ReportsDashboard />}
              {activeTab === 'auditoria' && <AuditLogViewer auditLogs={[]} />}
              {activeTab === 'admin' && <AdminView />}
            </>
          )}
        </main>
      </div>

      {/* Modal Universal de Incidencias */}
      {showIncidentModal && (
        <IncidentsModal
          order={null}
          onClose={() => setShowIncidentModal(false)}
          onSuccess={() => {}}
          currentRole={currentRole}
        />
      )}
    </div>
  );
}
