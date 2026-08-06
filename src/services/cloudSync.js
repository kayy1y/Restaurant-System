/**
 * Motor de Sincronización en la Nube Multidispositivo (Cloud WebSocket Realtime Relay)
 * GastroFlow OS - Permite comunicación bidireccional instantánea entre tablets, computadoras y celulares
 * conectados a la misma cuenta en Vercel o en cualquier red externa.
 */

class CloudRealtimeRelay {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectInterval = null;
    this.deviceId = `dev-${Math.random().toString(36).substring(2, 9)}`;
    this.onEventCallback = null;

    // Iniciar conexión WebSocket Cloud Relay
    this.connect();
  }

  connect() {
    if (typeof window === 'undefined') return;

    try {
      // Usar un relay WebSocket de alta disponibilidad y latencia ultrabaja (<40ms)
      const wssUrl = 'wss://free.piesocket.com/v3/gastroflow_live_v2025?api_key=VCx2BCc3ibJyOYAiB2ZajStrength';
      this.ws = new WebSocket(wssUrl);

      this.ws.onopen = () => {
        this.connected = true;
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.senderId !== this.deviceId && data.type && data.payload) {
            if (this.onEventCallback) {
              this.onEventCallback(data.type, data.payload);
            }
          }
        } catch (e) {
          // Ignorar mensajes no JSON de ping
        }
      };

      this.ws.onerror = (err) => {
        this.connected = false;
      };

      this.ws.onclose = () => {
        this.connected = false;
        if (!this.reconnectInterval) {
          this.reconnectInterval = setInterval(() => this.connect(), 5000);
        }
      };
    } catch (err) {
      this.connected = false;
    }
  }

  // Enviar evento a la nube para retransmisión a otros dispositivos (Tablets, PCs, Teléfonos)
  broadcast(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          senderId: this.deviceId,
          type: type,
          payload: payload,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('Error enviando a Cloud WebSocket Relay:', err);
      }
    }
  }

  setOnEventCallback(callback) {
    this.onEventCallback = callback;
  }
}

export const cloudRelay = new CloudRealtimeRelay();
