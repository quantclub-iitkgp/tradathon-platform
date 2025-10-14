"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/useWebSocket";

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

  // Loading states
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isTogglingIpo, setIsTogglingIpo] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [isEndingRound, setIsEndingRound] = useState(false);

  // WebSocket connection
  const { on, off, isConnected } = useWebSocket(sessionId);

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

  // WebSocket event listeners for admin page
  useEffect(() => {
    if (!sessionId) return;

    const handleSessionUpdate = (sessionData: {
      currentRound?: number;
      totalRounds?: number;
      roundStatus?: string;
      roundEndTime?: number;
      currentPrice?: number;
      lastTradedPrice?: number;
    }) => {
      setIsIpoActive(sessionData.roundStatus === "ipo_active");
      if (sessionData.currentPrice && sessionData.roundStatus === "ipo_active") {
        setPrice(sessionData.currentPrice.toString());
      }
      
      // Calculate round time left
      if (sessionData.roundEndTime) {
        const timeLeft = Math.max(0, sessionData.roundEndTime - Date.now());
        setRoundTimeLeft(timeLeft);
      } else {
        setRoundTimeLeft(null);
      }
    };

    const handleOrderPlaced = () => {
      // Refresh orderbook when orders are placed
      fetch(`/api/sessions/${sessionId}/orderbook/detailed`)
        .then(res => res.json())
        .then(data => setDetailedOrderbook(data))
        .catch(console.error);
    };

    const handleOrderCancelled = () => {
      // Refresh orderbook when orders are cancelled
      fetch(`/api/sessions/${sessionId}/orderbook/detailed`)
        .then(res => res.json())
        .then(data => setDetailedOrderbook(data))
        .catch(console.error);
    };

    const handleTradeExecuted = () => {
      // Refresh trades when new trades are executed
      fetch(`/api/sessions/${sessionId}/trades`)
        .then(res => res.json())
        .then(data => setTrades(data))
        .catch(console.error);
    };

    const handleRoundStarted = () => {
      // Refresh rounds when new round starts
      fetch(`/api/sessions/${sessionId}/rounds`)
        .then(res => res.json())
        .then(data => setRounds(data))
        .catch(console.error);
    };

    const handleRoundEnded = () => {
      // Refresh rounds and trades when round ends
      Promise.all([
        fetch(`/api/sessions/${sessionId}/rounds`).then(res => res.json()),
        fetch(`/api/sessions/${sessionId}/trades`).then(res => res.json())
      ]).then(([roundsData, tradesData]) => {
        setRounds(roundsData);
        setTrades(tradesData);
      }).catch(console.error);
    };

    // Set up event listeners
    on('session-updated', handleSessionUpdate);
    on('order-placed', handleOrderPlaced);
    on('order-cancelled', handleOrderCancelled);
    on('trade-executed', handleTradeExecuted);
    on('round-started', handleRoundStarted);
    on('round-ended', handleRoundEnded);

    // Initial data fetch
    async function fetchInitialData() {
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

    fetchInitialData();

    // Cleanup
    return () => {
      off('session-updated', handleSessionUpdate);
      off('order-placed', handleOrderPlaced);
      off('order-cancelled', handleOrderCancelled);
      off('trade-executed', handleTradeExecuted);
      off('round-started', handleRoundStarted);
      off('round-ended', handleRoundEnded);
    };
  }, [sessionId, on, off]);

  // Real-time countdown timer
  useEffect(() => {
    if (roundTimeLeft === null || roundTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setRoundTimeLeft(prev => {
        if (prev === null || prev <= 1000) {
          return null;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roundTimeLeft]);

  async function createSession() {
    if (isCreatingSession) return;
    
    setIsCreatingSession(true);
    try {
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
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function startSession() {
    if (!sessionId || isStartingSession) return;
    
    setIsStartingSession(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
      await fetch(`/api/sessions/${sessionId}/puzzle`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify({ start: true }) 
      });
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Please try again.');
    } finally {
      setIsStartingSession(false);
    }
  }

  async function setCurrentPrice() {
    if (!sessionId || isUpdatingPrice) return;
    const p = Number(price);
    if (!Number.isFinite(p)) return;
    
    setIsUpdatingPrice(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
      await fetch(`/api/sessions/${sessionId}/puzzle`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify({ setPrice: p }) 
      });
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Failed to update price. Please try again.');
    } finally {
      setIsUpdatingPrice(false);
    }
  }

  async function startRound() {
    if (!sessionId || isStartingRound) return;
    
    setIsStartingRound(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
      await fetch(`/api/sessions/${sessionId}/puzzle`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify({ startRound: true }) 
      });
    } catch (error) {
      console.error('Error starting round:', error);
      alert('Failed to start round. Please try again.');
    } finally {
      setIsStartingRound(false);
    }
  }

  async function endRound() {
    if (!sessionId || isEndingRound) return;
    const p = Number(price);
    if (!Number.isFinite(p)) return;
    
    setIsEndingRound(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
      await fetch(`/api/sessions/${sessionId}/puzzle`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify({ endRound: true, executionPrice: p }) 
      });
    } catch (error) {
      console.error('Error ending round:', error);
      alert('Failed to end round. Please try again.');
    } finally {
      setIsEndingRound(false);
    }
  }

  async function toggleIpoRound() {
    if (!sessionId || isTogglingIpo) return;
    
    const p = Number(price);
    if (!Number.isFinite(p)) {
      alert("Please enter a valid price");
      return;
    }
    
    setIsTogglingIpo(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
      
      // Toggle between IPO and regular round
      const res = await fetch(`/api/sessions/${sessionId}/ipo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ 
          toggleIpo: true, 
          expectedPrice: p
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsIpoActive(!isIpoActive);
        const action = isIpoActive ? "converted to regular round" : "converted to IPO round";
        const tradesMessage = data.trades && data.trades.length > 0 ? ` ${data.trades.length} trades executed.` : "";
        alert(`Round ${action}! Expected price: $${p}.${tradesMessage}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error toggling IPO round:', error);
      alert('Failed to toggle IPO round. Please try again.');
    } finally {
      setIsTogglingIpo(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
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
            <Button 
              onClick={createSession} 
              disabled={isCreatingSession || !adminName || !totalRounds}
            >
              {isCreatingSession ? "Creating..." : "Create Session"}
            </Button>
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
              <Button 
                variant="outline" 
                onClick={startSession}
                disabled={isStartingSession}
              >
                {isStartingSession ? "Starting..." : "Start"}
              </Button>
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
              {isIpoActive && (
                <div className="text-sm font-medium text-yellow-600 bg-yellow-100 p-2 rounded">
                  🚨 IPO ROUND ACTIVE
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
                <Button 
                  variant="outline" 
                  onClick={setCurrentPrice}
                  disabled={isUpdatingPrice || !price}
                >
                  {isUpdatingPrice ? "Updating..." : "Update Price"}
                </Button>
                <Button 
                  variant={isIpoActive ? "destructive" : "default"} 
                  onClick={toggleIpoRound}
                  disabled={isTogglingIpo || !price}
                >
                  {isTogglingIpo ? "Toggling..." : (isIpoActive ? "Convert to Regular Round" : "Convert to IPO Round")}
                </Button>
              </div>
              <Button 
                variant="outline" 
                onClick={startRound}
                disabled={isStartingRound}
              >
                {isStartingRound ? "Starting..." : "Start Round"}
              </Button>
              <Button 
                variant="outline" 
                onClick={endRound}
                disabled={isIpoActive || isEndingRound || !price}
                title={isIpoActive ? "Cannot end IPO round - use 'Convert to Regular Round' instead" : "End current round"}
              >
                {isEndingRound ? "Ending..." : "End Round"}
              </Button>
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



