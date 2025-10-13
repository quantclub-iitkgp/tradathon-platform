import { NextResponse } from "next/server";
import { getDetailedOrderBook } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const detailedOrderBook = await getDetailedOrderBook(sessionId);
    return NextResponse.json(detailedOrderBook);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
