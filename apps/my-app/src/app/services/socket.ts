import { io, Socket } from 'socket.io-client';
import { useBearerTokenStore } from '../stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3003';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const state = useBearerTokenStore.getState();
    const token = state.accessToken;
    const userId = state.user?._id;

    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: {
        token: `Bearer ${token}`,
        userId: userId ? String(userId) : undefined,
      },
      query: {
        userId: userId ? String(userId) : undefined,
      },
    });
  }

  return socketInstance;
};
