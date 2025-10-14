"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/useWebSocket";

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

  // WebSocket connection
  const { on, off, isConnected } = useWebSocket(sessionId);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [state, setState] = useState<{ currentRound?: number; totalRounds?: number; roundStatus?: string; roundEndTime?: number; currentPrice?: number; lastTradedPrice?: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<unknown[]>([]);
  const [playerView, setPlayerView] = useState<PlayerView | null>(null);
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);
  const [showIpoNotification, setShowIpoNotification] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId || !userId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const [sRes, lbRes, pvRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/state`),
      fetch(`/api/sessions/${sessionId}/leaderboard`),
      fetch(`/api/player?sessionId=${sessionId}&userId=${userId}`, { headers }),
    ]);
    const sessionState = await sRes.json() as { currentRound?: number; totalRounds?: number; roundStatus?: string; roundEndTime?: number; currentPrice?: number; lastTradedPrice?: number };
    setState(sessionState);
    
    // Check for IPO round
    if (sessionState.roundStatus === "ipo_active") {
      setShowIpoNotification(true);
    } else {
      setShowIpoNotification(false);
    }
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

  // WebSocket event listeners
  useEffect(() => {
    if (!sessionId) return;

    const handleSessionUpdate = (sessionData: any) => {
      setState(sessionData);
      
      // Check for IPO round
      if (sessionData.roundStatus === "ipo_active") {
        setShowIpoNotification(true);
      } else {
        setShowIpoNotification(false);
      }
      
      // Calculate round time left
      if (sessionData.roundEndTime) {
        const timeLeft = Math.max(0, sessionData.roundEndTime - Date.now());
        setRoundTimeLeft(timeLeft);
      } else {
        setRoundTimeLeft(null);
      }
    };

    const handleLeaderboardUpdate = (leaderboardData: any) => {
      setLeaderboard(leaderboardData);
    };

    const handlePlayerUpdate = (playerData: any) => {
      if (playerData.userId === userId || !playerData.userId) {
        setPlayerView(playerData);
      }
    };

    // Set up event listeners
    on('session-updated', handleSessionUpdate);
    on('leaderboard-updated', handleLeaderboardUpdate);
    on('player-updated', handlePlayerUpdate);

    // Initial data fetch
    refresh();

    // Cleanup
    return () => {
      off('session-updated', handleSessionUpdate);
      off('leaderboard-updated', handleLeaderboardUpdate);
      off('player-updated', handlePlayerUpdate);
    };
  }, [sessionId, userId, on, off, refresh]);

  async function place() {
    if (!sessionId || !userId || isPlacingOrder) return;
    
    // Validate quantity for IPO round
    if (showIpoNotification && Number(quantity) > 5) {
      alert("Maximum 5 shares allowed in IPO round");
      return;
    }
    
    setIsPlacingOrder(true);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('idToken') : null;
      const res = await fetch(`/api/sessions/${sessionId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ 
          userId, 
          type, 
          price: 0, 
          quantity: Number(quantity) 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
      } else {
        setQuantity("");
      }
      // No need to call refresh() - WebSocket will handle updates
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  }


  if (!mounted) return <div className="p-6">Loading...</div>;
  if (!sessionId || !userId) return <div className="p-6">Missing session/user</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Connection Status */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {showIpoNotification && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">IPO ROUND ACTIVE</Badge>
              <span className="text-sm text-yellow-800">
                IPO Round is active!  
                You can place buy orders (max 5 shares). All buy orders will be executed at the admin-set execution price.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
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
              <div className="text-sm text-muted-foreground">Current Price</div>
              <div>${(state?.lastTradedPrice || state?.currentPrice || 100).toFixed(2)}</div>
              <div className="text-sm text-muted-foreground font-medium">Net Worth</div>
              <div className="font-medium">
                ${((playerView.player.cashBalance) + (playerView.player.sharesHeld * (state?.lastTradedPrice || state?.currentPrice || 100))).toFixed(2)}
              </div>
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
              <Input 
                placeholder="Quantity" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min="1"
                max={showIpoNotification ? "5" : "1000"}
              />
              <Button 
                onClick={place} 
                disabled={isPlacingOrder || !quantity || Number(quantity) <= 0}
              >
                {isPlacingOrder ? "Placing..." : "Place"}
              </Button>
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
    </div>
  );
}


