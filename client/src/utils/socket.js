import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
    socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
    socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Promise wrapper for socket emit with ack
export function emitAsync(socket, event, data) {
  return new Promise((resolve, reject) => {
    socket.emit(event, data, (response) => {
      if (response && response.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}
