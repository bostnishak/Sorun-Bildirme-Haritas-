import { io, Socket } from 'socket.io-client';

// NEXT_PUBLIC_API_URL '/api' gibi bir path olabilir — Socket.io tam URL gerektirir.
// Bu yüzden ayrı NEXT_PUBLIC_SOCKET_URL kullan; yoksa backend'in gerçek host'una bağlan.
const getSocketUrl = () => {
  // Explicit socket URL varsa onu kullan
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // Development: backend port 3001'de çalışıyor (9000 MinIO'nun portuydu)
  if (typeof window !== 'undefined') {
    // Tarayıcıda çalışıyorsak aynı host'a bağlan, sadece port farklı
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
  }
  return 'http://localhost:3001';
};

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Fallback ile websocket kullan
    });

    socket.on('connect', () => {
      console.log('[Socket] Bağlandı:', socket?.id, '→', SOCKET_URL);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Bağlantı hatası:', err.message);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Bağlantı koptu.');
    });
  }
  return socket;
};

export const getSocket = () => socket;
