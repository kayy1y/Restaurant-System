import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import IncidentsModal from './components/IncidentsModal';
import TestWorkerSwitcher from './components/TestWorkerSwitcher';

// Interfaces Especializadas por Puesto de Empleado
import SaloneroView from './components/roles/SaloneroView';
import CocinaView from './components/roles/CocinaView';
import CajeroView from './components/roles/CajeroView';
import AdminView from './components/roles/AdminView';

// Módulos Comunes
import InventoryDashboard from './components/inventory/InventoryDashboard';
import InvoiceManager from './components/InvoiceManager';
import ReturnsModal from './components/ReturnsModal';
import GastroAIAssistant from './components/GastroAIAssistant';
import ReportsDashboard from './components/ReportsDashboard';
import AuditLogViewer from './components/AuditLogViewer';

import { ROLES } from './data/mockData';
import { seedUnifiedDatabase } from './services/db';

export default function App() {
  const [activeSession, setActiveSession] = React.useState(null);
  const [currentRole, setCurrentRole] = React.useState(ROLES[0]);
  const [activeTab, setActiveTab] = React.useState('mesas');
  const [isOffline, setIsOffline] = React.useState(false);
  const [activeBranch, setActiveBranch] = React.useState('001');

  // Modal de Incidencia Universal
  const [showIncidentModal, setShowIncidentModal] = React.useState(false);

  // Inicializar Base de Datos Unificada
  React.useEffect(() => {
    seedUnifiedDatabase().catch(err => console.error('Error seeding DB:', err));
  }, []);

  // Al autenticar empleado en la pantalla inicial
  const handleLoginSuccess = (session) => {
    setActiveSession(session);
    const matchedRole = ROLES.find(r => r.id.toUpperCase() === session.user.role_id.toUpperCase()) || ROLES[0];
    setCurrentRole(matchedRole);

    if (session.user.role_id === 'SALONERO') setActiveTab('mesas');
    else if (session.user.role_id === 'COCINA') setActiveTab('cocina');
    else if (session.user.role_id === 'CAJERO') setActiveTab('caja');
    else setActiveTab('mesas');
  };

  // Selector Rápido de Trabajador (Modo Pruebas Sin Recargar Página)
  const handleSwitchWorker = (newUser) => {
    const matchedRole = ROLES.find(r => r.id.toUpperCase() === newUser.role_id.toUpperCase()) || ROLES[0];
    const newSession = { user: newUser, role: matchedRole };
    setActiveSession(newSession);
    setCurrentRole(matchedRole);

    if (newUser.role_id === 'SALONERO') setActiveTab('mesas');
    else if (newUser.role_id === 'COCINA') setActiveTab('cocina');
    else if (newUser.role_id === 'CAJERO') setActiveTab('caja');
    else setActiveTab('mesas');
  };

  // Si no hay sesión iniciada, mostrar Pantalla de Login Obligatoria
  if (!activeSession) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const roleUpper = currentRole.id.toUpperCase();

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
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
      />

      {/* Main Layout: Sidebar Left, Content Right */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentRole={currentRole}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto w-full relative">
          {/* Barra de Herramientas Superior: Identidad Activa, Selector de Modo Pruebas & Incidencias */}
          <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
            <TestWorkerSwitcher
              activeSession={activeSession}
              onSwitchWorker={handleSwitchWorker}
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('admin')}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>🔌 Probador Supabase DB</span>
              </button>

              <button
                onClick={() => setShowIncidentModal(true)}
                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>⚠️ Reportar Incidencia</span>
              </button>
            </div>
          </div>

          {/* Renderizado Dinámico e Instantáneo de Vistas según la Sesión Activa */}
          {activeTab === 'admin' && <AdminView />}
          {activeTab !== 'admin' && roleUpper === 'SALONERO' && <SaloneroView activeSessionUser={activeSession.user} />}
          {activeTab !== 'admin' && roleUpper === 'COCINA' && <CocinaView />}
          {activeTab !== 'admin' && roleUpper === 'CAJERO' && (
            activeTab === 'facturas' ? <InvoiceManager currentRole={currentRole} invoices={[]} /> : <CajeroView />
          )}

          {/* Renderizado para Administrador y Navegación General */}
          {activeTab !== 'admin' && (roleUpper === 'ADMINISTRADOR' || roleUpper === 'GERENTE' || roleUpper === 'BARRA' || roleUpper === 'INVENTARIO') && (
            <>
              {activeTab === 'mesas' && <SaloneroView activeSessionUser={activeSession.user} />}
              {activeTab === 'cocina' && <CocinaView />}
              {activeTab === 'caja' && <CajeroView />}
              {activeTab === 'inventario' && <InventoryDashboard currentRole={currentRole} />}
              {activeTab === 'facturas' && <InvoiceManager currentRole={currentRole} invoices={[]} />}
              {activeTab === 'devoluciones' && <ReturnsModal orders={[]} currentRole={currentRole} onLogAudit={() => {}} />}
              {activeTab === 'ia' && <GastroAIAssistant orders={[]} rawIngredients={[]} currentRole={currentRole} />}
              {activeTab === 'reportes' && <ReportsDashboard />}
              {activeTab === 'auditoria' && <AuditLogViewer auditLogs={[]} />}
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
