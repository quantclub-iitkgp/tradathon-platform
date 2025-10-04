import { NextResponse } from "next/server";
import { joinSession } from "@/lib/store";
import { requireUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { roomCode: string } }
) {
  try {
    await requireUser();
    const { displayName } = (await req.json()) as { displayName: string };
    if (!displayName) return NextResponse.json({ error: "displayName required" }, { status: 400 });
    const user = await requireUser();
    const result = joinSession({ roomCode: params.roomCode, displayName }, user.uid);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to join" }, { status: 500 });
  }
}


