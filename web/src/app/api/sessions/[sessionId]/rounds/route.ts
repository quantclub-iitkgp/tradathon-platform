import { NextRequest, NextResponse } from "next/server";
import { getRoundHistory } from "@/lib/store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  
  try {
    const rounds = getRoundHistory(sessionId);
    return NextResponse.json(rounds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

