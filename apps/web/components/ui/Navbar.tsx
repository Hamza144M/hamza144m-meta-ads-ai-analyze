"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/creative", label: "Creative AI" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function Navbar() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors",
        scrolled || open
          ? "border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80"
          : "bg-transparent",
      )}
    >
      <nav className="container flex h-16 items-center justify-between">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="btn-ghost px-3 py-2 font-medium">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
          <Link href="/upload" className="btn-primary hidden sm:inline-flex">
            Upload report
          </Link>
          <button
            type="button"
            className="btn-ghost h-9 w-9 p-0 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="container flex flex-col gap-1 pb-4 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="btn-ghost justify-start" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          {auth.enabled && !auth.loading && !auth.user && (
            <>
              <Link href="/login" className="btn-ghost justify-start" onClick={() => setOpen(false)}>
                Log in
              </Link>
              <Link href="/signup" className="btn-secondary mt-2" onClick={() => setOpen(false)}>
                Sign up free
              </Link>
            </>
          )}
          <Link href="/upload" className="btn-primary mt-2" onClick={() => setOpen(false)}>
            Upload your Meta Ads report
          </Link>
        </div>
      )}
    </header>
  );
}
