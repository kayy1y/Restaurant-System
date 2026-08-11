import React from 'react';
import { 
  Sun, Moon, Monitor, Palette, Layout, Type, Maximize2, 
  RotateCcw, Check, Sparkles, Eye, ShieldCheck, CheckCircle2, AlertTriangle, Layers 
} from 'lucide-react';
import { 
  THEME_PRESETS, 
  PRIMARY_COLOR_PRESETS, 
  getUserPreferences, 
  saveUserPreferences, 
  getContrastYIQ 
} from '../services/themeService.js';

export default function AppearanceSettings({ activeUser, onPrefsChange }) {
  const userId = activeUser?.id || 'global';
  const [prefs, setPrefs] = React.useState({
    theme_mode: 'light',
    selected_theme: 'lavid-clasico',
    primary_color: '#5d402b',
    sidebar_style: 'expanded',
    font_size: 'normal',
    density_mode: 'normal',
    card_style: 'clasico'
  });

  const [showResetModal, setShowResetModal] = React.useState(false);
  const [saveToast, setSaveToast] = React.useState('');

  React.useEffect(() => {
    getUserPreferences(userId).then(p => setPrefs(p));
  }, [userId]);

  const updateField = async (field, value) => {
    const updated = { ...prefs, [field]: value };
    setPrefs(updated);

    if (field === 'selected_theme') {
      const preset = THEME_PRESETS.find(p => p.id === value);
      if (preset) {
        updated.theme_mode = preset.mode;
        updated.primary_color = preset.primary_color;
      }
    }

    await saveUserPreferences(userId, updated);
    if (onPrefsChange) onPrefsChange(updated);

    setSaveToast('Preferencias de Steakhouse guardadas exitosamente.');
    setTimeout(() => setSaveToast(''), 3000);
  };

  const handleResetDefaults = async () => {
    const defaultPrefs = {
      theme_mode: 'light',
      selected_theme: 'lavid-clasico',
      primary_color: '#5d402b',
      sidebar_style: 'expanded',
      font_size: 'normal',
      density_mode: 'normal',
      card_style: 'clasico'
    };

    setPrefs(defaultPrefs);
    await saveUserPreferences(userId, defaultPrefs);
    if (onPrefsChange) onPrefsChange(defaultPrefs);
    setShowResetModal(false);

    setSaveToast('Se restauró la apariencia predeterminada de La Vid Steak House & Pizza.');
    setTimeout(() => setSaveToast(''), 3500);
  };

  const contrastText = getContrastYIQ(prefs.primary_color);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Toast Notificación */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#3d2719] text-[#fbf7f0] border border-[#a88a6d] font-bold text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {saveToast}
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] shadow-lg flex flex-wrap justify-between items-center gap-4 bg-[#faf6ee]">
        <div>
          <div className="flex items-center gap-2 text-[#735036] font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> La Vid Steak House & Pizza • La Fortuna, Costa Rica
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-[#231710] tracking-tight mt-0.5">
            Configuración de Apariencia & Temas
          </h2>
          <p className="text-xs text-[#6e5a4b] mt-1">
            Personaliza el modo claro/oscuro, densidad de pantalla y esquema de colores para la cuenta de <strong className="text-[#5d402b] font-semibold">{activeUser?.name || 'Usuario'}</strong>.
          </p>
        </div>

        <button
          onClick={() => setShowResetModal(true)}
          className="bg-[#2c1d13] hover:bg-[#3e2718] text-[#f7f2e9] border border-[#5d402b] font-bold text-xs px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 shadow-md"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Restablecer Tema por Defecto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: CONTROLES DE APARIENCIA (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. MODO DE TEMA (CLARO / OSCURO / AUTOMÁTICO) */}
          <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] space-y-4">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-[#5d402b]" />
              <h3 className="font-heading font-bold text-base text-[#231710]">Modo de Pantalla</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Modo Claro', desc: 'Fondo crema & madera clara para el día', icon: Sun },
                { id: 'dark', label: 'Modo Oscuro', desc: 'Tonos carbón & madera oscura para la noche', icon: Moon },
                { id: 'auto', label: 'Automático', desc: 'Sincronizar con el tema del dispositivo', icon: Monitor }
              ].map(mode => {
                const Icon = mode.icon;
                const isSelected = prefs.theme_mode === mode.id;

                return (
                  <button
                    key={mode.id}
                    onClick={() => updateField('theme_mode', mode.id)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isSelected 
                        ? 'bg-[#5d402b]/15 border-[#5d402b] text-[#231710] ring-2 ring-[#5d402b]/30 shadow-md font-bold' 
                        : 'bg-[#fffdf9] border-[#dac8b3] text-[#6e5a4b] hover:bg-[#f5efe6]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#5d402b]' : 'text-[#6e5a4b]'}`} />
                      {isSelected && <Check className="w-4 h-4 text-[#5d402b]" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#231710]">{mode.label}</h4>
                      <p className="text-[10px] text-[#6e5a4b] mt-0.5 leading-snug">{mode.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. TEMAS PREDEFINIDOS LA VID */}
          <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#5d402b]" />
                <h3 className="font-heading font-bold text-base text-[#231710]">Temas Predefinidos La Vid</h3>
              </div>
              <span className="text-[10px] font-bold bg-[#5d402b]/10 text-[#5d402b] border border-[#5d402b]/30 px-2.5 py-1 rounded-full">
                Cambio en 1 Clic
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_PRESETS.map(preset => {
                const isSelected = prefs.selected_theme === preset.id;

                return (
                  <button
                    key={preset.id}
                    onClick={() => updateField('selected_theme', preset.id)}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      isSelected 
                        ? 'bg-[#fffdf9] border-[#5d402b] shadow-lg ring-2 ring-[#5d402b]/30' 
                        : 'bg-[#fffdf9] border-[#dac8b3] hover:border-[#bfaea0]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-xs text-[#231710] flex items-center gap-1.5">
                          {preset.name}
                          {preset.accent_badge && (
                            <span className="bg-[#46593a]/20 text-[#2c3d22] font-extrabold text-[9px] px-1.5 py-0.2 rounded border border-[#46593a]/40">
                              {preset.accent_badge}
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-[#6e5a4b] mt-0.5 leading-snug">{preset.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#5d402b] shrink-0 ml-1" />}
                    </div>

                    {/* Muestra de Colores del Tema */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#dac8b3]">
                      <span className="w-4 h-4 rounded-full border border-stone-400 shadow-sm" style={{ backgroundColor: preset.bg_main }} title="Fondo" />
                      <span className="w-4 h-4 rounded-full border border-stone-400 shadow-sm" style={{ backgroundColor: preset.sidebar_bg }} title="Barra Lateral" />
                      <span className="w-4 h-4 rounded-full border border-stone-400 shadow-sm" style={{ backgroundColor: preset.primary_color }} title="Principal" />
                      <span className="w-4 h-4 rounded-full border border-stone-400 shadow-sm" style={{ backgroundColor: preset.secondary_color }} title="Secundario" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. PERSONALIZACIÓN DE COLOR PRINCIPAL */}
          <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#5d402b]" />
              <h3 className="font-heading font-bold text-base text-[#231710]">Color Principal del Sistema</h3>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#6e5a4b] block">Paletas Sugeridas Steakhouse:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRIMARY_COLOR_PRESETS.map(col => {
                  const isSel = prefs.primary_color.toLowerCase() === col.hex.toLowerCase();

                  return (
                    <button
                      key={col.id}
                      onClick={() => updateField('primary_color', col.hex)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                        isSel 
                          ? 'bg-[#faf6ee] border-[#5d402b] text-[#231710] ring-2 ring-[#5d402b]/30 shadow-md' 
                          : 'bg-[#fffdf9] border-[#dac8b3] text-[#6e5a4b] hover:bg-[#f5efe6]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-stone-400 shadow-sm" style={{ backgroundColor: col.hex }} />
                        <span>{col.name}</span>
                      </div>
                      {isSel && <Check className="w-3.5 h-3.5 text-[#5d402b]" />}
                    </button>
                  );
                })}
              </div>

              {/* Color Picker Personalizado */}
              <div className="pt-3 border-t border-[#dac8b3] flex items-center justify-between gap-3 text-xs">
                <label className="font-semibold text-[#231710]">Color Personalizado:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={prefs.primary_color}
                    onChange={(e) => updateField('primary_color', e.target.value)}
                    className="w-9 h-9 rounded-xl border border-[#dac8b3] bg-[#fffdf9] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[#5d402b] text-xs uppercase px-2.5 py-1 bg-[#faf6ee] border border-[#dac8b3] rounded-xl">
                    {prefs.primary_color}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. DENSIDAD DE INTERFAZ & TAMAÑO DE TEXTO */}
          <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] space-y-4">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-[#5d402b]" />
              <h3 className="font-heading font-bold text-base text-[#231710]">Densidad & Tipografía</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Densidad */}
              <div>
                <label className="text-[#6e5a4b] font-bold block mb-2">Densidad de Interfaz:</label>
                <div className="space-y-2">
                  {[
                    { id: 'comfortable', label: 'Cómodo', desc: 'Botones grandes ideales para tablets táctiles' },
                    { id: 'normal', label: 'Normal', desc: 'Configuración estándar equilibrada' },
                    { id: 'compact', label: 'Compacto', desc: 'Más datos e información por pantalla' }
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => updateField('density_mode', d.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                        prefs.density_mode === d.id 
                          ? 'bg-[#5d402b]/15 border-[#5d402b] text-[#231710] font-bold' 
                          : 'bg-[#fffdf9] border-[#dac8b3] text-[#6e5a4b] hover:bg-[#f5efe6]'
                      }`}
                    >
                      <div className="font-semibold text-xs text-[#231710]">{d.label}</div>
                      <div className="text-[10px] text-[#6e5a4b]">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tamaño del Texto */}
              <div>
                <label className="text-[#6e5a4b] font-bold block mb-2">Tamaño del Texto:</label>
                <div className="space-y-2">
                  {[
                    { id: 'small', label: 'Pequeño', desc: 'Compacto para maximizar espacio' },
                    { id: 'normal', label: 'Normal', desc: 'Tamaño estándar optimizado' },
                    { id: 'large', label: 'Grande', desc: 'Mayor legibilidad y nitidez' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => updateField('font_size', s.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                        prefs.font_size === s.id 
                          ? 'bg-[#5d402b]/15 border-[#5d402b] text-[#231710] font-bold' 
                          : 'bg-[#fffdf9] border-[#dac8b3] text-[#6e5a4b] hover:bg-[#f5efe6]'
                      }`}
                    >
                      <div className="font-semibold text-xs text-[#231710]">{s.label}</div>
                      <div className="text-[10px] text-[#6e5a4b]">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* 5. ESTILO DE BARRA LATERAL & TARJETAS */}
          <div className="glass-panel p-5 rounded-3xl border border-[#dac8b3] space-y-4">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-[#5d402b]" />
              <h3 className="font-heading font-bold text-base text-[#231710]">Estilos de Estructura</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Estilo Barra Lateral */}
              <div>
                <label className="text-[#6e5a4b] font-bold block mb-2">Barra Lateral Operativa:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateField('sidebar_style', 'expanded')}
                    className={`p-3 rounded-xl border font-bold text-xs text-center transition-all ${
                      prefs.sidebar_style === 'expanded' 
                        ? 'bg-[#5d402b]/15 border-[#5d402b] text-[#231710]' 
                        : 'bg-[#fffdf9] border-[#dac8b3] text-[#6e5a4b] hover:bg-[#f5efe6]'
                    }`}
                  >
                    Expandida (Texto + Ícono)
                  </button>
                  <button
                    onClick={() => updateField('sidebar_style', 'compact')}
                    className={`p-3 rounded-xl border font-bold text-xs text-center transition-all ${
                      prefs.sidebar_style === 'compact' 
                        ? 'bg-[#5d402b]/15 border-[#5d402b] text-[#231710]' 
                        : 'bg-[#fffdf9] border-[#dac8b3] text-[#6e5a4b] hover:bg-[#f5efe6]'
                    }`}
                  >
                    Compacta (Solo Íconos)
                  </button>
                </div>
              </div>

              {/* Estilo de Tarjetas */}
              <div>
                <label className="text-[#6e5a4b] font-bold block mb-2">Estilo de Tarjetas de Menú:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'clasico', label: 'Clásico' },
                    { id: 'moderno', label: 'Moderno' },
                    { id: 'minimalista', label: 'Minimalista' }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => updateField('card_style', c.id)}
                      className={`p-2.5 rounded-xl border font-bold text-xs text-center transition-all ${
                        prefs.card_style === c.id 
                          ? 'bg-[#5d402b]/15 border-[#5d402b] text-[#231710]' 
                          : 'bg-[#fffdf9] border-[#dac8b3] text-[#6e5a4b] hover:bg-[#f5efe6]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: PREVISUALIZACIÓN EN VIVO (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="sticky top-6 glass-panel p-5 rounded-3xl border border-[#dac8b3] space-y-4 shadow-xl bg-[#faf6ee]">
            <div className="flex items-center gap-2 border-b border-[#dac8b3] pb-3">
              <Eye className="w-5 h-5 text-[#5d402b]" />
              <h3 className="font-heading font-bold text-base text-[#231710]">Previsualización en Vivo</h3>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Ejemplo de Botón Principal */}
              <div>
                <span className="text-[10px] font-bold text-[#6e5a4b] uppercase tracking-wider block mb-1.5">Botón Accionable:</span>
                <button
                  style={{ backgroundColor: prefs.primary_color, color: contrastText }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Confirmar Pedido en Cocina
                </button>
              </div>

              {/* Ejemplo de Tarjeta de Platillo */}
              <div>
                <span className="text-[10px] font-bold text-[#6e5a4b] uppercase tracking-wider block mb-1.5">Tarjeta de Platillo:</span>
                <div className="bg-[#fffdf9] p-3.5 rounded-2xl border border-[#dac8b3] space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-[#231710]">Rib Eye Angus 350g</h4>
                    <span className="font-mono font-extrabold text-[#5d402b] text-xs">₡14,500</span>
                  </div>
                  <p className="text-[11px] text-[#6e5a4b] line-clamp-2">Corte marmoleado premium a la parrilla de carbón en La Fortuna.</p>
                  <div className="pt-2 border-t border-[#dac8b3] flex justify-between items-center text-[10px]">
                    <span className="bg-[#46593a]/20 text-[#23351a] px-2 py-0.5 rounded font-bold">GF Libre de Gluten</span>
                    <span className="text-[#6e5a4b] font-mono">Parrilla</span>
                  </div>
                </div>
              </div>

              {/* Ejemplo de Tabla y Estados de Mesa */}
              <div>
                <span className="text-[10px] font-bold text-[#6e5a4b] uppercase tracking-wider block mb-1.5">Estado de Mesas (Accesible):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#46593a]/20 border border-[#46593a]/50 text-[#1f2d17] text-center">
                    <span className="font-bold block text-xs">Mesa 1</span>
                    <span className="text-[9px] font-mono font-extrabold uppercase bg-[#46593a] text-white px-1.5 py-0.2 rounded mt-1 inline-block">
                      DISPONIBLE
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#735036]/20 border border-[#735036]/50 text-[#362214] text-center">
                    <span className="font-bold block text-xs">Mesa 3</span>
                    <span className="text-[9px] font-mono font-extrabold uppercase bg-[#735036] text-white px-1.5 py-0.2 rounded mt-1 inline-block">
                      OCUPADA
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#b8860b]/20 border border-[#b8860b]/50 text-[#402e03] text-center">
                    <span className="font-bold block text-xs">Mesa 4</span>
                    <span className="text-[9px] font-mono font-extrabold uppercase bg-[#b8860b] text-white px-1.5 py-0.2 rounded mt-1 inline-block">
                      ESPERANDO
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#802319]/20 border border-[#802319]/50 text-[#4a110a] text-center">
                    <span className="font-bold block text-xs">Mesa 5</span>
                    <span className="text-[9px] font-mono font-extrabold uppercase bg-[#802319] text-white px-1.5 py-0.2 rounded mt-1 inline-block">
                      EN COBRO
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumen del Tema Activo */}
              <div className="bg-[#faf6ee] p-3 rounded-2xl border border-[#dac8b3] text-[11px] space-y-1 text-[#6e5a4b]">
                <p><strong className="text-[#231710]">Tema Activo:</strong> {THEME_PRESETS.find(p => p.id === prefs.selected_theme)?.name}</p>
                <p><strong className="text-[#231710]">Modo:</strong> {prefs.theme_mode.toUpperCase()}</p>
                <p><strong className="text-[#231710]">Color Primario:</strong> <span className="font-mono text-[#5d402b]">{prefs.primary_color}</span></p>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE CONFIRMACIÓN: RESTABLECER TEMA */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-[#dac8b3] w-full max-w-md rounded-3xl p-6 space-y-4 text-center shadow-2xl animate-in fade-in zoom-in-95 bg-[#faf6ee]">
            <div className="w-12 h-12 rounded-2xl bg-[#5d402b]/15 border border-[#5d402b]/30 text-[#5d402b] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#231710]">Restablecer Apariencia Predeterminada</h3>
              <p className="text-xs text-[#6e5a4b] mt-1 leading-relaxed">
                ¿Desea restaurar la apariencia predeterminada de <strong className="text-[#5d402b]">La Vid Steak House & Pizza</strong>?
              </p>
            </div>
            <div className="bg-[#fffdf9] p-3 rounded-2xl border border-[#dac8b3] text-xs text-left text-[#231710] space-y-1 font-mono">
              <p>• Tema: La Vid Clásico</p>
              <p>• Modo: Claro</p>
              <p>• Color Principal: Café Madera (#5d402b)</p>
              <p>• Colores: Beige crema cálido & madera noble</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 bg-[#f5efe6] hover:bg-[#e2d7c5] text-[#231710] font-bold text-xs rounded-xl border border-[#dac8b3]"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetDefaults}
                className="flex-1 py-2.5 bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] font-black text-xs rounded-xl shadow-lg"
              >
                Restablecer Ahora
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
