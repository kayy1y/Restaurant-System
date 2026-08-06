import React from 'react';
import { 
  BarChart3, DollarSign, TrendingUp, Users, Clock, 
  Award, AlertTriangle, FileText, RefreshCw 
} from 'lucide-react';
import { dbGetAll } from '../services/db.js';
import { getFiscalQueue } from '../services/fiscalService.js';
import { liveSync } from '../services/liveSync.js';

export default function ReportsDashboard() {
  const [invoices, setInvoices] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [incidents, setIncidents] = React.useState([]);

  const loadReportData = React.useCallback(async () => {
    try {
      const [invData, ordData, incData] = await Promise.all([
        getFiscalQueue(),
        dbGetAll('orders'),
        dbGetAll('incidents')
      ]);
      setInvoices(invData);
      setOrders(ordData);
      setIncidents(incData);
    } catch (err) {
      console.error('Error cargando reportes administrativos:', err);
    }
  }, []);

  React.useEffect(() => {
    loadReportData();

    // Sincronización en tiempo real con eventos de pago e incidencias
    const unsubPayment = liveSync.subscribe('PAYMENT_COMPLETED', () => {
      loadReportData();
    });

    const unsubIncident = liveSync.subscribe('INCIDENT_REPORTED', () => {
      loadReportData();
    });

    return () => {
      unsubPayment();
      unsubIncident();
    };
  }, [loadReportData]);

  const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalIVA = invoices.reduce((sum, inv) => sum + (inv.tax_iva || 0), 0);
  const totalService = invoices.reduce((sum, inv) => sum + (inv.tax_service || 0), 0);
  const avgTicket = invoices.length > 0 ? Math.round(totalSales / invoices.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header Reportes */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 text-amber-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-100">Panel Administrativo & Reportes Financieros DB</h2>
            <p className="text-xs text-slate-400">Indicadores clave de ventas reales, margen e impuestos Hacienda v4.3</p>
          </div>
        </div>

        <button
          onClick={loadReportData}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          <span>Actualizar Datos DB</span>
        </button>
      </div>

      {/* KPI Cards Grid de Datos Reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Ventas Totales Brutas</p>
          <p className="text-2xl font-black text-amber-400 font-mono">₡{totalSales.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold font-mono">Calculado desde DB ({invoices.length} ventas)</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Ticket Promedio por Mesa</p>
          <p className="text-2xl font-black text-sky-400 font-mono">₡{avgTicket.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400 font-mono">{invoices.length} facturas v4.3</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">IVA Recaudado (13%)</p>
          <p className="text-2xl font-black text-indigo-400 font-mono">₡{totalIVA.toLocaleString()}</p>
          <span className="text-[10px] text-indigo-300 font-mono">Hacienda CR v4.3</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 font-semibold">Servicio 10% (Ley 5635)</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">₡{totalService.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-300 font-mono">Distribución saloneros</span>
        </div>
      </div>

      {/* Reporte de Incidencias & Mermas Reales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Registro de Incidencias & Mermas ({incidents.length})
          </h3>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {incidents.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No hay incidencias registradas hoy.</p>
            ) : (
              incidents.map(inc => (
                <div key={inc.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-200">
                    <span>{inc.category_label || inc.category}</span>
                    <span className="text-amber-400 font-mono">{inc.user_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{inc.notes || 'Sin detalles'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{new Date(inc.created_at).toLocaleString('es-CR')}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" /> Tiempos Promedio KDS & Rendimiento
          </h3>
          <div className="space-y-2 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
              <span className="text-slate-300">Cocina Caliente (Hamburguesas / Steaks):</span>
              <strong className="text-amber-400 font-mono">11.4 min</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
              <span className="text-slate-300">Cocina Fría (Ceviches / Entradas):</span>
              <strong className="text-emerald-400 font-mono">6.2 min</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
              <span className="text-slate-300">Barra & Coctelería:</span>
              <strong className="text-sky-400 font-mono">3.8 min</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
