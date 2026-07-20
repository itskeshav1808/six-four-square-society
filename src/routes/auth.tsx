import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/brand";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — 64 Squares Society" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
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
      if (mode === "signin") {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <Link to="/" className="mb-8"><Brand size={48} /></Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Sign in</button>
          <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Create account</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <button disabled={loading} type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Admin access is restricted to approved emails. Volunteers are invited by an admin.
        </p>
      </div>
    </div>
  );
}
