import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

let socket: Socket | null = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Fallback ile websocket kullan
    });

    socket.on('connect', () => {
      console.log('[Socket] Bağlandı:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Bağlantı koptu.');
    });
  }
  return socket;
};

export const getSocket = () => socket;
