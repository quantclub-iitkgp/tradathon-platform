"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Trade = {
  id: number;
  price: number;
  quantity: number;
  roundNumber: number;
  createdAt: number;
  buyerName: string;
  sellerName: string;
};

type Round = {
  id: number;
  roundNumber: number;
  status: string;
  startTime: number;
  endTime: number | null;
  executionPrice: number | null;
};

type DetailedOrder = {
  id: number;
  price: number;
  quantity: number;
  createdAt: number;
  playerName: string;
};

export default function AdminPage() {
  const [adminName, setAdminName] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("");
  const [orderbook, setOrderbook] = useState<{ bids?: { price: number; quantity: number }[]; asks?: { price: number; quantity: number }[] } | null>(null);
  const [detailedOrderbook, setDetailedOrderbook] = useState<{ bids?: DetailedOrder[]; asks?: DetailedOrder[] } | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    
    async function fetchData() {
      if (!sessionId) return;
      
      const [orderbookRes, detailedOrderbookRes, tradesRes, roundsRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/orderbook`),
        fetch(`/api/sessions/${sessionId}/orderbook/detailed`),
        fetch(`/api/sessions/${sessionId}/trades`),
        fetch(`/api/sessions/${sessionId}/rounds`),
      ]);
      
      if (orderbookRes.ok) {
        setOrderbook(await orderbookRes.json());
      }
      if (detailedOrderbookRes.ok) {
        setDetailedOrderbook(await detailedOrderbookRes.json());
      }
      if (tradesRes.ok) {
        setTrades(await tradesRes.json());
      }
      if (roundsRes.ok) {
        setRounds(await roundsRes.json());
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, [sessionId]);

  async function createSession() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ 
        adminDisplayName: adminName, 
        startingCash: 10000, 
        maxShares: 1000, 
        sessionDurationSec: 600,
        totalRounds: 5,
        roundDurationSec: 60
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setRoomCode(data.session.roomCode);
      setSessionId(data.session.id);
    } else alert(data.error);
  }

  async function startSession() {
    if (!sessionId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    await fetch(`/api/sessions/${sessionId}/puzzle`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ start: true }) });
  }

  async function setCurrentPrice() {
    if (!sessionId) return;
    const p = Number(price);
    if (!Number.isFinite(p)) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    await fetch(`/api/sessions/${sessionId}/puzzle`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ setPrice: p }) });
  }

  async function startRound() {
    if (!sessionId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    await fetch(`/api/sessions/${sessionId}/puzzle`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ startRound: true }) });
  }

  async function endRound() {
    if (!sessionId) return;
    const p = Number(price);
    if (!Number.isFinite(p)) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    await fetch(`/api/sessions/${sessionId}/puzzle`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ endRound: true, executionPrice: p }) });
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <Card>
        <CardContent className="pt-6 space-y-2">
          <Input placeholder="Admin display name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          <Button onClick={createSession}>Create Session</Button>
        </CardContent>
      </Card>
      {roomCode && (
        <Card>
          <CardHeader>
            <CardTitle>Session Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>Room Code: <span className="font-mono">{roomCode}</span></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={startSession}>Start</Button>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Set current price" value={price} onChange={(e) => setPrice(e.target.value)} />
              <Button variant="outline" onClick={setCurrentPrice}>Update Price</Button>
            </div>
            <div className="space-y-2">
              <Button variant="outline" onClick={startRound}>Start Round</Button>
              <Button variant="outline" onClick={endRound}>End Round</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {sessionId && detailedOrderbook && (
        <Card>
          <CardHeader>
            <CardTitle>Order Book (Admin View)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-2">Bids (Buy Orders)</div>
                <div className="space-y-1">
                  {detailedOrderbook?.bids?.map((order) => (
                    <div key={`b-${order.id}`} className="border px-2 py-1 rounded text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">${order.price.toFixed(2)}</span>
                        <span className="font-medium">{order.quantity}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <div>{order.playerName}</div>
                        <div>{new Date(order.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Asks (Sell Orders)</div>
                <div className="space-y-1">
                  {detailedOrderbook?.asks?.map((order) => (
                    <div key={`a-${order.id}`} className="border px-2 py-1 rounded text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">${order.price.toFixed(2)}</span>
                        <span className="font-medium">{order.quantity}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <div>{order.playerName}</div>
                        <div>{new Date(order.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {sessionId && rounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Round History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rounds.map((round) => (
                <div key={round.id} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">Round {round.roundNumber}</div>
                    <div className="text-sm">
                      {round.executionPrice !== null ? (
                        <span className="text-green-600 font-semibold">
                          Executed at ${round.executionPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No execution</span>
                      )}
                    </div>
                  </div>
                  {round.endTime && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(round.endTime).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {sessionId && trades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rounds.map((round) => {
                const roundTrades = trades.filter(t => t.roundNumber === round.roundNumber);
                if (roundTrades.length === 0) return null;
                
                return (
                  <div key={round.id} className="border rounded p-3">
                    <div className="font-medium mb-2">Round {round.roundNumber}</div>
                    <div className="space-y-2">
                      {roundTrades.map((trade) => (
                        <div key={trade.id} className="bg-muted/50 rounded p-2 text-sm">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div>
                                <span className="text-green-600 font-medium">{trade.buyerName}</span>
                                {" bought from "}
                                <span className="text-red-600 font-medium">{trade.sellerName}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(trade.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{trade.quantity} shares @ ${trade.price.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">
                                Total: ${(trade.quantity * trade.price).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



