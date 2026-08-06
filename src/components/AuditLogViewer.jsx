import React from 'react';
import { ShieldAlert, Search, Lock, User, Clock, HardDrive } from 'lucide-react';

export default function AuditLogViewer({ auditLogs }) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredLogs = auditLogs.filter(log =>
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-100">Bitácora Inmutable de Auditoría & Trazabilidad</h2>
            <p className="text-xs text-slate-400">Registro inalterable de todas las operaciones y cambios de permisos</p>
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar auditoría por usuario o acción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Fecha & Hora</th>
                <th className="py-3 px-3">Usuario</th>
                <th className="py-3 px-3">Rol</th>
                <th className="py-3 px-3">Acción Registrada</th>
                <th className="py-3 px-3">Dispositivo / Terminal</th>
                <th className="py-3 px-3">Detalles & Trazabilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-3 px-3 text-slate-400 font-sans">{new Date(log.timestamp).toLocaleString('es-CR')}</td>
                  <td className="py-3 px-3 font-bold text-slate-200 font-sans">{log.user}</td>
                  <td className="py-3 px-3">
                    <span className="bg-slate-800 text-amber-300 border border-slate-700 text-[10px] font-sans font-bold px-2 py-0.5 rounded-md">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-amber-400">{log.action}</td>
                  <td className="py-3 px-3 text-slate-400 font-sans">{log.device || 'POS Terminal 01'}</td>
                  <td className="py-3 px-3 text-slate-300 font-sans max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
