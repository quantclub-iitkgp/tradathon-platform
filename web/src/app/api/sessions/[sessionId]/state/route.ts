import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const s = getSessionState(params.sessionId);
    return NextResponse.json(s);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 404 });
  }
}


