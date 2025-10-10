import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const s = getSessionState(sessionId);
    return NextResponse.json(s);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 404 });
  }
}


