"use client";
import { useState, useEffect, useCallback } from "react";
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
  const [totalRounds, setTotalRounds] = useState<string>("5");
  const [isIpoActive, setIsIpoActive] = useState(false);
  const [detailedOrderbook, setDetailedOrderbook] = useState<{ bids?: DetailedOrder[]; asks?: DetailedOrder[] } | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);

  // Cache admin session data
  const saveAdminState = useCallback(() => {
    if (typeof window !== 'undefined') {
      const adminState = {
        adminName,
        roomCode,
        sessionId,
        price,
        totalRounds,
        isIpoActive,
        timestamp: Date.now()
      };
      localStorage.setItem('adminState', JSON.stringify(adminState));
    }
  }, [adminName, roomCode, sessionId, price, totalRounds, isIpoActive]);

  const loadAdminState = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminState');
      if (saved) {
        try {
          const adminState = JSON.parse(saved);
          // Only restore if saved within last 24 hours
          if (Date.now() - adminState.timestamp < 24 * 60 * 60 * 1000) {
            setAdminName(adminState.adminName || "");
            setRoomCode(adminState.roomCode || null);
            setSessionId(adminState.sessionId || null);
            setPrice(adminState.price || "");
            setTotalRounds(adminState.totalRounds || "5");
            setIsIpoActive(adminState.isIpoActive || false);
          }
        } catch (e) {
          console.error('Failed to load admin state:', e);
        }
      }
    }
  }, []);

  const clearAdminState = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminState');
    }
  }, []);

  // Load admin state on component mount
  useEffect(() => {
    loadAdminState();
  }, [loadAdminState]);

  // Save admin state whenever key values change
  useEffect(() => {
    if (adminName || roomCode || sessionId) {
      saveAdminState();
    }
  }, [adminName, roomCode, sessionId, price, totalRounds, isIpoActive, saveAdminState]);

  useEffect(() => {
    if (!sessionId) return;
    
    async function fetchData() {
      if (!sessionId) return;
      
      const [sessionStateRes, detailedOrderbookRes, tradesRes, roundsRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/state`),
        fetch(`/api/sessions/${sessionId}/orderbook/detailed`),
        fetch(`/api/sessions/${sessionId}/trades`),
        fetch(`/api/sessions/${sessionId}/rounds`),
      ]);
      
      if (sessionStateRes.ok) {
        const sessionState = await sessionStateRes.json();
        setIsIpoActive(sessionState.roundStatus === "ipo_active");
        if (sessionState.currentPrice && sessionState.roundStatus === "ipo_active") {
          setPrice(sessionState.currentPrice.toString());
        }
        
        // Calculate round time left
        if (sessionState.roundEndTime) {
          const timeLeft = Math.max(0, sessionState.roundEndTime - Date.now());
          setRoundTimeLeft(timeLeft);
        } else {
          setRoundTimeLeft(null);
        }
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
         totalRounds: Number(totalRounds),
         roundDurationSec: 90
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

  async function toggleIpoRound() {
    if (!sessionId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    
    if (!isIpoActive) {
      // Start IPO round
      const p = Number(price);
      if (!Number.isFinite(p)) {
        alert("Please enter a valid price");
        return;
      }
      
      const res = await fetch(`/api/sessions/${sessionId}/ipo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ 
          toggle: true, 
          expectedPrice: p,
          isActive: false 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsIpoActive(true);
        alert(`IPO Round Started! Expected price: $${p}. Players can now place orders.`);
      } else {
        alert(data.error);
      }
    } else {
      // Execute IPO round
      const p = Number(price);
      if (!Number.isFinite(p)) {
        alert("Please enter a valid execution price");
        return;
      }
      
      const res = await fetch(`/api/sessions/${sessionId}/ipo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ 
          executionPrice: p
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsIpoActive(false);
        alert(`IPO Round Ended! ${data.trades?.length || 0} trades executed.`);
      } else {
        alert(data.error);
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Input placeholder="Admin display name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              <Input 
                placeholder="Number of rounds" 
                value={totalRounds} 
                onChange={(e) => setTotalRounds(e.target.value)}
                type="number"
                min="1"
                max="20"
              />
            </div>
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
            {roundTimeLeft !== null && (
              <div className="text-lg font-semibold">
                Round Timer: <span className="text-blue-600">{Math.floor(roundTimeLeft / 1000)}s</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={startSession}>Start</Button>
              <Button variant="destructive" onClick={() => {
                clearAdminState();
                setAdminName("");
                setRoomCode(null);
                setSessionId(null);
                setPrice("");
                setTotalRounds("5");
                setIsIpoActive(false);
                setDetailedOrderbook(null);
                setTrades([]);
                setRounds([]);
                setRoundTimeLeft(null);
              }}>Clear Session</Button>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Round 0 is automatically an IPO round. Players can place buy orders (max 5 shares).
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
                <Button variant="outline" onClick={setCurrentPrice}>Update Price</Button>
                <Button 
                  variant={isIpoActive ? "destructive" : "default"} 
                  onClick={toggleIpoRound}
                >
                  {isIpoActive ? "End IPO Round" : "Start IPO Round"}
                </Button>
              </div>
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



