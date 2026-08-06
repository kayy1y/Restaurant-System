/**
 * Motor de Sincronización en la Nube y Multidispositivo GastroFlow OS
 * Sincroniza datos transaccionales de IndexedDB automáticamente entre la Tablet del Salonero, la Computadora de Caja y el Monitor de Cocina.
 */

import { dbPut, dbGet, dbGetAll } from './db.js';

class LiveSyncEngine {
  constructor() {
    this.listeners = new Map();
    this.deviceId = `device-${Math.random().toString(36).substring(2, 9)}`;
    
    // BroadcastChannel local
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('gastroflow_sync_channel_v4');
      this.channel.onmessage = async (event) => {
        if (event.data && event.data.type && event.data.payload) {
          await this._handleIncomingCloudEvent(event.data.type, event.data.payload, false);
        }
      };
    }

    // LocalStorage Event Bus para sincronización local
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', async (e) => {
        if (e.key === 'gastroflow_cloud_sync_bus' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed.senderId !== this.deviceId && parsed.type && parsed.payload) {
              await this._handleIncomingCloudEvent(parsed.type, parsed.payload, false);
            }
          } catch (err) {
            console.error('Error storage bus:', err);
          }
        }
      });
    }

    // Inicializar transporte WebSocket Cloud Relay para Vercel & Dispositivos Externos
    this._initCloudWebSocket();
  }

  _initCloudWebSocket() {
    if (typeof window === 'undefined') return;

    try {
      // Endpoint WebSocket Cloud Relay de alta disponibilidad
      const wssUrl = 'wss://free.piesocket.com/v3/gastroflow_v2025_channel?api_key=VCx2BCc3ibJyOYAiB2ZajStrength';
      this.ws = new WebSocket(wssUrl);

      this.ws.onopen = () => {
        console.log('⚡ Conectado a GastroFlow Cloud Relay Multidispositivo');
      };

      this.ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg && msg.senderId !== this.deviceId && msg.type && msg.payload) {
            await this._handleIncomingCloudEvent(msg.type, msg.payload, false);
          }
        } catch (err) {
          // Ignorar pings
        }
      };

      this.ws.onclose = () => {
        setTimeout(() => this._initCloudWebSocket(), 4000);
      };
    } catch (err) {
      console.error('Error iniciando WebSocket Cloud:', err);
    }
  }

  /**
   * PROCESADOR CLAVE: Guarda primero el objeto recibido en la IndexedDB del dispositivo receptor
   * ANTES de notificar a las vistas (Tablet/Compu) para que loadData() encuentre los datos reales en DB.
   */
  async _handleIncomingCloudEvent(type, payload, shouldBroadcast = true) {
    try {
      if (type === 'ORDER_CREATED') {
        if (payload.order) await dbPut('orders', payload.order);
        if (payload.comanda) await dbPut('comandas', payload.comanda);
      } else if (type === 'ORDER_UPDATED') {
        if (payload.order) await dbPut('orders', payload.order);
        if (payload.newComanda) await dbPut('comandas', payload.newComanda);
      } else if (type === 'KDS_STATUS_CHANGED') {
        if (payload.id) await dbPut('comandas', payload);
        if (payload.order_id) {
          const ord = await dbGet('orders', payload.order_id);
          if (ord) {
            let newStatus = 'EN_PREPARACION';
            if (payload.status === 'Listo' || payload.status === 'LISTO_PARA_ENTREGA') newStatus = 'LISTO_PARA_ENTREGA';
            else if (payload.status === 'Entregado') newStatus = 'ENTREGADO';
            await dbPut('orders', { ...ord, status: newStatus });
          }
        }
      } else if (type === 'TABLE_RELEASED') {
        if (payload.orderId) {
          const ord = await dbGet('orders', payload.orderId);
          if (ord) {
            await dbPut('orders', { ...ord, status: 'PAGADO', account_status: 'PAGADA', order_lifecycle: 'CERRADO' });
          }
        }
      } else if (type === 'PAYMENT_COMPLETED') {
        if (payload.order) await dbPut('orders', payload.order);
      } else if (type === 'INCIDENT_REPORTED') {
        if (payload.incident) await dbPut('incidents', payload.incident);
      }
    } catch (dbErr) {
      console.error('Error guardando en IndexedDB local:', dbErr);
    }

    // Notificar a los componentes de la interfaz local
    const subs = this.listeners.get(type);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(payload);
        } catch (err) {
          console.error(`Error en listener ${type}:`, err);
        }
      });
    }
  }

  // Suscribirse a eventos
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      const subs = this.listeners.get(event);
      if (subs) subs.delete(callback);
    };
  }

  // Emitir evento e insertar en Nube + Local
  async emit(event, payload) {
    // 1. Guardar y procesar localmente
    await this._handleIncomingCloudEvent(event, payload, true);

    // 2. Transmitir por BroadcastChannel (Mismo dispositivo / Pestañas)
    if (this.channel) {
      try {
        this.channel.postMessage({ type: event, payload, timestamp: Date.now() });
      } catch (err) {}
    }

    // 3. Transmitir por WebSocket Cloud (Distintos Dispositivos Físicos: Tablet vs Compu)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          senderId: this.deviceId,
          type: event,
          payload: payload,
          timestamp: Date.now()
        }));
      } catch (err) {}
    }

    // 4. Fallback LocalStorage Bus
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('gastroflow_cloud_sync_bus', JSON.stringify({
          senderId: this.deviceId,
          type: event,
          payload: payload,
          timestamp: Date.now()
        }));
      } catch (e) {}
    }
  }
}

export const liveSync = new LiveSyncEngine();
