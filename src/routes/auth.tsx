import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/brand";
import { volunteerLoginEmail } from "@/lib/volunteer-login";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — 64 Squares Society" },
      { name: "description", content: "Sign in to the 64 Squares Society portal. Volunteers use their mobile number and password." },
      { property: "og:title", content: "Sign in — 64 Squares Society" },
      { property: "og:description", content: "Admin and volunteer sign-in for 64 Squares Society tournaments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "volunteer";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user) {
      if (role === "admin") nav({ to: "/admin", replace: true });
      else if (role === "volunteer") nav({ to: "/volunteer", replace: true });
      else nav({ to: "/", replace: true });
    }
  }, [user, role, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "volunteer") {
        const digits = phone.replace(/\D/g, "");
        if (digits.length !== 10) throw new Error("Enter your 10-digit mobile number");
        const { error } = await supabase.auth.signInWithPassword({
          email: volunteerLoginEmail(digits),
          password,
        });
        if (error) throw new Error("Wrong mobile number or password. Ask an admin to reset it.");
        toast.success("Signed in");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Account created — check your email if confirmation is required.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally { setLoading(false); }
  };

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${mode === m ? "bg-primary text-primary-foreground" : "bg-muted"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <Link to="/" className="mb-8"><Brand size={48} /></Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
        <div className="flex gap-2 mb-6">
          {tab("signin", "Sign in")}
          {tab("signup", "Create account")}
          {tab("volunteer", "Volunteer")}
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          )}
          {mode === "volunteer" ? (
            <div>
              <label className="text-sm font-medium">Mobile number</label>
              <input
                inputMode="numeric"
                maxLength={10}
                autoComplete="username"
                placeholder="10-digit number given to the admin"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                required
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Password</label>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <button disabled={loading} type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          {mode === "volunteer"
            ? "Volunteer logins are created by an admin. Use the mobile number you gave them plus the password they shared."
            : "Admin access is restricted to approved emails. Volunteers sign in on the Volunteer tab with their mobile number."}
        </p>
      </div>
    </div>
  );
}
