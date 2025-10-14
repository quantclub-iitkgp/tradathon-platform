import { NextResponse } from "next/server";
import { startIpoRound, executeIpoRound, toggleRoundToIpo } from "@/lib/store";

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const body = (await req.json()) as { 
      toggle?: boolean;
      expectedPrice?: number;
      executionPrice?: number;
      isActive?: boolean;
      toggleIpo?: boolean;
    };
    
    if (body.toggleIpo && typeof body.expectedPrice === "number") {
      // Toggle between IPO and regular round
      const result = await toggleRoundToIpo(sessionId, body.expectedPrice);
      return NextResponse.json(result);
    }
    
    if (body.toggle && typeof body.expectedPrice === "number") {
      // Start IPO round (legacy support)
      const result = await startIpoRound(sessionId, body.expectedPrice);
      return NextResponse.json(result);
    }
    
    if (typeof body.executionPrice === "number") {
      // Execute IPO round
      const result = await executeIpoRound(sessionId, body.executionPrice);
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
