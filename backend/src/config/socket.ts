import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from '../utils/logger';
import { redis } from './redis';
import { JWTPayload } from '../middleware/auth.middleware';

let io: Server;

/**
 * Socket bağlantısından veya event verilerinden gelen JWT tokenı doğrular
 */
function verifySocketToken(token: string | undefined | null): JWTPayload | null {
  if (!token) return null;
  try {
    const cleanedToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const payload = jwt.verify(cleanedToken, env.JWT_ACCESS_SECRET) as JWTPayload;
    if (payload && payload.type === 'access') {
      return payload;
    }
  } catch (err) {
    // Geçersiz veya süresi dolmuş token
  }
  return null;
}

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.io middleware - Bağlantı esnasında auth token kontrolü
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    socket.data.user = verifySocketToken(token);
    next();
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`[Socket.io] İstemci bağlandı: ${socket.id} (Auth: ${socket.data.user ? socket.data.user.sub : 'Anonim'})`);

    // Bbox odalarına katılma (Sadece doğrulanmış kullanıcılar kendi harita ekranındaki güncellemeleri almak için)
    socket.on('join-bbox', (payloadOrBbox: any) => {
      const bbox = typeof payloadOrBbox === 'string' ? payloadOrBbox : payloadOrBbox?.bbox;
      const token = typeof payloadOrBbox === 'object' ? payloadOrBbox?.token : undefined;

      // Token event ile geldiyse veya handshake verisinde varsa doğrula
      const user = socket.data.user || verifySocketToken(token);
      if (!user) {
        logger.warn(`[Socket.io] Yetkisiz bbox katılım denemesi reddedildi (Socket ID: ${socket.id})`);
        socket.emit('error', { message: 'Bbox odasına katılmak için kimlik doğrulaması zorunludur.' });
        return;
      }

      if (!bbox || typeof bbox !== 'string' || !/^[0-9.,-]+$/.test(bbox)) {
        logger.warn(`[Socket.io] Geçersiz bbox formatı: ${bbox}`);
        return;
      }

      // Önceki bbox odalarından ayrıl
      Array.from(socket.rooms).forEach(room => {
        if (room !== socket.id && !room.startsWith('user:')) socket.leave(room);
      });

      // Yeni odaya katıl
      socket.join(bbox);
      logger.debug(`[Socket.io] ${socket.id} (User: ${user.sub}) joined bbox room: ${bbox}`);
    });

    // Kullanıcıya özel bildirim odasına katılma (Tam kimlik & yetki denetimi)
    socket.on('join-user', (payloadOrUserId: any) => {
      const userId = typeof payloadOrUserId === 'string' ? payloadOrUserId : payloadOrUserId?.userId;
      const token = typeof payloadOrUserId === 'object' ? payloadOrUserId?.token : undefined;

      const user = socket.data.user || verifySocketToken(token);

      // 1. Kimlik doğrulama zorunlu
      if (!user) {
        logger.warn(`[Socket.io] Yetkisiz join-user denemesi reddedildi: ${userId || 'belirtilmedi'} (Socket ID: ${socket.id})`);
        socket.emit('error', { message: 'Özel bildirim odasına katılmak için JWT kimlik doğrulaması zorunludur.' });
        return;
      }

      // 2. Kullanıcı sadece kendi odasına (veya Super Admin ise) katılabilir
      if (user.sub !== userId && user.role !== 'SUPER_ADMIN') {
        logger.warn(`[Socket.io] Yetkisiz özel oda erişim ihlali engellendi: Kullanıcı (${user.sub}), başkasının odasına (${userId}) girmeye çalıştı!`);
        socket.emit('error', { message: 'Yalnızca kendi bildirim odanıza katılabilirsiniz.' });
        return;
      }

      if (userId) {
        socket.join(`user:${userId}`);
        socket.data.user = user;
        logger.debug(`[Socket.io] ${socket.id} joined user:${userId}`);
      }
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
        if (data.userId) {
          io.to(`user:${data.userId}`).emit('image-processed', data);
        } else {
          logger.warn('[Socket.io] image-processed olayı için userId bulunamadı. Broadcast edilmedi.', data);
        }
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
