import { randomUUID } from "crypto";
import {
  CancelOrderInput,
  CreateSessionInput,
  CreateSessionResponse,
  GameSession,
  JoinSessionInput,
  JoinSessionResponse,
  LeaderboardEntry,
  Order,
  OrderBookSnapshot,
  PlaceOrderInput,
  PlayerState,
  Round,
  Trade,
  User,
  UUID,
} from "./types";

type Db = {
  users: Map<UUID, User>;
  sessions: Map<UUID, GameSession>;
  roomCodeToSessionId: Map<string, UUID>;
  playersBySession: Map<UUID, Map<number, PlayerState>>;
  playerIdCounter: number;
  ordersBySession: Map<UUID, Map<number, Order>>;
  orderIdCounter: number;
  tradesBySession: Map<UUID, Map<number, Trade>>;
  tradeIdCounter: number;
  roundsBySession: Map<UUID, Map<number, Round>>;
  roundIdCounter: number;
};

const db: Db = {
  users: new Map(),
  sessions: new Map(),
  roomCodeToSessionId: new Map(),
  playersBySession: new Map(),
  playerIdCounter: 1,
  ordersBySession: new Map(),
  orderIdCounter: 1,
  tradesBySession: new Map(),
  tradeIdCounter: 1,
  roundsBySession: new Map(),
  roundIdCounter: 1,
};

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  if (db.roomCodeToSessionId.has(code)) return generateRoomCode();
  return code;
}

function now(): number {
  return Date.now();
}

export function createSession(input: CreateSessionInput, adminIdOverride?: UUID): CreateSessionResponse {
  const adminUser: User = {
    id: adminIdOverride ?? randomUUID(),
    displayName: input.adminDisplayName,
    role: "admin",
  };
  db.users.set(adminUser.id, adminUser);

  const sessionId = randomUUID();
  const roomCode = generateRoomCode();
  const session: GameSession = {
    id: sessionId,
    adminId: adminUser.id,
    roomCode,
    status: "lobby",
    startingCash: input.startingCash,
    maxShares: input.maxShares,
    sessionDurationSec: input.sessionDurationSec,
    currentPrice: null,
    lastTradedPrice: null,
    currentRound: 0,
    totalRounds: input.totalRounds,
    roundDurationSec: input.roundDurationSec,
    roundStatus: "waiting",
    roundEndTime: null,
    createdAt: now(),
  };

  db.sessions.set(sessionId, session);
  db.roomCodeToSessionId.set(roomCode, sessionId);
  db.playersBySession.set(sessionId, new Map());
  db.ordersBySession.set(sessionId, new Map());
  db.tradesBySession.set(sessionId, new Map());
  db.roundsBySession.set(sessionId, new Map());

  return { session, adminUser };
}

export function getSessionById(sessionId: UUID): GameSession | undefined {
  return db.sessions.get(sessionId);
}

export function getSessionByRoomCode(roomCode: string): GameSession | undefined {
  const id = db.roomCodeToSessionId.get(roomCode);
  return id ? db.sessions.get(id) : undefined;
}

export function joinSession(input: JoinSessionInput, userIdOverride?: UUID): JoinSessionResponse {
  const session = getSessionByRoomCode(input.roomCode);
  if (!session) throw new Error("Session not found");

  const user: User = { id: userIdOverride ?? randomUUID(), displayName: input.displayName, role: "player" };
  db.users.set(user.id, user);

  const players = db.playersBySession.get(session.id)!;
  const player: PlayerState = {
    id: db.playerIdCounter++,
    sessionId: session.id,
    userId: user.id,
    cashBalance: session.startingCash,
    sharesHeld: 0, // Start with 0 shares
  };
  players.set(player.id, player);

  return { session, user, player };
}

function getPlayerByUser(sessionId: UUID, userId: UUID): PlayerState | undefined {
  const players = db.playersBySession.get(sessionId);
  if (!players) return undefined;
  for (const p of players.values()) if (p.userId === userId) return p;
  return undefined;
}

function getOpenOrders(sessionId: UUID): Order[] {
  const orders = db.ordersBySession.get(sessionId);
  if (!orders) return [];
  return [...orders.values()].filter((o) => o.status === "open");
}



export function placeOrder(input: PlaceOrderInput): { order: Order } {
  const session = db.sessions.get(input.sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status !== "active") throw new Error("Session is not active");
  if (session.roundStatus !== "active") throw new Error("Orders can only be placed during active rounds");

  const player = getPlayerByUser(input.sessionId, input.userId);
  if (!player) throw new Error("Player not found in session");

  // Check if player already has an order for this round
  const existingOrders = getOpenOrders(input.sessionId).filter(o => 
    o.playerId === player.id && o.roundNumber === session.currentRound
  );
  if (existingOrders.length > 0) {
    throw new Error("Only one order per round allowed");
  }

  // constraints
  if (input.type === "buy") {
    const cost = input.price * input.quantity;
    if (cost > player.cashBalance) throw new Error("Insufficient cash balance");
    if (player.sharesHeld + input.quantity > session.maxShares)
      throw new Error("Max share holding exceeded");
  } else {
    if (input.quantity > player.sharesHeld) throw new Error("Insufficient shares to sell");
  }

  const order: Order = {
    id: db.orderIdCounter++,
    sessionId: input.sessionId,
    playerId: player.id,
    type: input.type,
    price: input.price,
    quantity: input.quantity,
    status: "open",
    roundNumber: session.currentRound,
    createdAt: now(),
  };
  db.ordersBySession.get(input.sessionId)!.set(order.id, order);

  return { order };
}

export function cancelOrder(input: CancelOrderInput): { order: Order } {
  const session = db.sessions.get(input.sessionId);
  if (!session) throw new Error("Session not found");
  const player = getPlayerByUser(input.sessionId, input.userId);
  if (!player) throw new Error("Player not found in session");
  const orders = db.ordersBySession.get(input.sessionId)!;
  const order = orders.get(input.orderId);
  if (!order) throw new Error("Order not found");
  if (order.playerId !== player.id) throw new Error("Cannot cancel others' orders");
  if (order.status !== "open") throw new Error("Order not open");
  order.status = "cancelled";
  return { order };
}

export function getOrderBook(sessionId: UUID): OrderBookSnapshot {
  const open = getOpenOrders(sessionId);
  const bids = open
    .filter((o) => o.type === "buy")
    .sort((a, b) => (a.price === b.price ? a.createdAt - b.createdAt : b.price - a.price));
  const asks = open
    .filter((o) => o.type === "sell")
    .sort((a, b) => (a.price === b.price ? a.createdAt - b.createdAt : a.price - b.price));

  function aggregate(levels: Order[]): { price: number; quantity: number }[] {
    const map = new Map<number, number>();
    for (const o of levels) map.set(o.price, (map.get(o.price) ?? 0) + o.quantity);
    const arr = [...map.entries()].map(([price, quantity]) => ({ price, quantity }));
    return arr.sort((a, b) => (levels === bids ? b.price - a.price : a.price - b.price));
  }

  return { bids: aggregate(bids), asks: aggregate(asks) };
}

export function getLeaderboard(sessionId: UUID): LeaderboardEntry[] {
  const session = db.sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  const players = db.playersBySession.get(sessionId)!;
  const lastPrice = session.lastTradedPrice ?? session.currentPrice ?? 0;
  const out: LeaderboardEntry[] = [];
  
  for (const p of players.values()) {
    const user = db.users.get(p.userId)!;
    const currentValue = p.cashBalance + p.sharesHeld * lastPrice;
    const initialValue = session.startingCash + 100 * lastPrice; // Starting cash + 100 shares at current price
    const totalPnL = currentValue - initialValue;
    
    // Calculate round P&L (simplified - could be more sophisticated)
    const roundPnL = session.currentRound > 0 ? totalPnL / session.currentRound : 0;
    
    out.push({ 
      userId: user.id, 
      displayName: user.displayName, 
      netWorth: currentValue, 
      cashBalance: p.cashBalance, 
      sharesHeld: p.sharesHeld,
      totalPnL,
      roundPnL
    });
  }
  return out.sort((a, b) => b.netWorth - a.netWorth);
}

export function setSessionStatus(sessionId: UUID, status: GameSession["status"]) {
  const session = db.sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  session.status = status;
}

export function setCurrentPrice(sessionId: UUID, price: number) {
  const session = db.sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  session.currentPrice = price;
}

export function startRound(sessionId: UUID): { round: Round } {
  const session = db.sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status !== "active") throw new Error("Session is not active");
  if (session.roundStatus !== "waiting") throw new Error("Round not in waiting state");
  if (session.currentRound >= session.totalRounds) throw new Error("All rounds completed");

  session.currentRound++;
  session.roundStatus = "active";
  session.roundEndTime = now() + session.roundDurationSec * 1000;

  const round: Round = {
    id: db.roundIdCounter++,
    sessionId,
    roundNumber: session.currentRound,
    status: "active",
    startTime: now(),
    endTime: null,
    executionPrice: null,
    orders: [],
  };

  db.roundsBySession.get(sessionId)!.set(round.id, round);
  return { round };
}

export function endRound(sessionId: UUID, executionPrice: number): { round: Round; trades: Trade[] } {
  const session = db.sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.roundStatus !== "active") throw new Error("Round not active");

  session.roundStatus = "executing";
  const round = db.roundsBySession.get(sessionId)!.get(session.currentRound);
  if (!round) throw new Error("Round not found");

  round.status = "executing";
  round.endTime = now();
  round.executionPrice = executionPrice;

  // Execute all orders at the execution price with time priority
  const roundOrders = getOpenOrders(sessionId).filter(o => o.roundNumber === session.currentRound);
  const trades = executeRoundOrders(sessionId, roundOrders, executionPrice);

  round.status = "completed";
  session.roundStatus = session.currentRound >= session.totalRounds ? "completed" : "waiting";
  session.lastTradedPrice = executionPrice;

  return { round, trades };
}

function executeRoundOrders(sessionId: UUID, orders: Order[], executionPrice: number): Trade[] {
  const session = db.sessions.get(sessionId)!;
  const players = db.playersBySession.get(sessionId)!;
  const trades = db.tradesBySession.get(sessionId)!;
  const executedTrades: Trade[] = [];

  // Sort by time priority (earliest first)
  const sortedOrders = [...orders].sort((a, b) => a.createdAt - b.createdAt);
  
  const buyOrders = sortedOrders.filter(o => o.type === "buy");
  const sellOrders = sortedOrders.filter(o => o.type === "sell");

  let buyIndex = 0;
  let sellIndex = 0;

  while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
    const buyOrder = buyOrders[buyIndex];
    const sellOrder = sellOrders[sellIndex];

    const quantity = Math.min(buyOrder.quantity, sellOrder.quantity);
    
    // Execute trade at execution price
    const buyPlayer = players.get(buyOrder.playerId)!;
    const sellPlayer = players.get(sellOrder.playerId)!;

    const cost = executionPrice * quantity;
    buyPlayer.cashBalance -= cost;
    buyPlayer.sharesHeld += quantity;
    sellPlayer.cashBalance += cost;
    sellPlayer.sharesHeld -= quantity;

    const trade: Trade = {
      id: db.tradeIdCounter++,
      sessionId,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      price: executionPrice,
      quantity,
      roundNumber: session.currentRound,
      createdAt: now(),
    };

    trades.set(trade.id, trade);
    executedTrades.push(trade);

    // Update order quantities
    buyOrder.quantity -= quantity;
    sellOrder.quantity -= quantity;

    if (buyOrder.quantity === 0) {
      buyOrder.status = "filled";
      buyIndex++;
    }
    if (sellOrder.quantity === 0) {
      sellOrder.status = "filled";
      sellIndex++;
    }
  }

  // Mark remaining orders as cancelled
  [...buyOrders.slice(buyIndex), ...sellOrders.slice(sellIndex)].forEach(order => {
    order.status = "cancelled";
  });

  return executedTrades;
}

export function getSessionState(sessionId: UUID): GameSession {
  const s = db.sessions.get(sessionId);
  if (!s) throw new Error("Session not found");
  return s;
}

export function getPlayerView(sessionId: UUID, userId: UUID) {
  const player = getPlayerByUser(sessionId, userId);
  if (!player) throw new Error("Player not found in session");
  const orders = db.ordersBySession.get(sessionId)!;
  const myOrders = [...orders.values()].filter((o) => o.playerId === player.id);
  return {
    player,
    openOrders: myOrders.filter((o) => o.status === "open"),
    closedOrders: myOrders.filter((o) => o.status !== "open"),
  };
}


