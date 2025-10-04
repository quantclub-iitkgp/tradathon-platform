export type UUID = string;

export type UserRole = "admin" | "player";
export type SessionStatus = "lobby" | "active" | "paused" | "ended";
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
  createdAt: number; // epoch ms
}

export interface PlayerState {
  id: number;
  sessionId: UUID;
  userId: UUID;
  cashBalance: number;
  sharesHeld: number;
}

export interface Puzzle {
  id: number;
  sessionId: UUID;
  question: string;
  answer: string;
  isActive: boolean;
  solvedByUserId?: UUID;
  priceUnlockTime?: number; // epoch ms
}

export interface Order {
  id: number;
  sessionId: UUID;
  playerId: number;
  type: OrderType;
  price: number;
  quantity: number;
  status: OrderStatus;
  createdAt: number; // epoch ms
}

export interface Trade {
  id: number;
  sessionId: UUID;
  buyOrderId: number;
  sellOrderId: number;
  price: number;
  quantity: number;
  createdAt: number; // epoch ms
}

export interface CreateSessionInput {
  adminDisplayName: string;
  startingCash: number;
  maxShares: number;
  sessionDurationSec: number;
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

export interface SubmitPuzzleAnswerInput {
  sessionId: UUID;
  userId: UUID;
  answer: string;
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
}


