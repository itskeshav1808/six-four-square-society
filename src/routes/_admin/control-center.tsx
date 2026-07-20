import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Radio, Users, CheckCircle2, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_admin/control-center")({
  component: ControlCenter,
});

function ControlCenter() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tid, setTid] = useState<string>("");
  const [stats, setStats] = useState<any>({ total: 0, checkedIn: 0, players: [] });
  const [rounds, setRounds] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("tournaments").select("id,name,status").in("status", ["published", "ongoing"]).then(({ data }) => {
      setTournaments(data ?? []);
      if (data?.[0]) setTid(data[0].id);
    });
  }, []);

  const load = async () => {
    if (!tid) return;
    const { data: regs } = await supabase.from("registrations").select("id,checkin_status,checked_in_at,player:players(full_name,city)").eq("tournament_id", tid).eq("status", "approved");
    const total = regs?.length ?? 0;
    const checkedIn = regs?.filter((r: any) => r.checkin_status === "checked_in").length ?? 0;
    setStats({ total, checkedIn, players: regs ?? [] });
    const { data: rs } = await supabase.from("rounds").select("*").eq("tournament_id", tid).order("round_number");
    setRounds(rs ?? []);
  };
  useEffect(() => { load(); }, [tid]);

  useEffect(() => {
    if (!tid) return;
    const ch = supabase.channel(`cc_${tid}`).on("postgres_changes", { event: "*", schema: "public", table: "registrations", filter: `tournament_id=eq.${tid}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tid]);

  const addRound = async () => {
    const next = (rounds[rounds.length - 1]?.round_number ?? 0) + 1;
    await supabase.from("rounds").insert({ tournament_id: tid, round_number: next });
    toast.success(`Round ${next} added`);
    load();
  };
  const toggleRound = async (r: any, field: "is_published" | "is_completed") => {
    await supabase.from("rounds").update({ [field]: !r[field] } as any).eq("id", r.id as any);
    load();
  };
  const generatePairings = async (r: any) => {
    const { data: regs } = await supabase.from("registrations").select("player_id").eq("tournament_id", tid).eq("status", "approved");
    const players = (regs ?? []).map((x: any) => x.player_id).sort(() => Math.random() - 0.5);
    await supabase.from("pairings").delete().eq("round_id", r.id);
    const rows = [];
    for (let i = 0; i < players.length - 1; i += 2) {
      rows.push({ round_id: r.id, board_number: rows.length + 1, white_player_id: players[i], black_player_id: players[i + 1] });
    }
    if (rows.length) await supabase.from("pairings").insert(rows);
    toast.success(`Generated ${rows.length} boards (random Swiss placeholder)`);
  };

  const pct = stats.total ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-destructive"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />LIVE</div>
          <h1 className="font-display text-3xl font-semibold mt-1">Tournament Control Center</h1>
        </div>
        <select value={tid} onChange={(e) => setTid(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase text-muted-foreground">Approved</div>
          <div className="mt-1 font-display text-4xl">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase text-muted-foreground">Checked in</div>
          <div className="mt-1 font-display text-4xl text-success">{stats.checkedIn}</div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-success" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase text-muted-foreground">Attendance</div>
          <div className="mt-1 font-display text-4xl">{pct}%</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-lg font-semibold">Rounds</h2>
            <button onClick={addRound} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">+ Round</button>
          </div>
          <div className="space-y-2">
            {rounds.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="font-medium">Round {r.round_number}</div>
                <div className="flex gap-2">
                  <button onClick={() => generatePairings(r)} className="text-xs px-2 py-1 rounded border border-border">Pairings</button>
                  <button onClick={() => toggleRound(r, "is_published")} className={`text-xs px-2 py-1 rounded ${r.is_published ? "bg-success/10 text-success" : "border border-border"}`}>{r.is_published ? "Published" : "Publish"}</button>
                  <button onClick={() => toggleRound(r, "is_completed")} className={`text-xs px-2 py-1 rounded ${r.is_completed ? "bg-primary/10 text-primary" : "border border-border"}`}>{r.is_completed ? "Complete" : "Mark done"}</button>
                </div>
              </div>
            ))}
            {rounds.length === 0 && <div className="text-sm text-muted-foreground">No rounds yet.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Attendance feed</h2>
          <div className="max-h-96 overflow-y-auto space-y-1 text-sm">
            {stats.players.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span>{p.player?.full_name}</span>
                <span className={`text-xs ${p.checkin_status === "checked_in" ? "text-success" : "text-muted-foreground"}`}>
                  {p.checkin_status === "checked_in" ? `✓ ${p.checked_in_at ? new Date(p.checked_in_at).toLocaleTimeString() : ""}` : "waiting"}
                </span>
              </div>
            ))}
            {stats.players.length === 0 && <div className="text-muted-foreground">No approved registrations yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
