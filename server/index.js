import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

import { processDirectHaciendaInvoice, getDirectInvoiceStatus, getHaciendaBackendHealth } from './services/invoiceService.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('⚡ Dispositivo GastroFlow conectado:', socket.id);

  socket.on('gastroflow_event', (data) => {
    socket.broadcast.emit('gastroflow_event', data);
  });

  socket.on('disconnect', () => {
    console.log('Dispositivo desconectado:', socket.id);
  });
});

// =================================================================
// ENDPOINTS OFICIALES DE FACTURACIÓN ELECTRÓNICA DIRECTA HACIENDA v4.4
// =================================================================

// 1. Health Check del Backend y Diagnóstico de Configuración
app.get('/api/hacienda/health', (req, res) => {
  const health = getHaciendaBackendHealth();
  res.json(health);
});

// 2. Emisión Directa de Factura / Tiquete Electrónico v4.4
app.post('/api/hacienda/emit-invoice', async (req, res) => {
  try {
    const { order, payment, customer, docType } = req.body;
    if (!order) {
      return res.status(400).json({ error: 'Falta el objeto de pedido (order).' });
    }

    const result = await processDirectHaciendaInvoice({
      order,
      payment,
      customer,
      docType: docType || '01'
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error en emisión directa Hacienda:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'HACIENDA_EMISSION_ERROR'
    });
  }
});

// 3. Consulta de Estado de Comprobante por Clave (GET /recepcion/{clave})
app.get('/api/hacienda/status/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    const statusData = await getDirectInvoiceStatus(clave);
    res.json({
      success: true,
      data: statusData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.send('🚀 GastroFlow OS Backend Server & Engine v4.4 Direct Hacienda Activo');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`⚡ Servidor Backend GastroFlow Escuchando en Puerto ${PORT}`);
});
