import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, LineChart } from "lucide-react";

export default function Home() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-background/70" />
      </div>
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-700">
          <LineChart className="size-3.5" /> Live trading simulation
        </div>
        <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight animate-in fade-in-50 zoom-in-50 duration-700 delay-75">
          Tradathon
        </h1>
        <p className="mt-3 text-muted-foreground mx-auto max-w-2xl animate-in fade-in-50 slide-in-from-bottom-2 duration-700 delay-100">
          Real-time trading simulation with a live order book and puzzle-powered alpha.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 animate-in fade-in duration-700 delay-150">

          <Link href="/join">
            <Button className="gap-2">
              Join as Player <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline">Admin</Button>
          </Link>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 pb-20 grid md:grid-cols-3 gap-4">
        <Card className="animate-in fade-in slide-in-from-left-4 duration-700">
          <CardHeader>
            <CardTitle className="text-base">Real-time Order Book</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Place buy/sell orders and watch bids and asks update live.
          </CardContent>
        </Card>
        <Card className="animate-in fade-in duration-700 delay-75">
          <CardHeader>
            <CardTitle className="text-base">Puzzles for Alpha</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Solve puzzles during the session to unlock insights and rewards.
          </CardContent>
        </Card>
        <Card className="animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
          <CardHeader>
            <CardTitle className="text-base">Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Compete for the top net worth across all participants.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
