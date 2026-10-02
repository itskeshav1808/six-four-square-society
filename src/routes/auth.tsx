import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/brand";
import { volunteerLoginEmail } from "@/lib/volunteer-login";
import { looksLikeIndianMobile, playerLoginEmail } from "@/lib/player-login";
import { signUpPlayer } from "@/lib/player-auth.functions";

type SearchParams = { next?: string };

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — 64 Squares Society" },
      { name: "description", content: "Sign in to the 64 Squares Society portal. Players use their mobile number and password." },
      { property: "og:title", content: "Sign in — 64 Squares Society" },
      { property: "og:description", content: "Player, admin, and volunteer sign-in for 64 Squares Society tournaments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function safeNext(next?: string) {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const search = Route.useSearch() as SearchParams;
  const [mode, setMode] = useState<Mode>("signin");
  const [ident, setIdent] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user) return;
    const dest = safeNext(search.next);
    if (dest) {
      window.location.assign(dest);
      return;
    }
    if (role === "admin") nav({ to: "/admin", replace: true });
    else if (role === "volunteer") nav({ to: "/volunteer", replace: true });
    else nav({ to: "/dashboard", replace: true });
  }, [user, role, nav, search.next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = ident.trim();
      if (mode === "signup") {
        const res = await signUpPlayer({ data: { name: fullName.trim(), identifier: id, password } });
        const { error } = await supabase.auth.signInWithPassword({ email: res.loginEmail, password });
        if (error) throw error;
        toast.success("Account created");
      } else {
        // Mobile numbers may belong to a player or a volunteer account; try both.
        const candidates = looksLikeIndianMobile(id)
          ? [playerLoginEmail(id), volunteerLoginEmail(id)]
          : [id.toLowerCase()];
        const lockUntil = Number(localStorage.getItem("login_lock_until") ?? 0);
        if (lockUntil > Date.now()) {
          throw new Error(`Too many failed attempts. Try again in ${Math.ceil((lockUntil - Date.now()) / 60000)} min.`);
        }
        let ok = false;
        for (const email of candidates) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error) { ok = true; break; }
        }
        if (!ok) {
          const fails = Number(localStorage.getItem("login_fails") ?? 0) + 1;
          localStorage.setItem("login_fails", String(fails));
          if (fails >= 5) {
            localStorage.setItem("login_lock_until", String(Date.now() + 5 * 60000));
            localStorage.setItem("login_fails", "0");
          }
          throw new Error("Wrong mobile number, email, or password.");
        }
        localStorage.removeItem("login_fails");
        toast.success("Signed in");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === m ? "bg-primary text-primary-foreground" : "bg-muted"}`}
    >
      {label}
    </button>
  );

  const field = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <Link to="/" className="mb-8"><Brand size={48} /></Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
        <div className="flex gap-2 mb-6">
          {tab("signin", "Log in")}
          {tab("signup", "Create account")}
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium">Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" className={field} />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Mobile number or email</label>
            <input value={ident} onChange={(e) => setIdent(e.target.value)} required autoComplete="username" placeholder="10-digit mobile or email" className={field} />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={field} />
          </div>
          <button disabled={loading} type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? "…" : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Players, volunteers, and admins all use this page. You'll be taken to the right area automatically.
        </p>
      </div>
    </div>
  );
}
