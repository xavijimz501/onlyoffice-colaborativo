const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const documentRepository = require('../repositories/documentRepository');

function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' },
  });
  const socketsByDocument = new Map();
  const documentBySocket = new Map();

  io.use((socket, next) => {
    try {
      socket.user = jwt.verify(socket.handshake.auth?.token, process.env.APP_JWT_SECRET);
      next();
    } catch { next(new Error('No autorizado')); }
  });

  function publish(documentId) {
    const users = new Map();
    for (const user of (socketsByDocument.get(documentId) || new Map()).values()) {
      users.set(String(user.idusuario), user);
    }
    io.to(`document:${documentId}`).emit('presence:update', [...users.values()]);
  }

  io.on('connection', (socket) => {
    socket.on('document:join', async (documentId) => {
      const id = Number(documentId);
      let document;
      try {
        if (Number.isSafeInteger(id) && id > 0) document = await documentRepository.findById(id);
      } catch {
        socket.emit('presence:error', { message: 'No se pudo consultar el documento.' });
        return;
      }
      if (!document) {
        socket.emit('presence:error', { message: 'Documento no encontrado.' });
        return;
      }
      const previousId = documentBySocket.get(socket.id);
      if (previousId) {
        socket.leave(`document:${previousId}`);
        socketsByDocument.get(previousId)?.delete(socket.id);
        publish(previousId);
      }
      documentBySocket.set(socket.id, id);
      socket.join(`document:${id}`);
      if (!socketsByDocument.has(id)) socketsByDocument.set(id, new Map());
      socketsByDocument.get(id).set(socket.id, {
        idusuario: socket.user.idusuario,
        nombre: socket.user.nombre,
      });
      publish(id);
    });

    socket.on('disconnect', () => {
      const documentId = documentBySocket.get(socket.id);
      if (!documentId) return;
      socketsByDocument.get(documentId)?.delete(socket.id);
      documentBySocket.delete(socket.id);
      publish(documentId);
    });
  });
  return io;
}

module.exports = { initializeSocketServer };
