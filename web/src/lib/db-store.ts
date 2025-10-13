import { prisma } from "./prisma";
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
  Trade,
  User,
  UUID,
} from "./types";
import { randomUUID } from "crypto";
import { User as PrismaUser, GameSession as PrismaGameSession, Player as PrismaPlayer, Order as PrismaOrder } from "@prisma/client";

// Helper function to convert Prisma types to our types
function convertPrismaUser(user: PrismaUser): User {
  return {
    id: user.id,
    displayName: user.display_name || "",
    role: user.role,
  };
}

function convertPrismaGameSession(session: PrismaGameSession): GameSession {
  return {
    id: session.id,
    adminId: session.admin_id,
    roomCode: session.room_code,
    status: session.status,
    startingCash: Number(session.starting_cash),
    maxShares: session.max_shares,
    sessionDurationSec: session.session_duration,
    currentPrice: session.current_price ? Number(session.current_price) : null,
    lastTradedPrice: session.last_traded_price ? Number(session.last_traded_price) : null,
    currentRound: session.current_round || 0,
    totalRounds: session.total_rounds || 0,
    roundDurationSec: session.round_duration_sec || 60,
    roundStatus: (session.round_status as "waiting" | "active" | "executing" | "completed" | "ipo_active") || "waiting",
    roundEndTime: session.round_end_time ? new Date(session.round_end_time).getTime() : null,
    createdAt: new Date(session.created_at).getTime(),
  };
}

function convertPrismaPlayer(player: PrismaPlayer): PlayerState {
  return {
    id: Number(player.id),
    sessionId: player.session_id,
    userId: player.user_id,
    cashBalance: Number(player.cash_balance),
    sharesHeld: player.shares_held,
  };
}

function convertPrismaOrder(order: PrismaOrder): Order {
  return {
    id: Number(order.id),
    sessionId: order.session_id,
    playerId: Number(order.player_id),
    type: order.type,
    price: Number(order.price),
    quantity: order.quantity,
    status: order.status,
    roundNumber: order.round_number || 0,
    createdAt: new Date(order.created_at).getTime(),
  };
}


function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function createSession(input: CreateSessionInput, adminIdOverride?: UUID): Promise<CreateSessionResponse> {
  // Validate and generate UUID if needed
  const adminId = adminIdOverride && isValidUUID(adminIdOverride) ? adminIdOverride : randomUUID();
  
  const adminUser = await prisma.user.create({
    data: {
      id: adminId,
      display_name: input.adminDisplayName,
      role: "admin",
    },
  });

  const roomCode = generateRoomCode();
  
  // Check if room code already exists
  const existingSession = await prisma.gameSession.findUnique({
    where: { room_code: roomCode },
  });
  
  if (existingSession) {
    // Recursively generate new room code if collision
    return createSession(input, adminIdOverride);
  }

  const session = await prisma.gameSession.create({
    data: {
      admin_id: adminUser.id,
      room_code: roomCode,
      status: "lobby",
      starting_cash: input.startingCash,
      max_shares: input.maxShares,
      session_duration: input.sessionDurationSec,
      current_round: 0,
      total_rounds: input.totalRounds,
      round_duration_sec: input.roundDurationSec,
      round_status: "ipo_active",
      current_price: 100, // Default IPO price for round 0
    },
  });

  return {
    session: convertPrismaGameSession(session),
    adminUser: convertPrismaUser(adminUser),
  };
}

export async function getSessionById(sessionId: UUID): Promise<GameSession | undefined> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  
  return session ? convertPrismaGameSession(session) : undefined;
}

export async function getSessionByRoomCode(roomCode: string): Promise<GameSession | undefined> {
  const session = await prisma.gameSession.findUnique({
    where: { room_code: roomCode },
  });
  
  return session ? convertPrismaGameSession(session) : undefined;
}

export async function joinSession(input: JoinSessionInput): Promise<JoinSessionResponse> {
  const session = await prisma.gameSession.findUnique({
    where: { room_code: input.roomCode },
  });
  
  if (!session) throw new Error("Session not found");
  if (session.status === "ended") throw new Error("Session has ended");

  // Create or get user
  let user = await prisma.user.findFirst({
    where: { display_name: input.displayName },
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        display_name: input.displayName,
        role: "player",
      },
    });
  }

  // Check if player already exists in session
  const existingPlayer = await prisma.player.findFirst({
    where: {
      session_id: session.id,
      user_id: user.id,
    },
  });

  let player;
  if (existingPlayer) {
    player = existingPlayer;
  } else {
    // All new players start with the same starting cash and 0 shares, regardless of when they join
    player = await prisma.player.create({
      data: {
        session_id: session.id,
        user_id: user.id,
        cash_balance: session.starting_cash,
        shares_held: 0,
      },
    });
  }

  return {
    session: convertPrismaGameSession(session),
    user: convertPrismaUser(user),
    player: convertPrismaPlayer(player),
  };
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ order: Order }> {
  const session = await prisma.gameSession.findUnique({
    where: { id: input.sessionId },
  });
  
  if (!session) throw new Error("Session not found");
  if (session.status !== "active") throw new Error("Session is not active");
  if (session.round_status !== "active" && session.round_status !== "ipo_active") throw new Error("Orders can only be placed during active rounds");

  const player = await prisma.player.findFirst({
    where: {
      session_id: input.sessionId,
      user_id: input.userId,
    },
  });
  
  if (!player) throw new Error("Player not found in session");

  // Check if player already has an order for this round
  const existingOrder = await prisma.order.findFirst({
    where: {
      session_id: input.sessionId,
      player_id: player.id,
      round_number: session.current_round,
      status: "open",
    },
  });
  
  if (existingOrder) {
    throw new Error("Only one order per round allowed");
  }

  // Validate constraints
  if (input.type === "buy") {
    const estimatedCost = (Number(session.current_price) || 100) * input.quantity;
    if (estimatedCost > Number(player.cash_balance)) {
      throw new Error("Insufficient cash balance");
    }
    if (player.shares_held + input.quantity > session.max_shares) {
      throw new Error("Max share holding exceeded");
    }
  } else {
    if (input.quantity > player.shares_held) {
      throw new Error("Insufficient shares to sell");
    }
  }

  const order = await prisma.order.create({
    data: {
      session_id: input.sessionId,
      player_id: player.id,
      type: input.type,
      price: input.price,
      quantity: input.quantity,
      status: "open",
      round_number: session.current_round,
    },
  });

  return { order: convertPrismaOrder(order) };
}

export async function cancelOrder(input: CancelOrderInput): Promise<{ order: Order }> {
  const player = await prisma.player.findFirst({
    where: {
      session_id: input.sessionId,
      user_id: input.userId,
    },
  });
  
  if (!player) throw new Error("Player not found in session");

  const order = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      player_id: player.id,
      status: "open",
    },
  });
  
  if (!order) throw new Error("Order not found or not open");

  const updatedOrder = await prisma.order.update({
    where: { id: input.orderId },
    data: { status: "cancelled" },
  });

  return { order: convertPrismaOrder(updatedOrder) };
}

export async function getOpenOrders(sessionId: UUID): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    where: {
      session_id: sessionId,
      status: "open",
    },
  });
  
  return orders.map(convertPrismaOrder);
}

export async function getOrderBook(sessionId: UUID): Promise<OrderBookSnapshot> {
  const orders = await getOpenOrders(sessionId);
  
  const bids = orders
    .filter((o) => o.type === "buy")
    .sort((a, b) => (a.price === b.price ? a.createdAt - b.createdAt : b.price - a.price));
  const asks = orders
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

export async function getDetailedOrderBook(sessionId: UUID) {
  const orders = await prisma.order.findMany({
    where: {
      session_id: sessionId,
      status: "open",
    },
    include: {
      player: {
        include: {
          user: true,
        },
      },
    },
  });
  
  const bids = orders
    .filter((o) => o.type === "buy")
    .sort((a, b) => (Number(a.price) === Number(b.price) ? a.created_at.getTime() - b.created_at.getTime() : Number(b.price) - Number(a.price)));
  const asks = orders
    .filter((o) => o.type === "sell")
    .sort((a, b) => (Number(a.price) === Number(b.price) ? a.created_at.getTime() - b.created_at.getTime() : Number(a.price) - Number(b.price)));

  function enrichOrders(orders: (PrismaOrder & { player: { user: PrismaUser } })[]) {
    return orders.map(order => ({
      id: Number(order.id),
      price: Number(order.price),
      quantity: order.quantity,
      createdAt: order.created_at.getTime(),
      playerName: order.player.user.display_name,
    }));
  }

  return {
    bids: enrichOrders(bids),
    asks: enrichOrders(asks),
  };
}

export async function getLeaderboard(sessionId: UUID): Promise<LeaderboardEntry[]> {
  const players = await prisma.player.findMany({
    where: { session_id: sessionId },
    include: {
      user: true,
    },
  });

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return [];

  const currentPrice = Number(session.current_price) || 100;

  return players.map((player) => {
    const netWorth = Number(player.cash_balance) + (player.shares_held * currentPrice);
    const totalPnL = netWorth - Number(session.starting_cash);
    
    return {
      userId: player.user_id,
      displayName: player.user.display_name || "",
      netWorth,
      cashBalance: Number(player.cash_balance),
      sharesHeld: player.shares_held,
      totalPnL,
      roundPnL: 0, // This would need to be calculated based on round history
    };
  }).sort((a, b) => b.netWorth - a.netWorth);
}

export async function getPlayerView(sessionId: UUID, userId: UUID) {
  const player = await prisma.player.findFirst({
    where: {
      session_id: sessionId,
      user_id: userId,
    },
  });
  
  if (!player) throw new Error("Player not found in session");

  const orders = await prisma.order.findMany({
    where: {
      session_id: sessionId,
      player_id: player.id,
    },
  });

  const myOrders = orders.map(convertPrismaOrder);
  
  return {
    player: convertPrismaPlayer(player),
    openOrders: myOrders.filter((o) => o.status === "open"),
    closedOrders: myOrders.filter((o) => o.status !== "open"),
  };
}

export async function getTradesForSession(sessionId: UUID) {
  const trades = await prisma.trade.findMany({
    where: { session_id: sessionId },
    include: {
      buy_order: {
        include: {
          player: {
            include: {
              user: true,
            },
          },
        },
      },
      sell_order: {
        include: {
          player: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });
  
  return trades.map(trade => ({
    id: Number(trade.id),
    price: Number(trade.price),
    quantity: trade.quantity,
    roundNumber: trade.round_number || 0,
    createdAt: trade.created_at.getTime(),
    buyerName: trade.buy_order.player.user.display_name,
    sellerName: trade.sell_order.player.user.display_name,
  }));
}

export async function getRoundHistory(sessionId: UUID) {
  // Since we don't have a rounds table in the current schema,
  // we'll derive this from trades and session data
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  
  if (!session) return [];
  
  const rounds = [];
  for (let i = 1; i <= session.current_round; i++) {
    const roundTrades = await prisma.trade.findMany({
      where: {
        session_id: sessionId,
        round_number: i,
      },
    });
    
    if (roundTrades.length > 0) {
      rounds.push({
        id: i,
        roundNumber: i,
        status: "completed",
        startTime: 0, // Would need to track this
        endTime: roundTrades[0].created_at.getTime(),
        executionPrice: Number(roundTrades[0].price),
      });
    }
  }
  
  return rounds;
}

export async function getSessionState(sessionId: UUID): Promise<GameSession> {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error("Session not found");
  return session;
}

export async function startIpoRound(sessionId: UUID, expectedPrice: number): Promise<{ success: boolean }> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  
  if (!session) throw new Error("Session not found");
  if (session.status !== "active") throw new Error("Session is not active");
  if (session.round_status !== "waiting") throw new Error("Round not in waiting state");

  // Set IPO round status and expected price
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      round_status: "ipo_active",
      current_price: expectedPrice,
    },
  });

  return { success: true };
}

export async function executeIpoRound(sessionId: UUID, executionPrice: number): Promise<{ trades: Trade[] }> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  
  if (!session) throw new Error("Session not found");
  if (session.round_status !== "ipo_active") throw new Error("IPO round not active");

  // Get all open orders for IPO round
  const orders = await prisma.order.findMany({
    where: {
      session_id: sessionId,
      status: "open",
    },
    include: {
      player: true,
    },
  });

  const trades: Trade[] = [];
  
  // Execute all buy orders at execution price
  for (const order of orders) {
    if (order.type === "buy") {
      const cost = executionPrice * order.quantity;
      
      // Update player cash and shares
      await prisma.player.update({
        where: { id: order.player_id },
        data: {
          cash_balance: Number(order.player.cash_balance) - cost,
          shares_held: order.player.shares_held + order.quantity,
        },
      });
      
      // Mark order as filled
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "filled" },
      });
      
      // Create trade record
      const trade = await prisma.trade.create({
        data: {
          session_id: sessionId,
          buy_order_id: order.id,
          sell_order_id: order.id, // IPO trades have same order for buy/sell
          price: executionPrice,
          quantity: order.quantity,
          round_number: 1, // IPO is always round 1
        },
      });
      
      trades.push({
        id: Number(trade.id),
        sessionId: trade.session_id,
        buyOrderId: Number(trade.buy_order_id),
        sellOrderId: Number(trade.sell_order_id),
        price: Number(trade.price),
        quantity: trade.quantity,
        roundNumber: trade.round_number,
        createdAt: new Date(trade.created_at).getTime(),
      });
    }
  }

  // Update session to next round
  const nextRound = session.current_round + 1;
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      round_status: "waiting",
      current_round: nextRound,
      last_traded_price: executionPrice,
    },
  });

  return { trades };
}
