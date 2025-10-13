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
  return await dbStore.placeOrder(input);
}

export async function cancelOrder(input: CancelOrderInput): Promise<{ order: Order }> {
  return await dbStore.cancelOrder(input);
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
}

export async function setCurrentPrice(sessionId: UUID, price: number) {
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { current_price: price },
  });
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

  return { round };
}

export async function endRound(sessionId: UUID, executionPrice: number): Promise<{ round: Round; trades: Trade[] }> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  
  if (!session) throw new Error("Session not found");
  if (session.round_status !== "active") throw new Error("Round not active");

  // Update session status
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      round_status: session.current_round >= session.total_rounds ? "completed" : "waiting",
      last_traded_price: executionPrice,
    },
  });

  // For now, return a simple round object
  // TODO: Implement full trade execution logic
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

  return { round, trades: [] };
}


export async function getSessionState(sessionId: UUID): Promise<GameSession> {
  return await dbStore.getSessionState(sessionId);
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


