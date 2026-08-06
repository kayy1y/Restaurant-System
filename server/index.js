import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
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

app.get('/', (req, res) => {
  res.send('🚀 GastroFlow OS Socket.io Cloud Relay Servidor Activo');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor de Sincronización escuchando en puerto ${PORT}`);
});
