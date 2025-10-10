"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const [adminName, setAdminName] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("");

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
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
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
    </div>
  );
}



