import { NextResponse } from "next/server";
import { placeOrder } from "@/lib/store";
import { OrderType } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId, type, price, quantity } = (await req.json()) as {
      userId: string;
      type: OrderType;
      price: number;
      quantity: number;
    };
    if (!userId || !type || !price || !quantity) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const result = placeOrder({ sessionId: params.sessionId, userId, type, price, quantity });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to place order" }, { status: 400 });
  }
}


