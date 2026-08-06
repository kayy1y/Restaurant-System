/**
 * Motor de Sincronización en Tiempo Real Multidispositivo (Pub/Sub + Cloud WebSocket Relay + BroadcastChannel)
 * GastroFlow OS - Permite reactividad bidireccional instantánea entre Saloneros, Cocina, Caja y Administración
 * en el mismo navegador o entre múltiples dispositivos (Tablets, PCs, Teléfonos) conectados a Vercel.
 */

import { cloudRelay } from './cloudSync.js';

class LiveSyncEngine {
  constructor() {
    this.listeners = new Map();
    
    // 1. BroadcastChannel para pestañas/ventanas locales
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('gastroflow_live_sync_channel');
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type && event.data.payload) {
          this._notifyLocalListeners(event.data.type, event.data.payload, false);
        }
      };
    }

    // 2. LocalStorage Fallback para navegadores antiguos
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'gastroflow_last_event' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed.type && parsed.payload) {
              this._notifyLocalListeners(parsed.type, parsed.payload, false);
            }
          } catch (err) {
            console.error('Error procesando evento de storage:', err);
          }
        }
      });
    }

    // 3. Escuchar eventos provenientes de la Nube (WebSocket Cloud Relay para Vercel)
    cloudRelay.setOnEventCallback((type, payload) => {
      this._notifyLocalListeners(type, payload, false);
    });
  }

  // Suscribirse a eventos (ej. 'ORDER_CREATED', 'ORDER_UPDATED', 'KDS_STATUS_CHANGED', 'TABLE_RELEASED', 'PAYMENT_COMPLETED')
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      const subs = this.listeners.get(event);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  // Notificar oyentes locales
  _notifyLocalListeners(event, payload, shouldBroadcast = true) {
    const subs = this.listeners.get(event);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(payload);
        } catch (err) {
          console.error(`Error en listener de evento ${event}:`, err);
        }
      });
    }
  }

  // Emitir evento a todos los componentes locales y retransmitir a la NUBE (Vercel Multidispositivo)
  emit(event, payload) {
    this._notifyLocalListeners(event, payload, true);

    // Broadcast local a otras pestañas
    if (this.channel) {
      try {
        this.channel.postMessage({ type: event, payload, timestamp: Date.now() });
      } catch (err) {
        console.error('Error postMessage BroadcastChannel:', err);
      }
    }

    // Broadcast en la NUBE para Vercel (Tablet ➔ PC Cajero ➔ Monitor Cocina)
    cloudRelay.broadcast(event, payload);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('gastroflow_last_event', JSON.stringify({
          type: event,
          payload,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Ignorar si storage está lleno
      }
    }
  }
}

export const liveSync = new LiveSyncEngine();
