"use client";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type SessionInfo = {
  status: string;
  currentPrice?: number;
  startingCash: number;
  currentRound: number;
  totalRounds: number;
  roundStatus: string;
};

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    if (!roomCode) {
      setSessionInfo(null);
      return;
    }
    
    try {
      const res = await fetch(`/api/rooms/${roomCode}/info`);
      if (res.ok) {
        const data = await res.json();
        setSessionInfo(data);
      } else {
        setSessionInfo(null);
      }
    } catch {
      setSessionInfo(null);
    }
  }, [roomCode]);

  useEffect(() => {
    const timeoutId = setTimeout(checkSession, 500);
    return () => clearTimeout(timeoutId);
  }, [roomCode, checkSession]);

  async function join() {
    if (!roomCode || !displayName) return;
    
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
      const res = await fetch(`/api/rooms/${roomCode}/join`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify({ displayName }) 
      });
      const data = await res.json();
      if (res.ok) {
        const params = new URLSearchParams({ sessionId: data.session.id, userId: data.user.id, playerId: String(data.player.id) });
        router.push(`/session?${params.toString()}`);
      } else {
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
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
          
          {sessionInfo && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm font-medium text-blue-900">Session Status</div>
              <div className="text-sm text-blue-700">
                Status: {sessionInfo.status === "lobby" ? "Waiting to start" : "In progress"}
              </div>
              <div className="text-sm text-blue-700">
                Round: {sessionInfo.currentRound} of {sessionInfo.totalRounds}
              </div>

              <div className="text-xs text-blue-600 mt-1">
                You&apos;ll start with ${sessionInfo.startingCash} and 0 shares
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <Button 
            className="w-full" 
            onClick={join} 
            disabled={!roomCode || !displayName || loading}
          >
            {loading ? "Joining..." : "Join"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


