"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlayerView = {
  player: { id: number; cashBalance: number; sharesHeld: number };
  openOrders: { id: number; type: "buy" | "sell"; price: number; quantity: number }[];
  closedOrders: { id: number; type: "buy" | "sell"; price: number; quantity: number; status: string }[];
};

export default function SessionPage() {
  const params = useMemo(() => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search), []);
  const sessionId = params.get("sessionId");
  const userId = params.get("userId");
  const [state, setState] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [playerView, setPlayerView] = useState<PlayerView | null>(null);
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [puzzle, setPuzzle] = useState<any>(null);
  const [answer, setAnswer] = useState("");

  async function refresh() {
    if (!sessionId || !userId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } as any : undefined;
    const [sRes, obRes, lbRes, pvRes, pzRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/state`),
      fetch(`/api/sessions/${sessionId}/orderbook`),
      fetch(`/api/sessions/${sessionId}/leaderboard`),
      fetch(`/api/player?sessionId=${sessionId}&userId=${userId}`, { headers }),
      fetch(`/api/sessions/${sessionId}/puzzle`, { headers }),
    ]);
    setState(await sRes.json());
    setOrderbook(await obRes.json());
    setLeaderboard(await lbRes.json());
    setPlayerView(await pvRes.json());
    setPuzzle(await pzRes.json());
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, []);

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

  async function submitAnswer() {
    if (!sessionId || !userId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    const res = await fetch(`/api/sessions/${sessionId}/puzzle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ userId, submitAnswer: answer }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error); else alert(data.correct ? "Correct!" : "Incorrect");
    setAnswer("");
    refresh();
  }

  if (!sessionId || !userId) return <div className="p-6">Missing session/user</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 grid md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          {playerView && (
            <CardContent className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Cash</div>
              <div>${playerView.player.cashBalance.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Shares</div>
              <div>{playerView.player.sharesHeld}</div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center">
              <select className="border px-2 py-2 rounded-md" value={type} onChange={(e) => setType(e.target.value as any)}>
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
            <CardTitle>Puzzle</CardTitle>
          </CardHeader>
          <CardContent>
            {puzzle ? (
              <div className="space-y-2">
                <div className="font-medium">{puzzle.question}</div>
                <Badge variant={puzzle.solvedByUserId ? "secondary" : "outline"}>{puzzle.solvedByUserId ? "Solved" : "Open"}</Badge>
                <div className="mt-2 flex gap-2">
                  <Input placeholder="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
                  <Button variant="outline" onClick={submitAnswer}>Submit</Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No active puzzle</div>
            )}
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
                  {orderbook?.bids?.map((l: any) => (
                    <div key={`b-${l.price}`} className="flex justify-between border px-2 py-1 rounded">
                      <span>${l.price.toFixed(2)}</span>
                      <span>{l.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Asks</div>
                <div className="space-y-1">
                  {orderbook?.asks?.map((l: any) => (
                    <div key={`a-${l.price}`} className="flex justify-between border px-2 py-1 rounded">
                      <span>${l.price.toFixed(2)}</span>
                      <span>{l.quantity}</span>
                    </div>
                  ))}
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
              {leaderboard.map((e: any) => (
                <div key={e.userId} className="flex justify-between border px-2 py-1 rounded">
                  <span>{e.displayName}</span>
                  <span>${e.netWorth.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


