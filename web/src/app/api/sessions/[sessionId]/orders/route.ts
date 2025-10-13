import { NextResponse } from "next/server";
import { placeOrder } from "@/lib/store";
import { OrderType } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { userId, type, price, quantity } = (await req.json()) as {
      userId: string;
      type: OrderType;
      price: number;
      quantity: number;
    };
    if (!userId || !type || price === undefined || price === null || !quantity) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const result = await placeOrder({ sessionId, userId, type, price, quantity });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to place order" }, { status: 400 });
  }
}


