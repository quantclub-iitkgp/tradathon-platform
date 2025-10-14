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
  Round,
  Trade,
  UUID,
} from "./types";
import * as dbStore from "./db-store";
import { prisma } from "./prisma";
import { wsService } from "./websocket-service";


export async function createSession(input: CreateSessionInput, adminIdOverride?: UUID): Promise<CreateSessionResponse> {
  return await dbStore.createSession(input, adminIdOverride);
}

export async function getSessionById(sessionId: UUID): Promise<GameSession | undefined> {
  return await dbStore.getSessionById(sessionId);
}

export async function getSessionByRoomCode(roomCode: string): Promise<GameSession | undefined> {
  return await dbStore.getSessionByRoomCode(roomCode);
}

export async function joinSession(input: JoinSessionInput): Promise<JoinSessionResponse> {
  return await dbStore.joinSession(input);
}





export async function placeOrder(input: PlaceOrderInput): Promise<{ order: Order }> {
  const result = await dbStore.placeOrder(input);
  
  // Emit WebSocket event for order placed
  wsService.emitOrderPlaced(input.sessionId, result.order);
  
  // Also emit session, leaderboard, and player updates
  const sessionState = await getSessionState(input.sessionId);
  const leaderboard = await getLeaderboard(input.sessionId);
  const playerView = await getPlayerView(input.sessionId, input.userId);
  
  wsService.emitSessionUpdate(input.sessionId, sessionState);
  wsService.emitLeaderboardUpdate(input.sessionId, leaderboard);
  wsService.emitPlayerUpdate(input.sessionId, playerView, input.userId);
  
  return result;
}

export async function cancelOrder(input: CancelOrderInput): Promise<{ order: Order }> {
  const result = await dbStore.cancelOrder(input);
  
  // Emit WebSocket event for order cancelled
  wsService.emitOrderCancelled(input.sessionId, result.order);
  
  // Also emit session, leaderboard, and player updates
  const sessionState = await getSessionState(input.sessionId);
  const leaderboard = await getLeaderboard(input.sessionId);
  const playerView = await getPlayerView(input.sessionId, input.userId);
  
  wsService.emitSessionUpdate(input.sessionId, sessionState);
  wsService.emitLeaderboardUpdate(input.sessionId, leaderboard);
  wsService.emitPlayerUpdate(input.sessionId, playerView, input.userId);
  
  return result;
}

export async function getOrderBook(sessionId: UUID): Promise<OrderBookSnapshot> {
  return await dbStore.getOrderBook(sessionId);
}

export async function getDetailedOrderBook(sessionId: UUID) {
  return await dbStore.getDetailedOrderBook(sessionId);
}

export async function getLeaderboard(sessionId: UUID): Promise<LeaderboardEntry[]> {
  return await dbStore.getLeaderboard(sessionId);
}

export async function setSessionStatus(sessionId: UUID, status: GameSession["status"]) {
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { status },
  });
  
  // Emit WebSocket event for session status update
  const sessionState = await getSessionState(sessionId);
  wsService.emitSessionUpdate(sessionId, sessionState);
}

export async function setCurrentPrice(sessionId: UUID, price: number) {
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { current_price: price },
  });
  
  // Emit WebSocket event for price update
  wsService.emitPriceUpdate(sessionId, { price, timestamp: Date.now() });
  
  // Also emit session update
  const sessionState = await getSessionState(sessionId);
  wsService.emitSessionUpdate(sessionId, sessionState);
}

export async function startRound(sessionId: UUID): Promise<{ round: Round }> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  
  if (!session) throw new Error("Session not found");
  if (session.status !== "active") throw new Error("Session is not active");
  if (session.round_status !== "waiting") throw new Error("Round not in waiting state");
  if (session.current_round >= session.total_rounds) throw new Error("All rounds completed");

  const newRound = session.current_round + 1;
  const roundEndTime = new Date(Date.now() + session.round_duration_sec * 1000);

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      round_status: "active",
      current_round: newRound,
      round_end_time: roundEndTime,
    },
  });

  const round: Round = {
    id: newRound,
    sessionId,
    roundNumber: newRound,
    status: "active",
    startTime: Date.now(),
    endTime: null,
    executionPrice: null,
    orders: [],
  };

  // Emit WebSocket event for round started
  wsService.emitRoundStarted(sessionId, round);
  
  // Also emit session update
  const sessionState = await getSessionState(sessionId);
  wsService.emitSessionUpdate(sessionId, sessionState);

  return { round };
}

export async function endRound(sessionId: UUID, executionPrice: number): Promise<{ round: Round; trades: Trade[] }> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  
  if (!session) throw new Error("Session not found");
  if (session.round_status !== "active" && session.round_status !== "ipo_active") {
    throw new Error("Round not active");
  }
  
  // If it's an IPO round, use IPO execution logic
  if (session.round_status === "ipo_active") {
    const { trades } = await dbStore.executeIpoRound(sessionId, executionPrice);
    const round: Round = {
      id: session.current_round,
      sessionId,
      roundNumber: session.current_round,
      status: "completed",
      startTime: 0,
      endTime: Date.now(),
      executionPrice,
      orders: [],
    };
    return { round, trades };
  }

  // Get all open orders for current round
  const orders = await prisma.order.findMany({
    where: {
      session_id: sessionId,
      status: "open",
      round_number: session.current_round,
    },
    include: {
      player: true,
    },
  });

  const trades: Trade[] = [];
  
  // Separate buy and sell orders
  const buyOrders = orders.filter(o => o.type === "buy");
  const sellOrders = orders.filter(o => o.type === "sell");
  
  // Sort orders by time priority (earliest first)
  buyOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  sellOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  // Match orders using two-pointer technique
  let buyIndex = 0;
  let sellIndex = 0;
  
  while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
    const buyOrder = buyOrders[buyIndex];
    const sellOrder = sellOrders[sellIndex];
    
    // Calculate trade quantity (minimum of both orders)
    const quantity = Math.min(buyOrder.quantity, sellOrder.quantity);
    
    // Execute trade at execution price
    const cost = executionPrice * quantity;
    
    // Update player balances
    await prisma.player.update({
      where: { id: buyOrder.player_id },
      data: {
        cash_balance: Number(buyOrder.player.cash_balance) - cost,
        shares_held: buyOrder.player.shares_held + quantity,
      },
    });
    
    await prisma.player.update({
      where: { id: sellOrder.player_id },
      data: {
        cash_balance: Number(sellOrder.player.cash_balance) + cost,
        shares_held: sellOrder.player.shares_held - quantity,
      },
    });
    
    // Create trade record
    const trade = await prisma.trade.create({
      data: {
        session_id: sessionId,
        buy_order_id: buyOrder.id,
        sell_order_id: sellOrder.id,
        price: executionPrice,
        quantity: quantity,
        round_number: session.current_round,
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
    
    // Update order quantities and check if filled
    const newBuyQuantity = buyOrder.quantity - quantity;
    const newSellQuantity = sellOrder.quantity - quantity;
    
    if (newBuyQuantity === 0) {
      await prisma.order.update({
        where: { id: buyOrder.id },
        data: { status: "filled" },
      });
      buyIndex++;
    } else {
      await prisma.order.update({
        where: { id: buyOrder.id },
        data: { quantity: newBuyQuantity },
      });
    }
    
    if (newSellQuantity === 0) {
      await prisma.order.update({
        where: { id: sellOrder.id },
        data: { status: "filled" },
      });
      sellIndex++;
    } else {
      await prisma.order.update({
        where: { id: sellOrder.id },
        data: { quantity: newSellQuantity },
      });
    }
  }
  
  // Mark remaining orders as cancelled
  const remainingBuyOrders = buyOrders.slice(buyIndex);
  const remainingSellOrders = sellOrders.slice(sellIndex);
  
  for (const order of [...remainingBuyOrders, ...remainingSellOrders]) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });
  }

  // Update session status
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      round_status: session.current_round >= session.total_rounds ? "completed" : "waiting",
      last_traded_price: executionPrice,
      current_price: executionPrice, // Also update current price for leaderboard
    },
  });

  const round: Round = {
    id: session.current_round,
    sessionId,
    roundNumber: session.current_round,
    status: "completed",
    startTime: 0,
    endTime: Date.now(),
    executionPrice,
    orders: [],
  };

  // Emit WebSocket events for round ended and trades executed
  wsService.emitRoundEnded(sessionId, round);
  for (const trade of trades) {
    wsService.emitTradeExecuted(sessionId, trade);
  }
  
  // Also emit session, leaderboard, and player updates
  const sessionState = await getSessionState(sessionId);
  const leaderboard = await getLeaderboard(sessionId);
  
  wsService.emitSessionUpdate(sessionId, sessionState);
  wsService.emitLeaderboardUpdate(sessionId, leaderboard);
  
  // Emit player updates for all affected players
  const affectedPlayers = new Set<string>();
  for (const trade of trades) {
    // Get player IDs from the trade
    const buyOrder = await prisma.order.findUnique({
      where: { id: trade.buyOrderId },
      include: { player: true }
    });
    const sellOrder = await prisma.order.findUnique({
      where: { id: trade.sellOrderId },
      include: { player: true }
    });
    
    if (buyOrder) affectedPlayers.add(buyOrder.player.user_id);
    if (sellOrder) affectedPlayers.add(sellOrder.player.user_id);
  }
  
  // Emit player updates for each affected player
  for (const userId of affectedPlayers) {
    const playerView = await getPlayerView(sessionId, userId);
    wsService.emitPlayerUpdate(sessionId, playerView, userId);
  }

  return { round, trades };
}


export async function getSessionState(sessionId: UUID): Promise<GameSession> {
  return await dbStore.getSessionState(sessionId);
}

export async function startIpoRound(sessionId: UUID, expectedPrice: number): Promise<{ success: boolean }> {
  return await dbStore.startIpoRound(sessionId, expectedPrice);
}

export async function executeIpoRound(sessionId: UUID, executionPrice: number): Promise<{ trades: Trade[] }> {
  const result = await dbStore.executeIpoRound(sessionId, executionPrice);
  
  // Emit WebSocket events for IPO round execution
  for (const trade of result.trades) {
    wsService.emitTradeExecuted(sessionId, trade);
  }
  
  // Also emit session, leaderboard, and player updates
  const sessionState = await getSessionState(sessionId);
  const leaderboard = await getLeaderboard(sessionId);
  
  wsService.emitSessionUpdate(sessionId, sessionState);
  wsService.emitLeaderboardUpdate(sessionId, leaderboard);
  
  // Emit player updates for all affected players in IPO
  const affectedPlayers = new Set<string>();
  for (const trade of result.trades) {
    // Get player IDs from the trade
    const buyOrder = await prisma.order.findUnique({
      where: { id: trade.buyOrderId },
      include: { player: true }
    });
    
    if (buyOrder) affectedPlayers.add(buyOrder.player.user_id);
  }
  
  // Emit player updates for each affected player
  for (const userId of affectedPlayers) {
    const playerView = await getPlayerView(sessionId, userId);
    wsService.emitPlayerUpdate(sessionId, playerView, userId);
  }
  
  return result;
}

export async function toggleRoundToIpo(sessionId: UUID, expectedPrice: number): Promise<{ success: boolean; trades?: Trade[] }> {
  const result = await dbStore.toggleRoundToIpo(sessionId, expectedPrice);
  
  // Emit WebSocket events for IPO toggle
  if (result.trades) {
    for (const trade of result.trades) {
      wsService.emitTradeExecuted(sessionId, trade);
    }
  }
  
  // Also emit session, leaderboard, and player updates
  const sessionState = await getSessionState(sessionId);
  const leaderboard = await getLeaderboard(sessionId);
  
  wsService.emitSessionUpdate(sessionId, sessionState);
  wsService.emitLeaderboardUpdate(sessionId, leaderboard);
  
  // Emit player updates for all affected players
  if (result.trades) {
    const affectedPlayers = new Set<string>();
    for (const trade of result.trades) {
      // Get player IDs from the trade
      const buyOrder = await prisma.order.findUnique({
        where: { id: trade.buyOrderId },
        include: { player: true }
      });
      const sellOrder = await prisma.order.findUnique({
        where: { id: trade.sellOrderId },
        include: { player: true }
      });
      
      if (buyOrder) affectedPlayers.add(buyOrder.player.user_id);
      if (sellOrder) affectedPlayers.add(sellOrder.player.user_id);
    }
    
    // Emit player updates for each affected player
    for (const userId of affectedPlayers) {
      const playerView = await getPlayerView(sessionId, userId);
      wsService.emitPlayerUpdate(sessionId, playerView, userId);
    }
  }
  
  return result;
}

export async function getPlayerView(sessionId: UUID, userId: UUID) {
  return await dbStore.getPlayerView(sessionId, userId);
}

export async function getTradesForSession(sessionId: UUID) {
  return await dbStore.getTradesForSession(sessionId);
}

export async function getRoundHistory(sessionId: UUID) {
  return await dbStore.getRoundHistory(sessionId);
}


