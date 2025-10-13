import { NextResponse } from "next/server";
import { joinSession } from "@/lib/store";
import { requireUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    await requireUser();
    const { roomCode } = await params;
    const { displayName } = (await req.json()) as { displayName: string };
    if (!displayName) return NextResponse.json({ error: "displayName required" }, { status: 400 });
    const result = await joinSession({ roomCode, displayName });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to join" }, { status: 500 });
  }
}


