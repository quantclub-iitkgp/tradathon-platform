"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
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
          <Link href="/join"><Button size="sm">Get started</Button></Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}


