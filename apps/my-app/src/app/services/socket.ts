import { io, Socket } from 'socket.io-client';
import { useBearerTokenStore } from '../stores/auth.store';

const SOCKET_URL = 'http://localhost:3003';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const token = useBearerTokenStore.getState().accessToken;

    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: {
        token: `Bearer ${token}`,
      },
    });
  }

  return socketInstance;
};
