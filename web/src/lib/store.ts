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
  OrderStatus,
  OrderType,
  PlaceOrderInput,
  PlayerState,
  Puzzle,
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
  puzzlesBySession: Map<UUID, Puzzle | undefined>;
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
  puzzlesBySession: new Map(),
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

export function createSession(input: CreateSessionInput): CreateSessionResponse {
  const adminUser: User = {
    id: randomUUID(),
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
    createdAt: now(),
  };

  db.sessions.set(sessionId, session);
  db.roomCodeToSessionId.set(roomCode, sessionId);
  db.playersBySession.set(sessionId, new Map());
  db.ordersBySession.set(sessionId, new Map());
  db.tradesBySession.set(sessionId, new Map());
  db.puzzlesBySession.set(sessionId, undefined);

  return { session, adminUser };
}

export function getSessionById(sessionId: UUID): GameSession | undefined {
  return db.sessions.get(sessionId);
}

export function getSessionByRoomCode(roomCode: string): GameSession | undefined {
  const id = db.roomCodeToSessionId.get(roomCode);
  return id ? db.sessions.get(id) : undefined;
}

export function joinSession(input: JoinSessionInput): JoinSessionResponse {
  const session = getSessionByRoomCode(input.roomCode);
  if (!session) throw new Error("Session not found");

  const user: User = { id: randomUUID(), displayName: input.displayName, role: "player" };
  db.users.set(user.id, user);

  const players = db.playersBySession.get(session.id)!;
  const player: PlayerState = {
    id: db.playerIdCounter++,
    sessionId: session.id,
    userId: user.id,
    cashBalance: session.startingCash,
    sharesHeld: 0,
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

function sortOrdersForMatching(orders: Order[], type: OrderType): Order[] {
  return [...orders].sort((a, b) => {
    if (a.price === b.price) return a.createdAt - b.createdAt; // FIFO
    return type === "buy" ? b.price - a.price : a.price - b.price; // price priority
  });
}

function tryMatch(session: GameSession) {
  const allOpen = getOpenOrders(session.id);
  const bids = sortOrdersForMatching(allOpen.filter((o) => o.type === "buy"), "buy");
  const asks = sortOrdersForMatching(allOpen.filter((o) => o.type === "sell"), "sell");
  if (bids.length === 0 || asks.length === 0) return;

  const ordersMap = db.ordersBySession.get(session.id)!;
  const players = db.playersBySession.get(session.id)!;
  const trades = db.tradesBySession.get(session.id)!;

  let i = 0;
  let j = 0;
  while (i < bids.length && j < asks.length) {
    const buy = ordersMap.get(bids[i].id)!;
    const sell = ordersMap.get(asks[j].id)!;
    if (buy.status !== "open" || sell.status !== "open") {
      if (buy.status !== "open") i++;
      if (sell.status !== "open") j++;
      continue;
    }
    if (buy.price < sell.price) break; // no cross

    const quantity = Math.min(buy.quantity, sell.quantity);
    const price = sell.createdAt <= buy.createdAt ? sell.price : buy.price; // simple tie-breaker, could use mid or last

    // settle
    const buyPlayer = players.get(buy.playerId)!;
    const sellPlayer = players.get(sell.playerId)!;
    buyPlayer.cashBalance -= price * quantity;
    buyPlayer.sharesHeld += quantity;
    sellPlayer.cashBalance += price * quantity;
    sellPlayer.sharesHeld -= quantity;

    const trade: Trade = {
      id: db.tradeIdCounter++,
      sessionId: session.id,
      buyOrderId: buy.id,
      sellOrderId: sell.id,
      price,
      quantity,
      createdAt: now(),
    };
    trades.set(trade.id, trade);
    session.lastTradedPrice = price;

    buy.quantity -= quantity;
    sell.quantity -= quantity;
    if (buy.quantity === 0) buy.status = "filled";
    if (sell.quantity === 0) sell.status = "filled";

    if (buy.status !== "open") i++;
    if (sell.status !== "open") j++;
  }
}

export function placeOrder(input: PlaceOrderInput): { order: Order } {
  const session = db.sessions.get(input.sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status !== "active") throw new Error("Session is not active");

  const player = getPlayerByUser(input.sessionId, input.userId);
  if (!player) throw new Error("Player not found in session");

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
    createdAt: now(),
  };
  db.ordersBySession.get(input.sessionId)!.set(order.id, order);

  tryMatch(session);

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
    const netWorth = p.cashBalance + p.sharesHeld * lastPrice;
    out.push({ userId: user.id, displayName: user.displayName, netWorth, cashBalance: p.cashBalance, sharesHeld: p.sharesHeld });
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

export function upsertPuzzle(sessionId: UUID, question: string, answer: string, advanceSeconds = 10) {
  const puzzle: Puzzle = {
    id: 1,
    sessionId,
    question,
    answer,
    isActive: true,
    solvedByUserId: undefined,
    priceUnlockTime: now() + advanceSeconds * 1000,
  };
  db.puzzlesBySession.set(sessionId, puzzle);
}

export function getPuzzle(sessionId: UUID): Puzzle | undefined {
  return db.puzzlesBySession.get(sessionId);
}

export function submitPuzzleAnswer(sessionId: UUID, userId: UUID, provided: string) {
  const p = db.puzzlesBySession.get(sessionId);
  if (!p || !p.isActive) return { correct: false };
  if (p.solvedByUserId) return { correct: false };
  const ok = p.answer.trim().toLowerCase() === provided.trim().toLowerCase();
  if (ok) p.solvedByUserId = userId;
  return { correct: ok };
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


