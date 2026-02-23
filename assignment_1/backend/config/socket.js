const { Server } = require('socket.io');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.on('forum:join', ({ eventId }) => {
      if (!eventId) return;
      socket.join(`forum:${eventId}`);
    });

    socket.on('forum:leave', ({ eventId }) => {
      if (!eventId) return;
      socket.leave(`forum:${eventId}`);
    });
  });

  return io;
};

const getIO = () => io;

const emitForumUpdate = (eventId, payload = {}) => {
  if (!io || !eventId) return;
  io.to(`forum:${eventId}`).emit('forum:update', {
    eventId,
    updatedAt: new Date().toISOString(),
    ...payload
  });
};

module.exports = {
  initSocket,
  getIO,
  emitForumUpdate
};
