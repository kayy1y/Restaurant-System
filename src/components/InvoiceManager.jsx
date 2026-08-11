import React from 'react';
import { 
  FileText, Printer, Code, CheckCircle2, Search, X, Download, RefreshCw, AlertCircle
} from 'lucide-react';
import { getFiscalQueue } from '../services/fiscalService.js';
import { RESTAURANT_INFO } from '../data/mockData.js';
import { liveSync } from '../services/liveSync.js';
import { 
  getIntegrationRecordByInvoiceId, 
  retryInvoiceIntegration 
} from '../services/invoiceIntegrationService.js';

export default function InvoiceManager({ currentRole }) {
  const [invoices, setInvoices] = React.useState([]);
  const [selectedInvoice, setSelectedInvoice] = React.useState(null);
  const [selectedIntegration, setSelectedIntegration] = React.useState(null);
  const [jsonPayloadModal, setJsonPayloadModal] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isRetrying, setIsRetrying] = React.useState(false);

  const loadInvoices = React.useCallback(async () => {
    try {
      const queue = await getFiscalQueue();
      setInvoices(queue);
    } catch (e) {
      console.error('Error cargando facturas:', e);
    }
  }, []);

  React.useEffect(() => {
    loadInvoices();

    let unsub1 = () => {};
    let unsub2 = () => {};
    let unsub3 = () => {};

    try {
      if (liveSync && typeof liveSync.subscribe === 'function') {
        unsub1 = liveSync.subscribe('FISCAL_UPDATED', () => loadInvoices());
        unsub2 = liveSync.subscribe('PAYMENT_COMPLETED', () => loadInvoices());
        unsub3 = liveSync.subscribe('INVOICE_INTEGRATION_UPDATED', async (record) => {
          if (selectedInvoice && (selectedInvoice.id === record.invoice_id || selectedInvoice.consecutivo === record.invoice_number)) {
            setSelectedIntegration(record);
          }
          loadInvoices();
        });
      }
    } catch (err) {
      console.error('Error suscribiendo a eventos liveSync:', err);
    }

    return () => {
      if (typeof unsub1 === 'function') unsub1();
      if (typeof unsub2 === 'function') unsub2();
      if (typeof unsub3 === 'function') unsub3();
    };
  }, [loadInvoices, selectedInvoice]);

  const handleOpenInvoiceModal = async (inv) => {
    setSelectedInvoice(inv);
    try {
      const record = await getIntegrationRecordByInvoiceId(inv.id || inv.consecutivo);
      setSelectedIntegration(record || null);
    } catch (err) {
      setSelectedIntegration(null);
    }
  };

  const handleRetryIntegration = async (invoiceId) => {
    setIsRetrying(true);
    try {
      const updated = await retryInvoiceIntegration(invoiceId);
      setSelectedIntegration(updated);
      alert(`Reintento de envío procesado: Estado ${updated.status} (Código: ${updated.response_code || '200'})`);
    } catch (err) {
      alert('Error en reintento: ' + err.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownloadJSON = (payload, filename) => {
    try {
      const jsonString = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'factura_payload.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error descargando JSON: ' + err.message);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    (inv.clave && inv.clave.includes(searchTerm)) || 
    (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (inv.consecutivo && inv.consecutivo.includes(searchTerm)) ||
    (inv.order_id && inv.order_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (inv.table_name && inv.table_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePrintPDF = (inv) => {
    handleOpenInvoiceModal(inv);
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
            <h2 className="font-heading font-extrabold text-base text-[#1f1209]">Histórico de Facturas & Comprobantes Fiscales</h2>
            <p className="text-xs text-[#3d2717] font-semibold">Registro inmutable de facturas e integración API externa v4.3</p>
          </div>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-[#3d2717] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por clave, consecutivo, cliente o mesa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#fffdf9] border border-[#dac8b3] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1f1209] font-bold focus:outline-none focus:border-[#5d402b] placeholder-[#3d2717]/60"
          />
        </div>
      </div>

      {/* Tabla Principal de Facturas */}
      <div className="glass-panel rounded-3xl border border-[#dac8b3] bg-[#faf6ee] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2c1d13] text-[#f7f2e9] text-xs font-mono font-bold uppercase tracking-wider">
                <th className="p-3.5">Consecutivo / Fecha</th>
                <th className="p-3.5">Clave Fiscal (50 dígitos)</th>
                <th className="p-3.5">Cliente / Datos</th>
                <th className="p-3.5">Método Pago</th>
                <th className="p-3.5 text-right">Monto Total</th>
                <th className="p-3.5 text-center">Estado Hacienda</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dac8b3] text-xs font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#3d2717] font-bold">
                    No se han registrado facturas emitidas en el sistema aún.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f5efe6] transition-colors cursor-pointer" onClick={() => handleOpenInvoiceModal(inv)}>
                    <td className="p-3.5">
                      <div className="font-bold text-[#1f1209]">{inv.consecutivo}</div>
                      <div className="font-mono text-[10px] text-[#3d2717]">
                        {new Date(inv.created_at).toLocaleString('es-CR')}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-[#3d2717] max-w-[180px] truncate" title={inv.clave}>
                      {inv.clave}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#1f1209]">{inv.customer_name || inv.customerName || 'Consumidor Final'}</div>
                      <div className="text-[10px] text-[#3d2717] font-mono">
                        Mesa: {inv.table_name || 'N/A'} • Pedido: {inv.order_id}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-xs font-bold text-[#5d402b]">
                      {inv.payment_method || inv.paymentMethod || 'Efectivo'}
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-[#5d402b] text-sm">
                      ₡{(inv.total || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="bg-[#46593a]/20 text-[#1f2d17] border border-[#46593a]/40 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#46593a]" /> ACEPTADO
                      </span>
                    </td>
                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenInvoiceModal(inv)}
                          className="px-2 py-1 rounded-lg bg-[#5d402b] text-[#fffdf9] font-bold text-[11px] hover:bg-[#483120]"
                          title="Ver detalle de factura e integración API"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => handlePrintPDF(inv)}
                          className="p-1.5 rounded-lg bg-[#fffdf9] border border-[#dac8b3] text-[#231710] hover:bg-[#f5efe6]"
                          title="Imprimir Factura PDF"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#5d402b]" />
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

      {/* MODAL DETALLE COMPLETO DE FACTURA IMPRIMIBLE E INTEGRACIÓN API */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] text-[#1f1209] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl space-y-4 max-h-[92vh] flex flex-col justify-between">
            
            {/* Modal Actions Bar Header */}
            <div className="bg-[#2c1d13] text-[#f7f2e9] border-b border-[#422c1d] p-4 flex justify-between items-center no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#d8c4a7]" />
                <h3 className="font-heading font-extrabold text-base text-[#f7f2e9]">Comprobante Fiscal - {selectedInvoice.consecutivo}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#3e2718]"
                >
                  <Printer className="w-4 h-4" /> Imprimir Factura
                </button>
                <button
                  onClick={() => { setSelectedInvoice(null); setSelectedIntegration(null); }}
                  className="p-1.5 bg-[#1f140d] text-[#c4b1a1] hover:text-[#f7f2e9] rounded-xl border border-[#4a3324]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SECCIÓN IMPRIMIBLE LIMPIA (id="printable-invoice") */}
            <div id="printable-invoice" className="p-6 space-y-5 bg-[#fffdf9] text-[#1f1209] overflow-y-auto flex-1 font-serif">
              
              {/* ENCABEZADO DEL RESTAURANTE */}
              <div className="text-center border-b border-[#dac8b3] pb-4 space-y-1">
                <h2 className="text-xl font-extrabold font-heading text-[#1f1209] uppercase tracking-wide">
                  {RESTAURANT_INFO.name || 'La Vid Steak House & Pizza'}
                </h2>
                <p className="text-xs text-[#3d2717] font-semibold">{RESTAURANT_INFO.legalName || 'La Vid Steak House & Pizza S.A.'}</p>
                <p className="text-xs text-[#3d2717] font-mono">Cédula Jurídica: {RESTAURANT_INFO.idNumber || '3-101-889922'}</p>
                <p className="text-xs text-[#3d2717]">{RESTAURANT_INFO.address || 'La Fortuna, San Carlos, Alajuela, Costa Rica'}</p>
                <p className="text-xs text-[#3d2717]">Tel: +506 2479-9988 • Email: info@lavidsteakhouse.cr</p>
                <div className="pt-2">
                  <span className="bg-[#5d402b]/10 text-[#5d402b] border border-[#5d402b]/30 text-[11px] font-mono font-extrabold px-3 py-1 rounded-full inline-block">
                    FACTURA ELECTRÓNICA DE VENTA v4.3
                  </span>
                </div>
              </div>

              {/* DATOS DE LA FACTURA & CLIENTE */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-[#dac8b3] pb-4 bg-[#faf6ee] p-3 rounded-2xl">
                <div>
                  <p><strong className="font-sans font-bold">Nº Factura:</strong> {selectedInvoice.consecutivo}</p>
                  <p><strong className="font-sans font-bold">Clave Fiscal:</strong> <span className="text-[10px] break-all">{selectedInvoice.clave}</span></p>
                  <p><strong className="font-sans font-bold">Fecha / Hora:</strong> {new Date(selectedInvoice.created_at).toLocaleString('es-CR')}</p>
                  <p><strong className="font-sans font-bold">Método Pago:</strong> {selectedInvoice.payment_method || selectedInvoice.paymentMethod || 'Efectivo'}</p>
                </div>
                <div>
                  <p><strong className="font-sans font-bold">Pedido Nº:</strong> {selectedInvoice.order_id}</p>
                  <p><strong className="font-sans font-bold">Mesa:</strong> {selectedInvoice.table_name || 'N/A'}</p>
                  <p><strong className="font-sans font-bold">Cajero(a):</strong> {selectedInvoice.cashier_name || 'Ana Cajera'}</p>
                  <p><strong className="font-sans font-bold">Cliente:</strong> {selectedInvoice.customer_name || selectedInvoice.customerName || 'Consumidor Final'}</p>
                </div>
              </div>

              {/* TABLA DETALLE DE PRODUCTOS HISTÓRICOS */}
              <div>
                <h4 className="text-xs font-extrabold font-mono text-[#5d402b] uppercase mb-2">Detalle de Platillos</h4>
                <table className="w-full text-left text-xs border-collapse font-serif">
                  <thead>
                    <tr className="border-b-2 border-[#5d402b] text-[#1f1209] font-bold">
                      <th className="py-2">Producto</th>
                      <th className="py-2 text-center">Cant.</th>
                      <th className="py-2 text-right">Precio Unit.</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dac8b3]">
                    {((selectedInvoice.items_snapshot && selectedInvoice.items_snapshot.length > 0) 
                      ? selectedInvoice.items_snapshot 
                      : (selectedInvoice.items || [])
                    ).map((item, idx) => (
                      <tr key={idx} className="py-2">
                        <td className="py-2">
                          <p className="font-bold text-[#1f1209]">{item.product_name || item.name}</p>
                          {item.notes && <p className="text-[10px] text-[#5d402b] font-mono italic">Observación: {item.notes}</p>}
                        </td>
                        <td className="py-2 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="py-2 text-right font-mono">₡{(item.unit_price || item.price || 0).toLocaleString()}</td>
                        <td className="py-2 text-right font-mono font-extrabold text-[#5d402b]">
                          ₡{(item.item_total || (item.unit_price * item.quantity) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* RESUMEN FINANCIERO & MONTO PAGADO */}
              <div className="pt-3 border-t-2 border-[#5d402b] space-y-1.5 text-xs font-mono max-w-xs ml-auto">
                <div className="flex justify-between text-[#3d2717]">
                  <span>Subtotal Gravado:</span>
                  <span>₡{(selectedInvoice.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#3d2717]">
                  <span>IVA (13%):</span>
                  <span>₡{(selectedInvoice.tax_iva || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#3d2717]">
                  <span>Servicio (10%):</span>
                  <span>₡{(selectedInvoice.tax_service || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#1f1209] pt-1.5 border-t border-[#dac8b3]">
                  <span>TOTAL COMPROBANTE:</span>
                  <span className="text-[#5d402b]">₡{(selectedInvoice.total || 0).toLocaleString()}</span>
                </div>
                {selectedInvoice.amount_paid > 0 && (
                  <>
                    <div className="flex justify-between text-[#3d2717] pt-1">
                      <span>Monto Entregado:</span>
                      <span>₡{(selectedInvoice.amount_paid || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#1f2d17] font-bold">
                      <span>Cambio / Vuelto:</span>
                      <span>₡{(selectedInvoice.change_given || 0).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* PIE DE FACTURA */}
              <div className="text-center pt-4 border-t border-[#dac8b3] text-[10px] text-[#3d2717] space-y-1 font-sans">
                <p className="font-bold text-[#1f1209]">¡Gracias por visitar La Vid Steak House & Pizza en La Fortuna!</p>
                <p>Emitido conforme a la resolución de Facturación Electrónica v4.3 del Ministerio de Hacienda de Costa Rica.</p>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
