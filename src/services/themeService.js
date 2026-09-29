/**
 * Servicio de Gestión de Temas, Apariencia e Identidad del Restaurante
 * Temas operativos para una interfaz de restaurante empresarial.
 */

import { dbGet, dbPut } from './db.js';

export const DEFAULT_RESTAURANT_IDENTITY = {
  id: 'la_vid_identity',
  name: 'La Vid Steak House & Pizza',
  slogan: 'Cortes Premium, Pasta & Pizza Artesanal a la Leña',
  address: 'La Fortuna, San Carlos, Alajuela, Costa Rica',
  phone: '+506 2479-1000',
  whatsapp: '+506 8888-9999',
  social_media: '@lavidsteakhouse.cr',
  invoice_notes: '¡Gracias por visitarnos en La Fortuna! Propina voluntaria incluida del 10%.',
  logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=150&q=80',
  cover_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
};

export const THEME_PRESETS = [
  {
    id: 'la-vid-elegante', name: 'La Vid Elegante', desc: 'Marfil, madera y texto de alto contraste', mode: 'light',
    primary_color: '#66513f', secondary_color: '#eae4da', bg_main: '#f4f1eb', surface_bg: '#faf8f4', card_bg: '#fffdf9',
    sidebar_bg: '#29251f', sidebar_text: '#f4eee5', text_main: '#302b25', text_muted: '#6c6257', border_color: '#ded7cc', accent_badge: 'Recomendado'
  },
  {
    id: 'operativo-azul',
    name: 'Operativo Azul',
    desc: 'Tema corporativo de alto contraste para operación diaria',
    mode: 'light',
    primary_color: '#2563eb', secondary_color: '#dbeafe', bg_main: '#f1f5f9',
    surface_bg: '#f8fafc', card_bg: '#ffffff', sidebar_bg: '#0f172a',
    sidebar_text: '#e2e8f0', text_main: '#0f172a', text_muted: '#475569', border_color: '#dbe3ee',
    accent_badge: 'Recomendado'
  },
  {
    id: 'operativo-esmeralda', name: 'Operativo Esmeralda', desc: 'Alternativa sobria para operación y disponibilidad',
    mode: 'light',
    primary_color: '#047857', secondary_color: '#d1fae5', bg_main: '#f0fdf4', surface_bg: '#f8fafc',
    card_bg: '#ffffff',
    sidebar_bg: '#064e3b', sidebar_text: '#ecfdf5', text_main: '#102a22', text_muted: '#466158', border_color: '#d1e7dd'
  },
  {
    id: 'operativo-nocturno', name: 'Operativo Nocturno', desc: 'Tema oscuro pensado para turnos de baja luz',
    mode: 'dark',
    primary_color: '#60a5fa', secondary_color: '#1e3a5f', bg_main: '#0f172a', surface_bg: '#172033',
    card_bg: '#1e293b', sidebar_bg: '#020617', sidebar_text: '#e2e8f0', text_main: '#f8fafc', text_muted: '#94a3b8', border_color: '#334155'
  },
  {
    id: 'operativo-violeta', name: 'Operativo Violeta', desc: 'Tema de gestión con acentos claros y profesionales',
    mode: 'light',
    primary_color: '#6d28d9', secondary_color: '#ede9fe', bg_main: '#f5f3ff', surface_bg: '#fafaff',
    card_bg: '#ffffff',
    sidebar_bg: '#2e1065', sidebar_text: '#f5f3ff', text_main: '#1e1b4b', text_muted: '#5b5a85', border_color: '#ddd6fe'
  },
  {
    id: 'minimalista', name: 'Minimalista', desc: 'Interfaz blanca con jerarquía visual corporativa',
    mode: 'light',
    primary_color: '#334155', secondary_color: '#e2e8f0', bg_main: '#f8fafc',
    surface_bg: '#ffffff',
    card_bg: '#ffffff',
    sidebar_bg: '#111827', sidebar_text: '#f8fafc', text_main: '#111827', text_muted: '#64748b', border_color: '#e2e8f0'
  }
];

export const PRIMARY_COLOR_PRESETS = [
  { id: 'azul-profesional', name: 'Azul profesional', hex: '#2563eb' },
  { id: 'esmeralda', name: 'Esmeralda', hex: '#047857' },
  { id: 'violeta', name: 'Violeta', hex: '#6d28d9' },
  { id: 'grafito', name: 'Grafito', hex: '#334155' }
];

export const DEFAULT_USER_PREFERENCES = {
  theme_mode: 'light', // light, dark, auto
  selected_theme: 'la-vid-elegante',
  primary_color: '#66513f',
  sidebar_style: 'expanded', // expanded, compact
  font_size: 'normal', // small, normal, large
  density_mode: 'normal', // comfortable, normal, compact
  card_style: 'clasico' // clasico, moderno, minimalista
};

/**
 * Calcular contraste óptimo YIQ para garantizar legibilidad absoluta del texto
 */
export function getContrastYIQ(hexcolor) {
  let hex = (hexcolor || '#2563eb').replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 93;
  const g = parseInt(hex.substring(2, 4), 16) || 64;
  const b = parseInt(hex.substring(4, 6), 16) || 43;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#0f172a' : '#ffffff';
}

/**
 * Cargar preferencias de un usuario desde IndexedDB/localStorage
 */
export async function getUserPreferences(userId = 'global') {
  try {
    const prefs = await dbGet('user_preferences', userId);
    if (prefs) {
      return { ...DEFAULT_USER_PREFERENCES, ...prefs };
    }
  } catch (err) {}

  if (typeof window !== 'undefined' && window.localStorage) {
    const local = localStorage.getItem(`gastro_prefs_${userId}`);
    if (local) {
      try {
        return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(local) };
      } catch (e) {}
    }
  }

  return { ...DEFAULT_USER_PREFERENCES };
}

/**
 * Guardar preferencias por usuario
 */
export async function saveUserPreferences(userId = 'global', newPrefs = {}) {
  const current = await getUserPreferences(userId);
  const updated = { ...current, ...newPrefs, user_id: userId, updated_at: new Date().toISOString() };

  try {
    await dbPut('user_preferences', updated);
  } catch (err) {}

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(`gastro_prefs_${userId}`, JSON.stringify(updated));
    localStorage.setItem('gastro_active_prefs', JSON.stringify(updated));
  }

  applyThemeToDOM(updated);
  return updated;
}

/**
 * Obtener Identidad del Restaurante (La Vid Steak House & Pizza)
 */
export async function getRestaurantIdentity() {
  try {
    const ident = await dbGet('restaurant_identity', 'la_vid_identity');
    if (ident) return { ...DEFAULT_RESTAURANT_IDENTITY, ...ident };
  } catch (err) {}

  if (typeof window !== 'undefined' && window.localStorage) {
    const local = localStorage.getItem('gastro_restaurant_identity');
    if (local) {
      try {
        return { ...DEFAULT_RESTAURANT_IDENTITY, ...JSON.parse(local) };
      } catch (e) {}
    }
  }

  return { ...DEFAULT_RESTAURANT_IDENTITY };
}

/**
 * Guardar Identidad del Restaurante
 */
export async function saveRestaurantIdentity(identityData) {
  const updated = {
    ...DEFAULT_RESTAURANT_IDENTITY,
    ...identityData,
    id: 'la_vid_identity',
    updated_at: new Date().toISOString()
  };

  try {
    await dbPut('restaurant_identity', updated);
  } catch (err) {}

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('gastro_restaurant_identity', JSON.stringify(updated));
  }

  return updated;
}

/**
 * Aplicar Tema dinámicamente al DOM mediante Variables CSS globales
 */
export function applyThemeToDOM(prefs) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  let effectiveMode = prefs.theme_mode;
  if (effectiveMode === 'auto') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveMode = prefersDark ? 'dark' : 'light';
  }

  const preset = THEME_PRESETS.find(p => p.id === (prefs.selected_theme === 'operativo-azul' ? 'la-vid-elegante' : prefs.selected_theme)) || THEME_PRESETS[0];

  const legacyBrownColors = ['#2563eb','#5d402b', '#3e2718', '#735036', '#8c6544', '#3d281c', '#2c1d13', '#b8860b'];
  const primaryColor = legacyBrownColors.includes(String(prefs.primary_color || '').toLowerCase())
    ? preset.primary_color
    : (prefs.primary_color || preset.primary_color);
  const primaryText = getContrastYIQ(primaryColor);

  root.setAttribute('data-theme-mode', effectiveMode);
  root.setAttribute('data-preset', preset.id);
  root.setAttribute('data-sidebar-style', prefs.sidebar_style || 'expanded');
  root.setAttribute('data-font-size', prefs.font_size || 'normal');
  root.setAttribute('data-density', prefs.density_mode || 'normal');
  root.setAttribute('data-card-style', prefs.card_style || 'clasico');

  if (effectiveMode === 'dark') {
    root.style.setProperty('--bg-main', '#0f172a'); root.style.setProperty('--bg-surface', '#172033');
    root.style.setProperty('--bg-card', '#1e293b'); root.style.setProperty('--bg-sidebar', '#020617');
    root.style.setProperty('--sidebar-text', '#e2e8f0'); root.style.setProperty('--text-main', '#f8fafc');
    root.style.setProperty('--text-muted', '#94a3b8'); root.style.setProperty('--border-color', '#334155');
  } else {
    root.style.setProperty('--bg-main', preset.bg_main);
    root.style.setProperty('--bg-surface', preset.surface_bg);
    root.style.setProperty('--bg-card', preset.card_bg);
    root.style.setProperty('--bg-sidebar', preset.sidebar_bg);
    root.style.setProperty('--sidebar-text', preset.sidebar_text);
    root.style.setProperty('--text-main', preset.text_main);
    root.style.setProperty('--text-muted', preset.text_muted);
    root.style.setProperty('--border-color', preset.border_color);
  }

  root.style.setProperty('--primary-color', primaryColor);
  root.style.setProperty('--primary-text', primaryText);
  root.style.setProperty('--secondary-color', preset.secondary_color);

  let baseFontSize = '14px';
  if (prefs.font_size === 'small') baseFontSize = '12px';
  else if (prefs.font_size === 'large') baseFontSize = '16px';
  root.style.setProperty('--font-base-size', baseFontSize);

  let paddingScale = '1rem';
  if (prefs.density_mode === 'comfortable') paddingScale = '1.25rem';
  else if (prefs.density_mode === 'compact') paddingScale = '0.65rem';
  root.style.setProperty('--padding-density', paddingScale);
}
