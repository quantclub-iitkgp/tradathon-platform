"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useEffect, useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string | null; email: string | null } | null>(null);
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUser(null);
        localStorage.removeItem("idToken");
        return;
      }
      const token = await u.getIdToken();
      localStorage.setItem("idToken", token);
      setUser({ name: u.displayName, email: u.email });
    });
    return () => unsub();
  }, []);
  const linkClass = (href: string) =>
    `text-sm transition-colors ${
      pathname === href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
        <Link href="/" className="font-semibold">Tradathon</Link>
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/" className={linkClass("/")}>Home</Link>
          <Link href="/join" className={linkClass("/join")}>Join</Link>
          <Link href="/admin" className={linkClass("/admin")}>Admin</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">{user.name || "User"}</span>
              <span>({user.email || "signed in"})</span>
              <Button size="sm" variant="outline" onClick={() => getFirebaseAuth().signOut()}>Logout</Button>
            </div>
          ) : (
            <Link href="/login"><Button size="sm">Login</Button></Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}


