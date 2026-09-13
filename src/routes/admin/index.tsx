import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ClipboardList, ShieldAlert, HandCoins, Users, Package } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function Stat({ label, value, icon: Icon, tone = "primary" }: { label: string; value: string | number; icon: any; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon size={18} className="text-muted-foreground" />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

function AdminDashboard() {
  const [s, setS] = useState<any>({});
  const [recentRegs, setRecentRegs] = useState<any[]>([]);
  const [pendingV, setPendingV] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [t, r, rev, pending, players, vol, inv, recent, verifs] = await Promise.all([
        supabase.from("tournaments").select("id", { count: "exact", head: true }).in("status", ["published", "ongoing"]),
        supabase.from("registrations").select("id", { count: "exact", head: true }).eq("is_draft", false).neq("status", "cancelled"),
        supabase.from("payments").select("amount").eq("status", "verified"),
        supabase.from("registrations").select("id", { count: "exact", head: true }).eq("payment_status", "pending").eq("is_draft", false),
        supabase.from("players").select("id", { count: "exact", head: true }),
        supabase.from("volunteers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id, status, payment_status, amount, created_at, player:players(full_name), tournament:tournaments(name)").eq("is_draft", false).order("created_at", { ascending: false }).limit(8),
        supabase.from("registrations").select("id, amount, proof_url, payment_method, player:players(full_name), tournament:tournaments(name)").eq("payment_status", "pending").eq("is_draft", false).order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (rev.data ?? []).reduce((a: number, p: any) => a + Number(p.amount || 0), 0);
      setS({ tournaments: t.count ?? 0, registrations: r.count ?? 0, revenue, pending: pending.count ?? 0, players: players.count ?? 0, volunteers: vol.count ?? 0, inventory: inv.count ?? 0 });
      setRecentRegs(recent.data ?? []);
      setPendingV(verifs.data ?? []);
    })();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Admin</div>
        <h1 className="mt-2 font-display text-4xl font-semibold">Command center</h1>
        <p className="mt-1 text-muted-foreground">Live snapshot of everything happening at 64 Squares Society.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active tournaments" value={s.tournaments ?? "—"} icon={Trophy} />
        <Stat label="Total registrations" value={s.registrations ?? "—"} icon={ClipboardList} />
        <Stat label="Revenue verified" value={`₹${(s.revenue ?? 0).toLocaleString()}`} icon={HandCoins} />
        <Stat label="Pending verifications" value={s.pending ?? "—"} icon={ShieldAlert} />
        <Stat label="Players" value={s.players ?? "—"} icon={Users} />
        <Stat label="Active volunteers" value={s.volunteers ?? "—"} icon={Users} />
        <Stat label="Inventory items" value={s.inventory ?? "—"} icon={Package} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Recent registrations</h2>
            <Link to="/admin/registrations" className="text-xs text-primary">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentRegs.length === 0 && <div className="text-sm text-muted-foreground">No registrations yet.</div>}
            {recentRegs.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <div className="font-medium">{r.player?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.tournament?.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">₹{r.amount}</div>
                  <div className={`text-xs ${r.payment_status === "verified" ? "text-success" : "text-warning"}`}>{r.payment_status}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Pending verifications</h2>
            <Link to="/admin/verifications" className="text-xs text-primary">Open center →</Link>
          </div>
          <div className="space-y-2">
            {pendingV.length === 0 && <div className="text-sm text-muted-foreground">All caught up.</div>}
            {pendingV.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <div className="font-medium">{r.player?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.tournament?.name} · {r.payment_method}</div>
                </div>
                <div className="text-right">
                  <div>₹{r.amount}</div>
                  {r.proof_url && <a href={r.proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Proof</a>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
