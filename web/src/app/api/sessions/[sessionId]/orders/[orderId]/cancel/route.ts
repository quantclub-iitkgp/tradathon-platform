import { NextResponse } from "next/server";
import { cancelOrder } from "@/lib/store";

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string; orderId: string } }
) {
  try {
    const { userId } = (await req.json()) as { userId: string };
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const result = cancelOrder({ sessionId: params.sessionId, userId, orderId: Number(params.orderId) });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to cancel" }, { status: 400 });
  }
}


