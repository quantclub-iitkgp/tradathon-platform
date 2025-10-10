export type UUID = string;

export type UserRole = "admin" | "player";
export type SessionStatus = "lobby" | "active" | "paused" | "ended";
export type RoundStatus = "waiting" | "active" | "executing" | "completed";
export type OrderType = "buy" | "sell";
export type OrderStatus = "open" | "filled" | "cancelled";

export interface User {
  id: UUID;
  displayName: string;
  role: UserRole;
}

export interface GameSession {
  id: UUID;
  adminId: UUID;
  roomCode: string;
  status: SessionStatus;
  startingCash: number;
  maxShares: number;
  sessionDurationSec: number;
  currentPrice: number | null;
  lastTradedPrice: number | null;
  currentRound: number;
  totalRounds: number;
  roundDurationSec: number;
  roundStatus: RoundStatus;
  roundEndTime: number | null; // epoch ms
  createdAt: number; // epoch ms
}

export interface PlayerState {
  id: number;
  sessionId: UUID;
  userId: UUID;
  cashBalance: number;
  sharesHeld: number;
}

export interface Round {
  id: number;
  sessionId: UUID;
  roundNumber: number;
  status: RoundStatus;
  startTime: number; // epoch ms
  endTime: number | null; // epoch ms
  executionPrice: number | null;
  orders: Order[];
}

export interface Order {
  id: number;
  sessionId: UUID;
  playerId: number;
  type: OrderType;
  price: number;
  quantity: number;
  status: OrderStatus;
  roundNumber: number;
  createdAt: number; // epoch ms
}

export interface Trade {
  id: number;
  sessionId: UUID;
  buyOrderId: number;
  sellOrderId: number;
  price: number;
  quantity: number;
  roundNumber: number;
  createdAt: number; // epoch ms
}

export interface CreateSessionInput {
  adminDisplayName: string;
  startingCash: number;
  maxShares: number;
  sessionDurationSec: number;
  totalRounds: number;
  roundDurationSec: number;
}

export interface CreateSessionResponse {
  session: GameSession;
  adminUser: User;
}

export interface JoinSessionInput {
  roomCode: string;
  displayName: string;
}

export interface JoinSessionResponse {
  session: GameSession;
  user: User;
  player: PlayerState;
}

export interface PlaceOrderInput {
  sessionId: UUID;
  userId: UUID;
  type: OrderType;
  price: number;
  quantity: number;
}

export interface CancelOrderInput {
  sessionId: UUID;
  userId: UUID;
  orderId: number;
}

export interface StartRoundInput {
  sessionId: UUID;
}

export interface EndRoundInput {
  sessionId: UUID;
  executionPrice: number;
}

export interface OrderBookSideLevel {
  price: number;
  quantity: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookSideLevel[];
  asks: OrderBookSideLevel[];
}

export interface LeaderboardEntry {
  userId: UUID;
  displayName: string;
  netWorth: number;
  cashBalance: number;
  sharesHeld: number;
  totalPnL: number;
  roundPnL: number;
}


