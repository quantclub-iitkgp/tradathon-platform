import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const lb = getLeaderboard(sessionId);
    return NextResponse.json(lb);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}


