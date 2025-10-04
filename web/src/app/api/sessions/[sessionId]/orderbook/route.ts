import { NextResponse } from "next/server";
import { getOrderBook } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const ob = getOrderBook(params.sessionId);
    return NextResponse.json(ob);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 500 });
  }
}


