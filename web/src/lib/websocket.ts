import { io, Socket } from 'socket.io-client';

class WebSocketManager {
  private socket: Socket | null = null;
  private sessionId: string | null = null;

  connect(sessionId: string) {
    if (this.socket && this.sessionId === sessionId) {
      return this.socket;
    }

    // Disconnect existing connection
    if (this.socket) {
      this.socket.disconnect();
    }

    this.sessionId = sessionId;
    this.socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.socket?.emit('join-session', sessionId);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.sessionId) {
        this.socket.emit('leave-session', this.sessionId);
      }
      this.socket.disconnect();
      this.socket = null;
      this.sessionId = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Emit events to server
  emit(event: string, data?: unknown) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Listen to events from server
  on(event: string, callback: (...args: unknown[]) => void) {
    if (this.socket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on(event, callback as (...args: any[]) => void);
    }
  }

  // Remove event listener
  off(event: string, callback?: (...args: unknown[]) => void) {
    if (this.socket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.off(event, callback as (...args: any[]) => void);
    }
  }
}

export const wsManager = new WebSocketManager();
