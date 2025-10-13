import { NextResponse } from "next/server";
import { cancelOrder } from "@/lib/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string; orderId: string }> }
) {
  try {
    const { sessionId, orderId } = await params;
    const { userId } = (await req.json()) as { userId: string };
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const result = await cancelOrder({ sessionId, userId, orderId: Number(orderId) });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to cancel" }, { status: 400 });
  }
}


