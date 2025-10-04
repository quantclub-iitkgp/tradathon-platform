import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const lb = getLeaderboard(params.sessionId);
    return NextResponse.json(lb);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 500 });
  }
}


