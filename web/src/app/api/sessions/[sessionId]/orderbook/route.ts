import { NextResponse } from "next/server";
import { getOrderBook } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const ob = await getOrderBook(sessionId);
    return NextResponse.json(ob);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}


