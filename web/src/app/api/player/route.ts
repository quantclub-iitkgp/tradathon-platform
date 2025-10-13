import { NextResponse } from "next/server";
import { getPlayerView } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const userId = searchParams.get("userId");
  if (!sessionId || !userId) return NextResponse.json({ error: "Missing params" }, { status: 400 });
  try {
    const pv = await getPlayerView(sessionId, userId);
    return NextResponse.json(pv);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}


