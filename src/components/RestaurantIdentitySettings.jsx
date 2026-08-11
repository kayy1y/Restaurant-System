import React from 'react';
import { Store, MapPin, Phone, MessageSquare, Globe, FileText, Image, Save, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { getRestaurantIdentity, saveRestaurantIdentity } from '../services/themeService.js';

export default function RestaurantIdentitySettings({ currentRole }) {
  const [identity, setIdentity] = React.useState({
    name: 'La Vid Steak House & Pizza',
    slogan: 'Cortes Premium, Pasta & Pizza Artesanal a la Leña',
    address: 'La Fortuna, San Carlos, Alajuela, Costa Rica',
    phone: '+506 2479-1000',
    whatsapp: '+506 8888-9999',
    social_media: '@lavidsteakhouse.cr',
    invoice_notes: '¡Gracias por visitarnos en La Fortuna! Propina voluntaria incluida del 10%.',
    logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=150&q=80',
    cover_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  });

  const [toastMsg, setToastMsg] = React.useState('');
  const [errorMsg, setErrorMsg] = React.message || React.useState('');

  React.useEffect(() => {
    getRestaurantIdentity().then(data => setIdentity(data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentRole?.id !== 'ADMINISTRADOR') {
      alert('Solo un Administrador General puede modificar la identidad comercial del restaurante.');
      return;
    }

    try {
      await saveRestaurantIdentity(identity);
      setToastMsg('¡Identidad comercial de La Vid Steak House & Pizza actualizada correctamente!');
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      alert('Error guardando identidad del restaurante: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Toast Notificación */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      {/* Header Identidad */}
      <div className="glass-panel p-5 rounded-3xl border border-amber-900/30 shadow-lg flex flex-wrap justify-between items-center gap-4 bg-gradient-to-r from-amber-950/40 via-stone-900/40 to-emerald-950/30">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
            <Store className="w-4 h-4" /> Configuración Comercial del Establecimiento
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-stone-100 tracking-tight mt-0.5">
            Identidad de La Vid Steak House & Pizza
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Ubicación: <strong className="text-amber-300">La Fortuna, Costa Rica</strong>. Esta información aparece en facturas electrónicas v4.3, cabecera y comprobantes de venta.
          </p>
        </div>
      </div>

      {/* Formulario de Configuración de Identidad */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl border border-stone-800 space-y-5 text-xs">
        
        {/* Imagen de Portada y Logo */}
        <div className="space-y-3">
          <label className="font-heading font-bold text-stone-200 text-sm block">Visualización de Marca:</label>
          <div className="relative h-36 rounded-2xl overflow-hidden border border-stone-800 bg-stone-950">
            <img 
              src={identity.cover_url} 
              alt="Portada Restaurante" 
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent flex items-end p-4 gap-3">
              <img 
                src={identity.logo_url} 
                alt="Logo La Vid" 
                className="w-16 h-16 rounded-2xl border-2 border-amber-500 shadow-xl object-cover bg-stone-900"
              />
              <div>
                <h3 className="font-heading font-extrabold text-base text-stone-100">{identity.name}</h3>
                <p className="text-xs text-amber-400 font-medium">{identity.slogan}</p>
                <p className="text-[10px] text-stone-400 font-mono mt-0.5">{identity.address}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-400" /> Nombre Comercial del Restaurante *
            </label>
            <input
              type="text"
              value={identity.name}
              onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-100 font-bold text-xs"
              required
            />
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Eslogan o Subtítulo
            </label>
            <input
              type="text"
              value={identity.slogan}
              onChange={(e) => setIdentity({ ...identity, slogan: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-amber-400 font-semibold text-xs"
            />
          </div>
        </div>

        <div>
          <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> Dirección Física Completa *
          </label>
          <input
            type="text"
            value={identity.address}
            onChange={(e) => setIdentity({ ...identity, address: e.target.value })}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 text-xs"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" /> Teléfono Fijo
            </label>
            <input
              type="text"
              value={identity.phone}
              onChange={(e) => setIdentity({ ...identity, phone: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Restaurante
            </label>
            <input
              type="text"
              value={identity.whatsapp}
              onChange={(e) => setIdentity({ ...identity, whatsapp: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-emerald-300 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" /> Redes Sociales (@)
            </label>
            <input
              type="text"
              value={identity.social_media}
              onChange={(e) => setIdentity({ ...identity, social_media: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-amber-400" /> URL del Logo (Imagen PNG/JPG)
            </label>
            <input
              type="url"
              value={identity.logo_url}
              onChange={(e) => setIdentity({ ...identity, logo_url: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-300 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-amber-400" /> URL de Imagen de Portada
            </label>
            <input
              type="url"
              value={identity.cover_url}
              onChange={(e) => setIdentity({ ...identity, cover_url: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-300 font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label className="text-stone-300 font-bold block mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" /> Nota de Pie de Página en Factura Electrónica
          </label>
          <textarea
            rows={2}
            value={identity.invoice_notes}
            onChange={(e) => setIdentity({ ...identity, invoice_notes: e.target.value })}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 text-xs"
          />
        </div>

        <div className="pt-4 border-t border-stone-800 flex justify-end">
          <button
            type="submit"
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar Identidad Comercial
          </button>
        </div>

      </form>
    </div>
  );
}
