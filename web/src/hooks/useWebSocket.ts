import { useEffect, useRef, useCallback } from 'react';
import { wsManager } from '@/lib/websocket';

export interface WebSocketEvents {
  'session-updated': (data: any) => void;
  'leaderboard-updated': (data: any) => void;
  'player-updated': (data: any) => void;
  'order-placed': (data: any) => void;
  'order-cancelled': (data: any) => void;
  'trade-executed': (data: any) => void;
  'round-started': (data: any) => void;
  'round-ended': (data: any) => void;
  'price-updated': (data: any) => void;
}

export function useWebSocket(sessionId: string | null) {
  const socketRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!sessionId) return;
    
    socketRef.current = wsManager.connect(sessionId);
  }, [sessionId]);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
    socketRef.current = null;
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    wsManager.emit(event, data);
  }, []);

  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ) => {
    wsManager.on(event, callback);
  }, []);

  const off = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback?: WebSocketEvents[K]
  ) => {
    wsManager.off(event, callback);
  }, []);

  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected || false
  };
}
