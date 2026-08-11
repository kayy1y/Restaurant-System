import React from 'react';
import { 
  FileText, Download, Printer, Mail, Code, CheckCircle2, 
  Search, ExternalLink, QrCode, Sparkles, AlertCircle 
} from 'lucide-react';
import { generateXMLFiscalCR } from '../utils/fiscalCR';
import { RESTAURANT_INFO } from '../data/mockData';

export default function InvoiceManager({ invoices = [], currentRole }) {
  const [selectedInvoice, setSelectedInvoice] = React.useState(null);
  const [xmlModalInvoice, setXmlModalInvoice] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredInvoices = invoices.filter(inv => 
    (inv.clave && inv.clave.includes(searchTerm)) || 
    (inv.customerName && inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (inv.consecutivo && inv.consecutivo.includes(searchTerm))
  );

  const handlePrintPDF = (inv) => {
    setSelectedInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6 text-[#1f1209]">
      {/* Header Controls & Search */}
      <div className="glass-panel p-4 rounded-3xl border border-[#dac8b3] bg-[#faf6ee] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#5d402b]/15 p-2.5 rounded-2xl border border-[#5d402b]/30 text-[#5d402b]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-base text-[#1f1209]">Histórico de Comprobantes Fiscales (CR v4.3)</h2>
            <p className="text-xs text-[#3d2717] font-semibold">Facturas Electrónicas, Tiquetes y Comprobantes de La Vid</p>
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#3d2717] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por clave, consecutivo o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1f1209] font-bold focus:outline-none focus:border-[#5d402b]"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="glass-panel rounded-3xl border border-[#dac8b3] bg-[#faf6ee] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2c1d13] text-[#f7f2e9] text-xs font-mono font-bold uppercase tracking-wider">
                <th className="p-3.5">Tipo / Consecutivo</th>
                <th className="p-3.5">Clave Numérica (50 dígitos)</th>
                <th className="p-3.5">Cliente / Ced.</th>
                <th className="p-3.5 text-right">Monto Total</th>
                <th className="p-3.5 text-center">Estado Hacienda</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dac8b3] text-xs font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#3d2717] font-bold">
                    No hay comprobantes fiscales emitidos registrados aún
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f5efe6] transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-[#1f1209]">{inv.tipo}</div>
                      <div className="font-mono text-[10px] text-[#3d2717]">{inv.consecutivo}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-[#3d2717] max-w-[200px] truncate" title={inv.clave}>
                      {inv.clave}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#1f1209]">{inv.customerName}</div>
                      <div className="text-[10px] text-[#3d2717] font-mono">{inv.customerCard || 'Consumidor Final'}</div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-[#5d402b] text-sm">
                      ₡{inv.total.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="bg-[#46593a]/20 text-[#23351a] border border-[#46593a]/40 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#46593a]" /> ACEPTADO
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handlePrintPDF(inv)}
                          className="p-1.5 rounded-lg bg-[#fffdf9] border border-[#dac8b3] text-[#231710] hover:bg-[#f5efe6]"
                          title="Imprimir PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setXmlModalInvoice(inv)}
                          className="p-1.5 rounded-lg bg-[#fffdf9] border border-[#dac8b3] text-[#231710] hover:bg-[#f5efe6]"
                          title="Ver XML Firmado"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
