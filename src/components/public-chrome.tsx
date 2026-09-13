import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/lib/auth-context";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/register", label: "Register" },
  { to: "/results", label: "Results" },
  { to: "/gallery", label: "Gallery" },
  { to: "/sponsors", label: "Sponsors" },
  { to: "/contact", label: "Contact" },
] as const;

export function PublicHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="shrink-0"><Brand /></Link>
        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                path === l.to ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
              {path === l.to && <span className="block h-0.5 -mb-2 mt-1 bg-gold rounded-full" />}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link
              to={role === "admin" ? "/admin" : role === "volunteer" ? "/volunteer" : "/dashboard"}
              className="hidden sm:inline-flex text-sm px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              {role === "admin" ? "Admin" : role === "volunteer" ? "Volunteer" : "Account"}
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden sm:inline-flex text-sm px-3 py-2 rounded-md border border-border hover:bg-accent/20"
            >
              Sign in
            </Link>
          )}
          <button className="lg:hidden h-10 w-10 flex items-center justify-center rounded-md border border-border" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="px-4 py-3 grid gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="px-3 py-2 rounded-md hover:bg-accent/20">
                {l.label}
              </Link>
            ))}
            <Link to={user ? (role === "admin" ? "/admin" : role === "volunteer" ? "/volunteer" : "/dashboard") : "/auth"} onClick={() => setOpen(false)} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-center">
              {user ? "Account" : "Sign in"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <Brand />
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Every move matters. Premier chess tournaments and a growing community of players.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link>
          <Link to="/tournaments" className="text-muted-foreground hover:text-foreground">Tournaments</Link>
          <Link to="/rules" className="text-muted-foreground hover:text-foreground">Rules</Link>
          <Link to="/prize-structure" className="text-muted-foreground hover:text-foreground">Prizes</Link>
          <Link to="/gallery" className="text-muted-foreground hover:text-foreground">Gallery</Link>
          <Link to="/sponsors" className="text-muted-foreground hover:text-foreground">Sponsors</Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms &amp; Conditions</Link>
        </div>
        <div className="text-sm text-muted-foreground">
          <div>64squaressociety@gmail.com</div>
          <div className="mt-4 text-xs">© {new Date().getFullYear()} 64 Squares Society. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
