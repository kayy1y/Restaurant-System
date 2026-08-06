import React from 'react';
import { 
  FileText, Download, Printer, Mail, Code, CheckCircle2, 
  Search, ExternalLink, QrCode, Sparkles, AlertCircle 
} from 'lucide-react';
import { generateXMLFiscalCR } from '../utils/fiscalCR';
import { RESTAURANT_INFO } from '../data/mockData';

export default function InvoiceManager({ invoices, currentRole }) {
  const [selectedInvoice, setSelectedInvoice] = React.useState(null);
  const [xmlModalInvoice, setXmlModalInvoice] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredInvoices = invoices.filter(inv => 
    inv.clave.includes(searchTerm) || 
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.consecutivo.includes(searchTerm)
  );

  const handlePrintPDF = (inv) => {
    setSelectedInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls & Search */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/30 text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-100">Histórico de Comprobantes Fiscales (CR v4.3)</h2>
            <p className="text-xs text-slate-400">Facturas, Tiquetes y Notas de Crédito emitidos</p>
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por clave, consecutivo o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Consecutivo</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Cliente / Receptor</th>
                <th className="py-3 px-3">Fecha & Hora</th>
                <th className="py-3 px-3">Método Pago</th>
                <th className="py-3 px-3">Total Fiscal</th>
                <th className="py-3 px-3">Estado Hacienda</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredInvoices.map(inv => (
                <tr key={inv.clave} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-amber-300">
                    {inv.consecutivo}
                    <p className="text-[9px] text-slate-500 font-mono truncate max-w-[140px]" title={inv.clave}>
                      Clave: {inv.clave.slice(0, 16)}...
                    </p>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-sans font-semibold">{inv.type}</td>
                  <td className="py-3 px-3 font-sans">
                    <p className="font-bold text-slate-200">{inv.customerName}</p>
                    <p className="text-[10px] text-slate-400">{inv.customerId}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-sans">{new Date(inv.date).toLocaleString('es-CR')}</td>
                  <td className="py-3 px-3 text-slate-300 font-sans">{inv.paymentMethod}</td>
                  <td className="py-3 px-3 font-extrabold text-amber-400">₡{inv.total.toLocaleString()}</td>
                  <td className="py-3 px-3 font-sans">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                      <CheckCircle2 className="w-3 h-3" /> {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handlePrintPDF(inv)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1"
                        title="Imprimir / PDF"
                      >
                        <Printer className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button
                        onClick={() => setXmlModalInvoice(inv)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1"
                        title="Ver XML v4.3"
                      >
                        <Code className="w-3.5 h-3.5 text-indigo-400" /> XML
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* XML Inspection Modal */}
      {xmlModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-700 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                XML Estructurado Costa Rica v4.3 - Clave {xmlModalInvoice.clave.slice(0, 20)}...
              </h3>
              <button onClick={() => setXmlModalInvoice(null)} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                ✕
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[400px] border border-slate-800">
              {generateXMLFiscalCR(xmlModalInvoice, RESTAURANT_INFO)}
            </pre>
          </div>
        </div>
      )}

      {/* Hidden Printable Invoice Element for Print Engine */}
      {selectedInvoice && (
        <div id="printable-invoice" className="hidden">
          <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{RESTAURANT_INFO.legalName}</h2>
            <p style={{ fontSize: '12px' }}>Cédula Jurídica: {RESTAURANT_INFO.idNumber}</p>
            <p style={{ fontSize: '12px' }}>{RESTAURANT_INFO.address}</p>
            <hr style={{ margin: '10px 0' }} />
            <h3>COMPROBANTE FISCAL v4.3</h3>
            <p><strong>Clave:</strong> {selectedInvoice.clave}</p>
            <p><strong>Consecutivo:</strong> {selectedInvoice.consecutivo}</p>
            <p><strong>Cliente:</strong> {selectedInvoice.customerName} ({selectedInvoice.customerId})</p>
            <p><strong>Fecha:</strong> {new Date(selectedInvoice.date).toLocaleString('es-CR')}</p>
            <hr style={{ margin: '10px 0' }} />
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid black' }}>
                  <th style={{ textAlign: 'left' }}>Item</th>
                  <th style={{ textAlign: 'center' }}>Cant</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items?.map(i => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td style={{ textAlign: 'center' }}>{i.quantity}</td>
                    <td style={{ textAlign: 'right' }}>₡{(i.price * i.quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr style={{ margin: '10px 0' }} />
            <p><strong>Subtotal:</strong> ₡{selectedInvoice.subtotal.toLocaleString()}</p>
            <p><strong>IVA 13%:</strong> ₡{selectedInvoice.ivaTax.toLocaleString()}</p>
            <p><strong>Servicio 10%:</strong> ₡{selectedInvoice.serviceTax.toLocaleString()}</p>
            <h3 style={{ fontSize: '18px' }}>TOTAL: ₡{selectedInvoice.total.toLocaleString()}</h3>
            <p style={{ fontSize: '10px', marginTop: '20px' }}>Autorizado mediante resolución DGT-R-033-2019 de la Dirección General de Tributación.</p>
          </div>
        </div>
      )}
    </div>
  );
}
