import { useEffect, useRef, useCallback } from 'react';
import { wsManager } from '@/lib/websocket';

// WebSocket event data types
interface SessionUpdateData {
  currentRound?: number;
  totalRounds?: number;
  roundStatus?: string;
  roundEndTime?: number;
  currentPrice?: number;
  lastTradedPrice?: number;
}

interface LeaderboardData {
  userId: string;
  displayName: string;
  netWorth: number;
  cashBalance: number;
  sharesHeld: number;
  totalPnL: number;
}

interface PlayerUpdateData {
  userId?: string;
  player: {
    id: number;
    cashBalance: number;
    sharesHeld: number;
  };
  openOrders: Array<{
    id: number;
    type: "buy" | "sell";
    price: number;
    quantity: number;
  }>;
  closedOrders: Array<{
    id: number;
    type: "buy" | "sell";
    price: number;
    quantity: number;
    status: string;
  }>;
}

interface OrderData {
  id: number;
  sessionId: string;
  playerId: number;
  type: "buy" | "sell";
  price: number;
  quantity: number;
  status: string;
  roundNumber: number;
  createdAt: number;
}

interface TradeData {
  id: number;
  sessionId: string;
  buyOrderId: number;
  sellOrderId: number;
  price: number;
  quantity: number;
  roundNumber: number;
  createdAt: number;
}

interface RoundData {
  id: number;
  sessionId: string;
  roundNumber: number;
  status: string;
  startTime: number;
  endTime: number | null;
  executionPrice: number | null;
  orders: unknown[];
}

interface PriceUpdateData {
  price: number;
  timestamp: number;
}

export interface WebSocketEvents {
  'session-updated': (data: SessionUpdateData) => void;
  'leaderboard-updated': (data: LeaderboardData[]) => void;
  'player-updated': (data: PlayerUpdateData) => void;
  'order-placed': (data: OrderData) => void;
  'order-cancelled': (data: OrderData) => void;
  'trade-executed': (data: TradeData) => void;
  'round-started': (data: RoundData) => void;
  'round-ended': (data: RoundData) => void;
  'price-updated': (data: PriceUpdateData) => void;
}

export function useWebSocket(sessionId: string | null) {
  const socketRef = useRef<ReturnType<typeof wsManager.connect> | null>(null);

  const connect = useCallback(() => {
    if (!sessionId) return;
    
    socketRef.current = wsManager.connect(sessionId);
  }, [sessionId]);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
    socketRef.current = null;
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    wsManager.emit(event, data);
  }, []);

  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ) => {
    wsManager.on(event, callback as (...args: unknown[]) => void);
  }, []);

  const off = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback?: WebSocketEvents[K]
  ) => {
    wsManager.off(event, callback as (...args: unknown[]) => void);
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
