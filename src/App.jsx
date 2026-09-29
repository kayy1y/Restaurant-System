import React from 'react';
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams
} from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import IncidentsModal from './components/IncidentsModal';
import Banner from './components/ui/Banner';
import SaloneroView from './components/roles/SaloneroView';
import CocinaView from './components/roles/CocinaView';
import CajeroView from './components/roles/CajeroView';
import { ROLES, TABLES } from './data/mockData';
import { seedUnifiedDatabase } from './services/db';
import {
  getActiveSession,
  logout as clearActiveSession,
  refreshActiveSession
} from './services/authService';
import { getUserPreferences, applyThemeToDOM } from './services/themeService';
import { updateReservationStatus } from './services/reservationService';

const InventoryDashboard = React.lazy(() => import('./components/inventory/InventoryDashboard.jsx'));
const InvoiceManager = React.lazy(() => import('./components/InvoiceManager.jsx'));
const ReturnsModal = React.lazy(() => import('./components/ReturnsModal.jsx'));
const GastroAIAssistant = React.lazy(() => import('./components/GastroAIAssistant.jsx'));
const ReportsDashboard = React.lazy(() => import('./components/ReportsDashboard.jsx'));
const ReservationManager = React.lazy(() => import('./components/ReservationManager.jsx'));
const AdminView = React.lazy(() => import('./components/roles/AdminView.jsx'));

const ROLE_ALLOWED_TABS = {
  SALONERO: ['mesas', 'reservas', 'ia'],
  CAJERO: ['mesas', 'reservas', 'caja', 'facturas', 'devoluciones', 'ia'],
  COCINA: ['cocina', 'inventario', 'ia'],
  BARRA: ['cocina', 'inventario', 'ia'],
  INVENTARIO: ['inventario', 'ia'],
  GERENTE: ['mesas', 'reservas', 'cocina', 'caja', 'inventario', 'facturas', 'devoluciones', 'ia', 'reportes'],
  ADMINISTRADOR: ['mesas', 'reservas', 'cocina', 'caja', 'inventario', 'facturas', 'devoluciones', 'ia', 'reportes', 'admin']
};

function getRoleForSession(session) {
  const roleId = session?.user?.role_id;
  return ROLES.find(role => role.id.toUpperCase() === String(roleId || '').toUpperCase()) || ROLES[0];
}

function getDefaultTabForRole(roleId) {
  switch (String(roleId || '').toUpperCase()) {
    case 'COCINA':
    case 'BARRA':
      return 'cocina';
    case 'CAJERO':
      return 'caja';
    case 'INVENTARIO':
      return 'inventario';
    default:
      return 'mesas';
  }
}

function ModuleLoader() {
  return (
    <div className="glass-panel rounded-2xl p-6 shadow-md">
      <p className="text-sm font-bold">Cargando módulo...</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">Gastroflow está preparando la vista solicitada.</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="glass-panel rounded-2xl p-6 shadow-md">
      <h2 className="font-heading font-extrabold text-xl">{title}</h2>
      <p className="text-sm text-[var(--text-muted)] mt-2">{description}</p>
    </div>
  );
}

function LoginRoute({ activeSession, sessionChecked, onLoginSuccess }) {
  if (!sessionChecked) {
    return <ModuleLoader />;
  }

  if (activeSession?.user?.role_id) {
    return <Navigate to={`/app/${getDefaultTabForRole(activeSession.user.role_id)}`} replace />;
  }

  return <LoginScreen onLoginSuccess={onLoginSuccess} />;
}

function ProtectedShell({
  activeSession,
  sessionChecked,
  isOffline,
  setIsOffline,
  activeBranch,
  setActiveBranch,
  tables,
  setTables,
  showIncidentModal,
  setShowIncidentModal,
  onLogout,
  onSeatCustomer
}) {
  const navigate = useNavigate();
  const { tab } = useParams();

  if (!sessionChecked) {
    return <ModuleLoader />;
  }

  if (!activeSession?.user?.id) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = getRoleForSession(activeSession);
  const allowedTabs = ROLE_ALLOWED_TABS[String(currentRole.id || '').toUpperCase()] || ['mesas'];
  const activeTab = tab || getDefaultTabForRole(activeSession.user.role_id);

  if (!allowedTabs.includes(activeTab)) {
    return <Navigate to={`/app/${allowedTabs[0]}`} replace />;
  }

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'reservas':
        return (
          <ReservationManager
            tables={tables}
            currentRole={currentRole}
            onSeatCustomer={onSeatCustomer}
          />
        );
      case 'facturas':
        return <InvoiceManager currentRole={currentRole} />;
      case 'mesas':
        return <SaloneroView activeSessionUser={activeSession.user} />;
      case 'cocina':
        return <CocinaView />;
      case 'caja':
        return <CajeroView />;
      case 'inventario':
        return <InventoryDashboard currentRole={currentRole} />;
      case 'devoluciones':
        return <ReturnsModal orders={[]} currentRole={currentRole} onLogAudit={() => {}} />;
      case 'ia':
        return <GastroAIAssistant orders={[]} rawIngredients={[]} currentRole={currentRole} />;
      case 'reportes':
        return <ReportsDashboard />;
      case 'admin':
        return <AdminView />;
      default:
        return <Navigate to={`/app/${allowedTabs[0]}`} replace />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col font-sans transition-colors duration-300">
      <Header
        currentRole={currentRole}
        setCurrentRole={() => {}}
        activeSessionUser={activeSession.user}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        activeBranch={activeBranch}
        setActiveBranch={setActiveBranch}
        pendingFiscalQueue={0}
        onLogout={onLogout}
      />

      <div className="flex-1 min-h-0 flex flex-col md:flex-row w-full px-2 sm:px-4">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(nextTab) => navigate(`/app/${nextTab}`)}
          currentRole={currentRole}
          isCompact={false}
          setIsCompact={() => {}}
          activeSessionUser={activeSession.user}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0 p-3 sm:p-6 overflow-y-auto w-full relative">
          <div className="mb-4 flex justify-end items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowIncidentModal(true)}
              className="ui-button-outline text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <span>Reportar incidencia</span>
            </button>
          </div>

          <React.Suspense fallback={<ModuleLoader />}>
            {renderActiveModule()}
          </React.Suspense>
        </main>
      </div>

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

function AppRoutes(props) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          props.activeSession?.user?.role_id
            ? <Navigate to={`/app/${getDefaultTabForRole(props.activeSession.user.role_id)}`} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/login"
        element={
          <LoginRoute
            activeSession={props.activeSession}
            sessionChecked={props.sessionChecked}
            onLoginSuccess={props.onLoginSuccess}
          />
        }
      />
      <Route
        path="/app/:tab"
        element={<ProtectedShell {...props} />}
      />
      <Route
        path="*"
        element={
          <EmptyState
            title="Ruta no encontrada"
            description="La vista solicitada no existe o no está disponible para este rol."
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  const [activeSession, setActiveSession] = React.useState(() => getActiveSession());
  const [sessionChecked, setSessionChecked] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(false);
  const [activeBranch, setActiveBranch] = React.useState('001');
  const [tables, setTables] = React.useState(TABLES);
  const [showIncidentModal, setShowIncidentModal] = React.useState(false);

  React.useEffect(() => {
    seedUnifiedDatabase().catch(err => console.error('Error seeding DB:', err));
    getUserPreferences('global').then(prefs => applyThemeToDOM(prefs));
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    refreshActiveSession()
      .then(session => {
        if (!cancelled) {
          setActiveSession(session);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSessionChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!activeSession?.user?.id) {
      return;
    }

    let cancelled = false;
    getUserPreferences(activeSession.user.id)
      .then(userPrefs => {
        if (!cancelled) {
          applyThemeToDOM(userPrefs);
        }
      })
      .catch(err => console.error('Error cargando preferencias del usuario:', err));

    return () => {
      cancelled = true;
    };
  }, [activeSession]);

  const handleLoginSuccess = React.useCallback((session) => {
    setActiveSession(session);
    setSessionChecked(true);
  }, []);

  const handleLogout = React.useCallback(() => {
    clearActiveSession();
    setActiveSession(null);
    getUserPreferences('global')
      .then(prefs => applyThemeToDOM(prefs))
      .catch(err => console.error('Error restaurando preferencias globales:', err));
  }, []);

  const handleSeatCustomerFromReservation = React.useCallback(async (reservation) => {
    try {
      await updateReservationStatus(reservation.id_reserva, 'sentado');
      setTables(prevTables => prevTables.map(table =>
        table.id === reservation.id_mesa ? { ...table, status: 'ocupada' } : table
      ));
    } catch (err) {
      console.error('Error sentando cliente:', err);
    }
  }, []);

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes
        activeSession={activeSession}
        sessionChecked={sessionChecked}
        onLoginSuccess={handleLoginSuccess}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        activeBranch={activeBranch}
        setActiveBranch={setActiveBranch}
        tables={tables}
        setTables={setTables}
        showIncidentModal={showIncidentModal}
        setShowIncidentModal={setShowIncidentModal}
        onLogout={handleLogout}
        onSeatCustomer={handleSeatCustomerFromReservation}
      />
    </HashRouter>
  );
}
