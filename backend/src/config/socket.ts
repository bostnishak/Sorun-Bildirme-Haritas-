import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from './env';
import { logger } from '../utils/logger';
import { redis } from './redis';

let io: Server;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`[Socket.io] İstemci bağlandı: ${socket.id}`);

    // Bbox odalarına katılma (Sadece kendi harita ekranındaki güncellemeleri almak için)
    socket.on('join-bbox', (bbox: string) => {
      // Önceki bbox odalarından ayrıl
      Array.from(socket.rooms).forEach(room => {
        if (room !== socket.id) socket.leave(room);
      });
      // Yeni odaya katıl
      socket.join(bbox);
      logger.debug(`[Socket.io] ${socket.id} joined ${bbox}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`[Socket.io] İstemci ayrıldı: ${socket.id}`);
    });
  });

  const subscriber = redis.duplicate();
  subscriber.subscribe('image-processed');
  subscriber.on('message', (channel, message) => {
    if (channel === 'image-processed') {
      try {
        const data = JSON.parse(message);
        io.emit('image-processed', data);
      } catch (err) {
        logger.error('image-processed pub/sub parse hatası:', { error: String(err) });
      }
    }
  });

  return io;
}

export function getSocket() {
  if (!io) {
    throw new Error('Socket.io başlatılmadı!');
  }
  return io;
}
