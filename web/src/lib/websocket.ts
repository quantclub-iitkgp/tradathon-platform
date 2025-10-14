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
    
    // Determine WebSocket URL based on environment
    const getWebSocketUrl = () => {
      if (process.env.NODE_ENV === 'production') {
        // In production, use the same domain as the app
        if (typeof window !== 'undefined') {
          return window.location.origin;
        }
        return process.env.NEXT_PUBLIC_APP_URL || 'http://65.0.80.171';
      }
      return 'http://localhost:3000';
    };

    const wsUrl = getWebSocketUrl();
    console.log('WebSocket connecting to:', wsUrl);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected to:', getWebSocketUrl());
      this.socket?.emit('join-session', sessionId);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.socket?.emit('join-session', sessionId);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
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
