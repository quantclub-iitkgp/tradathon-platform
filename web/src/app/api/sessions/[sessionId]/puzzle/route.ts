import { NextResponse } from "next/server";
import { startRound, endRound, setSessionStatus, setCurrentPrice, toggleRoundToIpo } from "@/lib/store";

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const body = (await req.json()) as { 
      setPrice?: number; 
      start?: boolean; 
      pause?: boolean; 
      end?: boolean;
      startRound?: boolean;
      endRound?: boolean;
      executionPrice?: number;
      toggleIpo?: boolean;
      expectedPrice?: number;
    };
    
    if (typeof body.setPrice === "number") {
      await setCurrentPrice(sessionId, body.setPrice);
      return NextResponse.json({ ok: true });
    }
    if (body.start) {
      await setSessionStatus(sessionId, "active");
      return NextResponse.json({ ok: true });
    }
    if (body.pause) {
      await setSessionStatus(sessionId, "paused");
      return NextResponse.json({ ok: true });
    }
    if (body.end) {
      await setSessionStatus(sessionId, "ended");
      return NextResponse.json({ ok: true });
    }
    if (body.startRound) {
      const result = await startRound(sessionId);
      return NextResponse.json(result);
    }
    if (body.endRound && typeof body.executionPrice === "number") {
      const result = await endRound(sessionId, body.executionPrice);
      return NextResponse.json(result);
    }
    if (body.toggleIpo && typeof body.expectedPrice === "number") {
      const result = await toggleRoundToIpo(sessionId, body.expectedPrice);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}


