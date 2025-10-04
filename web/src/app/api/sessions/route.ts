import { NextResponse } from "next/server";
import { createSession } from "@/lib/store";
import { CreateSessionInput } from "@/lib/types";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireUser();
    const text = await req.text();
    let body: CreateSessionInput;
    try {
      body = JSON.parse(text);
    } catch (e: any) {
      return NextResponse.json({ error: "Invalid JSON", received: text }, { status: 400 });
    }
    if (!body.adminDisplayName || !body.startingCash || !body.maxShares || !body.sessionDurationSec) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const user = await requireUser();
    const { session, adminUser } = createSession(body, user.uid);
    return NextResponse.json({ session, adminUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to create session" }, { status: 500 });
  }
}


