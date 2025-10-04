"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();

  async function join() {
    const res = await fetch(`/api/rooms/${roomCode}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName }) });
    const data = await res.json();
    if (res.ok) {
      const params = new URLSearchParams({ sessionId: data.session.id, userId: data.user.id, playerId: String(data.player.id) });
      router.push(`/session?${params.toString()}`);
    } else alert(data.error);
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Join Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room">Room code</Label>
            <Input id="room" placeholder="e.g. ABC123" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <Button className="w-full" onClick={join}>Join</Button>
        </CardContent>
      </Card>
    </div>
  );
}


