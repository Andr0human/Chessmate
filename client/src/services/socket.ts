import { io, Socket } from 'socket.io-client';
import apiInstance from './api';

const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  autoConnect: false,
});

let wakePromise: Promise<void> | null = null;

const wakeServer = (): Promise<void> => {
  if (!wakePromise) {
    wakePromise = apiInstance
      .get('/health', { timeout: 60000 })
      .then(() => undefined)
      .catch((error) => {
        wakePromise = null;
        throw error;
      });
  }
  return wakePromise;
};

export const connectSocket = async (): Promise<Socket> => {
  if (socket.connected) {
    return socket;
  }
  await wakeServer();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export default socket;
