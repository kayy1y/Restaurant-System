/**
 * Servicio de Gestión de Temas, Apariencia e Identidad del Restaurante
 * Paleta Exclusiva Steakhouse: Beige + Madera + Café + Crema + Blanco Cálido
 * La Vid Steak House & Pizza - La Fortuna, Costa Rica
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
    id: 'lavid-clasico',
    name: 'La Vid Clásico',
    desc: 'Paleta artesanal de madera noble, crema, beige cálido y café profundo',
    mode: 'light',
    primary_color: '#5d402b',
    secondary_color: '#d8c4a7',
    bg_main: '#f5efe6',
    surface_bg: '#faf6ee',
    card_bg: '#fffdf9',
    sidebar_bg: '#2c1d13',
    sidebar_text: '#f7f2e9',
    text_main: '#231710',
    text_muted: '#6e5a4b',
    border_color: '#dac8b3',
    accent_badge: 'Recomendado'
  },
  {
    id: 'lavid-bosque',
    name: 'La Vid Bosque',
    desc: 'Inspirado en la vegetación natural de La Fortuna con verde oliva apagado',
    mode: 'light',
    primary_color: '#46593a',
    secondary_color: '#d4c2a4',
    bg_main: '#f3f4ee',
    surface_bg: '#fafaf6',
    card_bg: '#ffffff',
    sidebar_bg: '#1c2817',
    sidebar_text: '#f2f6ee',
    text_main: '#1a2416',
    text_muted: '#5a6953',
    border_color: '#ccd6c4'
  },
  {
    id: 'steakhouse-nocturno',
    name: 'Steakhouse Nocturno',
    desc: 'Diseñado para turnos nocturnos con madera oscura y luces cálidas de tenue resplandor',
    mode: 'dark',
    primary_color: '#8c6544',
    secondary_color: '#4a3321',
    bg_main: '#160e09',
    surface_bg: '#21160e',
    card_bg: '#291b12',
    sidebar_bg: '#0d0805',
    sidebar_text: '#f9f3ea',
    text_main: '#fbf7f0',
    text_muted: '#c4b1a1',
    border_color: '#422c1d'
  },
  {
    id: 'madera-clara',
    name: 'Madera Clara',
    desc: 'Estilo rústico artesanal suave con tonos beige y tostados artesanales',
    mode: 'light',
    primary_color: '#735036',
    secondary_color: '#e2d2bb',
    bg_main: '#f7f2ea',
    surface_bg: '#fdfbf7',
    card_bg: '#ffffff',
    sidebar_bg: '#3d281b',
    sidebar_text: '#f7f2ea',
    text_main: '#2b1c13',
    text_muted: '#735e50',
    border_color: '#dfcfbb'
  },
  {
    id: 'minimalista',
    name: 'Minimalista',
    desc: 'Interfaz blanca impecable con detalles sutiles en café profundo',
    mode: 'light',
    primary_color: '#3d281c',
    secondary_color: '#e5ded4',
    bg_main: '#faf8f5',
    surface_bg: '#ffffff',
    card_bg: '#ffffff',
    sidebar_bg: '#1a120b',
    sidebar_text: '#f7f4ef',
    text_main: '#1f160f',
    text_muted: '#63554a',
    border_color: '#e2d9cd'
  }
];

export const PRIMARY_COLOR_PRESETS = [
  { id: 'cafe-madera', name: 'Café Madera', hex: '#5d402b' },
  { id: 'cafe-oscuro', name: 'Café Oscuro', hex: '#3e2718' },
  { id: 'verde-oliva-apagado', name: 'Verde Oliva Apagado', hex: '#46593a' },
  { id: 'marron-cuero', name: 'Marrón Cuero', hex: '#735036' },
  { id: 'beige-tostado', name: 'Beige Tostado', hex: '#b8860b' },
  { id: 'cafe-profundo', name: 'Café Profundo', hex: '#2c1d13' }
];

export const DEFAULT_USER_PREFERENCES = {
  theme_mode: 'light', // light, dark, auto
  selected_theme: 'lavid-clasico',
  primary_color: '#5d402b',
  sidebar_style: 'expanded', // expanded, compact
  font_size: 'normal', // small, normal, large
  density_mode: 'normal', // comfortable, normal, compact
  card_style: 'clasico' // clasico, moderno, minimalista
};

/**
 * Calcular contraste óptimo YIQ para garantizar legibilidad absoluta del texto
 */
export function getContrastYIQ(hexcolor) {
  let hex = (hexcolor || '#5d402b').replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 93;
  const g = parseInt(hex.substring(2, 4), 16) || 64;
  const b = parseInt(hex.substring(4, 6), 16) || 43;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#231710' : '#fffdf9';
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

  const preset = THEME_PRESETS.find(p => p.id === prefs.selected_theme) || THEME_PRESETS[0];

  const primaryColor = prefs.primary_color || preset.primary_color;
  const primaryText = getContrastYIQ(primaryColor);

  root.setAttribute('data-theme-mode', effectiveMode);
  root.setAttribute('data-preset', preset.id);
  root.setAttribute('data-sidebar-style', prefs.sidebar_style || 'expanded');
  root.setAttribute('data-font-size', prefs.font_size || 'normal');
  root.setAttribute('data-density', prefs.density_mode || 'normal');
  root.setAttribute('data-card-style', prefs.card_style || 'clasico');

  if (effectiveMode === 'dark') {
    root.style.setProperty('--bg-main', preset.id === 'lavid-clasico' ? '#160e09' : preset.bg_main);
    root.style.setProperty('--bg-surface', '#21160e');
    root.style.setProperty('--bg-card', '#291b12');
    root.style.setProperty('--bg-sidebar', '#0d0805');
    root.style.setProperty('--sidebar-text', '#f9f3ea');
    root.style.setProperty('--text-main', '#fbf7f0');
    root.style.setProperty('--text-muted', '#c4b1a1');
    root.style.setProperty('--border-color', '#422c1d');
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
