import { NextResponse } from "next/server";
import { getSessionByRoomCode } from "@/lib/store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const session = await getSessionByRoomCode(roomCode);
    
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: session.status,
      currentPrice: session.currentPrice,
      startingCash: session.startingCash,
      currentRound: session.currentRound,
      totalRounds: session.totalRounds,
      roundStatus: session.roundStatus,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to get session info" }, { status: 500 });
  }
}
