/**
 * Motor de Sincronización en la Nube Multidispositivo GastroFlow OS (Supabase Realtime + WebSockets + BroadcastChannel)
 * Transmite automáticamente en vivo entre Tablets, Computadoras de Caja y Pantallas de Cocina.
 */

import { dbPut, dbGet } from './db.js';
import { supabase } from '../lib/supabase.js';

// URL del Servidor Socket.io en la Nube (Render.com)
const SOCKET_SERVER_URL = 'https://gastroflow-socket-server.onrender.com';

class LiveSyncEngine {
  constructor() {
    this.listeners = new Map();
    this.deviceId = `device-${Math.random().toString(36).substring(2, 9)}`;
    
    // 1. BroadcastChannel local (mismo navegador / pestañas)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('gastroflow_sync_channel_v6');
      this.channel.onmessage = async (event) => {
        if (event.data && event.data.type && event.data.payload) {
          await this._handleIncomingCloudEvent(event.data.type, event.data.payload, false);
        }
      };
    }

    // 2. Conectar al Servidor WebSocket / Socket.io Cloud
    this._initSocketConnection();

    // 3. Conectar a Supabase Realtime Channel (Eventos en tiempo real desde Supabase)
    this._initSupabaseRealtime();
  }

  _initSocketConnection() {
    if (typeof window === 'undefined') return;

    try {
      const socketUrl = SOCKET_SERVER_URL.replace('http', 'ws');
      this.ws = new WebSocket(socketUrl);

      this.ws.onopen = () => {
        console.log('⚡ Conectado a Socket.io Cloud');
      };

      this.ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg && msg.senderId !== this.deviceId && msg.type && msg.payload) {
            await this._handleIncomingCloudEvent(msg.type, msg.payload, false);
          }
        } catch (err) {}
      };

      this.ws.onclose = () => {
        setTimeout(() => this._initSocketConnection(), 4000);
      };
    } catch (err) {
      console.error('Error conectando a Socket.io Cloud:', err);
    }
  }

  _initSupabaseRealtime() {
    if (typeof window === 'undefined' || !supabase) return;

    try {
      // Suscripción al Canal en Tiempo Real de Supabase
      this.supabaseChannel = supabase
        .channel('gastroflow_realtime_channel')
        .on('broadcast', { event: 'gastroflow_event' }, async (response) => {
          if (response.payload && response.payload.senderId !== this.deviceId) {
            await this._handleIncomingCloudEvent(response.payload.type, response.payload.payload, false);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, async (payload) => {
          if (payload.new) {
            await this._handleIncomingCloudEvent('ORDER_UPDATED', { order: payload.new }, false);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'detalles_pedido' }, async (payload) => {
          if (payload.new) {
            await this._handleIncomingCloudEvent('KDS_STATUS_CHANGED', payload.new, false);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, async (payload) => {
          await this._handleIncomingCloudEvent('RESERVATION_UPDATED', payload.new || payload.old, false);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('📡 Suscrito exitosamente a Supabase Realtime Channel');
          }
        });
    } catch (err) {
      console.log('Notificación Supabase Realtime (Esperando credenciales en .env.local):', err.message);
    }
  }

  /**
   * GUARDA PRIMERO EN INDEXEDDB LOCAL DEL DISPOSITIVO RECEPTOR (TABLET / COMPU)
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

    // Notificar a los componentes de interfaz local
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

  on(event, callback) {
    return this.subscribe(event, callback);
  }

  async emit(event, payload) {
    // 1. Guardar y procesar localmente primero
    await this._handleIncomingCloudEvent(event, payload, true);

    const eventPacket = {
      senderId: this.deviceId,
      type: event,
      payload: payload,
      timestamp: Date.now()
    };

    // 2. Transmitir por BroadcastChannel (Mismo dispositivo)
    if (this.channel) {
      try {
        this.channel.postMessage(eventPacket);
      } catch (err) {}
    }

    // 3. Transmitir a través de Supabase Realtime Broadcast Channel
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'gastroflow_event',
          payload: eventPacket
        });
      } catch (err) {}
    }

    // 4. Transmitir a través de WebSockets Socket.io Cloud
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(eventPacket));
      } catch (err) {}
    }
  }
}

export const liveSync = new LiveSyncEngine();
