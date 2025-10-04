import { NextResponse } from "next/server";
import { getPuzzle, submitPuzzleAnswer, upsertPuzzle, setSessionStatus, setCurrentPrice } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const p = getPuzzle(params.sessionId);
    return NextResponse.json(p ?? null);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const body = (await req.json()) as { question?: string; answer?: string; userId?: string; submitAnswer?: string; setPrice?: number; start?: boolean; pause?: boolean; end?: boolean };
    if (body.question && body.answer) {
      upsertPuzzle(params.sessionId, body.question, body.answer);
      return NextResponse.json({ ok: true });
    }
    if (typeof body.setPrice === "number") {
      setCurrentPrice(params.sessionId, body.setPrice);
      return NextResponse.json({ ok: true });
    }
    if (body.start) {
      setSessionStatus(params.sessionId, "active");
      return NextResponse.json({ ok: true });
    }
    if (body.pause) {
      setSessionStatus(params.sessionId, "paused");
      return NextResponse.json({ ok: true });
    }
    if (body.end) {
      setSessionStatus(params.sessionId, "ended");
      return NextResponse.json({ ok: true });
    }
    if (body.userId && typeof body.submitAnswer === "string") {
      const res = submitPuzzleAnswer(params.sessionId, body.userId, body.submitAnswer);
      return NextResponse.json(res);
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 400 });
  }
}


