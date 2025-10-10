"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PlayerView = {
  player: { id: number; cashBalance: number; sharesHeld: number };
  openOrders: { id: number; type: "buy" | "sell"; price: number; quantity: number }[];
  closedOrders: { id: number; type: "buy" | "sell"; price: number; quantity: number; status: string }[];
};

export default function SessionPage() {
  const [mounted, setMounted] = useState(false);
  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const sessionId = params.get("sessionId");
  const userId = params.get("userId");

  useEffect(() => {
    setMounted(true);
  }, []);
  const [state, setState] = useState<{ currentRound?: number; totalRounds?: number; roundStatus?: string; roundEndTime?: number } | null>(null);
  const [orderbook, setOrderbook] = useState<{ bids?: { price: number; quantity: number }[]; asks?: { price: number; quantity: number }[] } | null>(null);
  const [leaderboard, setLeaderboard] = useState<unknown[]>([]);
  const [playerView, setPlayerView] = useState<PlayerView | null>(null);
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId || !userId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const [sRes, obRes, lbRes, pvRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/state`),
      fetch(`/api/sessions/${sessionId}/orderbook`),
      fetch(`/api/sessions/${sessionId}/leaderboard`),
      fetch(`/api/player?sessionId=${sessionId}&userId=${userId}`, { headers }),
    ]);
    const sessionState = await sRes.json() as { currentRound?: number; totalRounds?: number; roundStatus?: string; roundEndTime?: number };
    setState(sessionState);
    setOrderbook(await obRes.json() as { bids?: { price: number; quantity: number }[]; asks?: { price: number; quantity: number }[] });
    setLeaderboard(await lbRes.json());
    setPlayerView(await pvRes.json());
    
    // Calculate round time left
    if (sessionState.roundEndTime) {
      const timeLeft = Math.max(0, sessionState.roundEndTime - Date.now());
      setRoundTimeLeft(timeLeft);
    } else {
      setRoundTimeLeft(null);
    }
  }, [sessionId, userId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [refresh]);

  async function place() {
    if (!sessionId || !userId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    const res = await fetch(`/api/sessions/${sessionId}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ userId, type, price: Number(price), quantity: Number(quantity) }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    setPrice("");
    setQuantity("");
    refresh();
  }


  if (!mounted) return <div className="p-6">Loading...</div>;
  if (!sessionId || !userId) return <div className="p-6">Missing session/user</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 grid md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          {playerView && playerView.player ? (
            <CardContent className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Cash</div>
              <div>${playerView.player.cashBalance.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Shares</div>
              <div>{playerView.player.sharesHeld}</div>
            </CardContent>
          ) : (
            <CardContent>
              <div className="text-sm text-muted-foreground">Loading portfolio...</div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center">
              <select className="border px-2 py-2 rounded-md" value={type} onChange={(e) => setType(e.target.value as "buy" | "sell")}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
              <Input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
              <Input placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <Button onClick={place}>Place</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Round Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">Round {state?.currentRound || 0} of {state?.totalRounds || 0}</div>
              <Badge variant={state?.roundStatus === "active" ? "default" : "secondary"}>
                {state?.roundStatus || "waiting"}
              </Badge>
              {roundTimeLeft !== null && (
                <div className="text-sm text-muted-foreground">
                  Time left: {Math.floor(roundTimeLeft / 1000)}s
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Book</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-2">Bids</div>
                <div className="space-y-1">
                  {orderbook?.bids?.map((l: unknown) => {
                    const level = l as { price: number; quantity: number };
                    return (
                    <div key={`b-${level.price}`} className="flex justify-between border px-2 py-1 rounded">
                      <span>${level.price.toFixed(2)}</span>
                      <span>{level.quantity}</span>
                    </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Asks</div>
                <div className="space-y-1">
                  {orderbook?.asks?.map((l: unknown) => {
                    const level = l as { price: number; quantity: number };
                    return (
                    <div key={`a-${level.price}`} className="flex justify-between border px-2 py-1 rounded">
                      <span>${level.price.toFixed(2)}</span>
                      <span>{level.quantity}</span>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                leaderboard.map((e: unknown) => {
                  const entry = e as { userId: string; displayName: string; totalPnL?: number; netWorth: number; sharesHeld: number };
                  return (
                  <div key={entry.userId} className="flex justify-between border px-2 py-1 rounded">
                    <div>
                      <div className="font-medium">{entry.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        P&L: ${entry.totalPnL?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>${entry.netWorth.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.sharesHeld} shares
                      </div>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">Loading leaderboard...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


