import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Share2, Download, Trophy, Swords, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playerBySlugQuery, playerHistoryQuery } from "@/lib/supabase-queries";

export const Route = createFileRoute("/_public/players/$slug")({
  head: ({ loaderData }: { loaderData?: any }) => ({
    meta: [
      { title: `${loaderData?.full_name ?? "Player"} — Chess Passport | 64 Squares Society` },
      { name: "description", content: `${loaderData?.full_name ?? "Player"}'s Chess Passport — rating, tournaments, and results at 64 Squares Society.` },
      { property: "og:title", content: `${loaderData?.full_name ?? "Player"} — Chess Passport` },
      { property: "og:description", content: `Rating, tournaments, and results at 64 Squares Society.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(playerBySlugQuery(params.slug));
    if (!p) throw notFound();
    context.queryClient.prefetchQuery(playerHistoryQuery(p.id));
    return p;
  },
  component: PlayerPage,
  errorComponent: () => <div className="p-16 text-center">Something went wrong. <Link to="/results" className="underline">Back</Link></div>,
  notFoundComponent: () => <div className="p-16 text-center">Player not found. <Link to="/results" className="underline">Back</Link></div>,
});

function PlayerPage() {
  const p = Route.useLoaderData() as any;
  const { data: history } = useSuspenseQuery(playerHistoryQuery(p.id));
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Rating trend (from standings performance if any); fall back to current rating flat line
  const { data: trend } = useQuery({
    queryKey: ["player", p.id, "trend"],
    queryFn: async () => {
      const { data } = await supabase
        .from("standings")
        .select("performance, tournament:tournaments(name,start_date)")
        .eq("player_id", p.id);
      const rows = (data ?? [])
        .filter((r: any) => r.tournament?.start_date && r.performance != null)
        .sort((a: any, b: any) => new Date(a.tournament.start_date).getTime() - new Date(b.tournament.start_date).getTime())
        .map((r: any) => ({
          date: new Date(r.tournament.start_date).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
          rating: Number(r.performance),
          label: r.tournament.name,
        }));
      if (rows.length === 0 && p.rating) rows.push({ date: "Current", rating: Number(p.rating), label: "Current rating" });
      return rows;
    },
  });

  // Best result
  const { data: best } = useQuery({
    queryKey: ["player", p.id, "best"],
    queryFn: async () => {
      const { data } = await supabase
        .from("standings")
        .select("rank, points, tournament:tournaments(name)")
        .eq("player_id", p.id)
        .order("rank", { ascending: true })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  // Scout report: upcoming pairing (round not completed) + past opponents
  const { data: scout } = useQuery({
    queryKey: ["player", p.id, "scout"],
    queryFn: async () => {
      const { data: pairings } = await supabase
        .from("pairings")
        .select("id, result, white_id, black_id, round:rounds(round_number, status, tournament:tournaments(name,start_date))")
        .or(`white_id.eq.${p.id},black_id.eq.${p.id}`);
      const enriched = await Promise.all((pairings ?? []).map(async (pr: any) => {
        const oppId = pr.white_id === p.id ? pr.black_id : pr.white_id;
        if (!oppId) return { ...pr, opp: null };
        const { data: opp } = await supabase
          .from("players")
          .select("id, full_name, slug, rating, city")
          .eq("id", oppId)
          .maybeSingle();
        return { ...pr, opp, playerSide: pr.white_id === p.id ? "white" : "black" };
      }));
      const upcoming = enriched.find((e: any) => e.round?.status !== "completed" && !e.result);
      const past = enriched.filter((e: any) => e.round?.status === "completed" || e.result);
      return { upcoming, past };
    },
  });

  const share = async () => {
    const url = window.location.href;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: `${p.full_name} — Chess Passport`, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); } catch {}
    alert("Link copied to clipboard");
  };

  const download = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#0b1220" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${p.full_name.replace(/\s+/g, "-").toLowerCase()}-chess-passport.png`;
      a.click();
    } finally { setDownloading(false); }
  };

  const tournamentsPlayed = history.length;
  const initials = p.full_name.split(/\s+/).slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl font-semibold">Chess Passport</h1>
        <div className="flex gap-2">
          <button onClick={share} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent/20">
            <Share2 size={14} /> Share
          </button>
          <button onClick={download} disabled={downloading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">
            <Download size={14} /> {downloading ? "Preparing…" : "Download as image"}
          </button>
        </div>
      </div>

      {/* Passport card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-[#0b1220] via-[#111b30] to-[#0b1220] text-white p-8 shadow-2xl"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center font-display text-3xl text-navy shadow-lg">
              {initials}
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-gold/80">64 Squares Society · Passport</div>
              <div className="mt-1 font-display text-3xl sm:text-4xl font-semibold">{p.full_name}</div>
              <div className="text-sm text-white/70 mt-1">{p.city}{p.state ? `, ${p.state}` : ""}{p.school ? ` · ${p.school}` : ""}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Rating</div>
            <div className="font-display text-5xl text-gold leading-none">{p.rating || "—"}</div>
            {p.fide_id && <div className="text-xs text-white/60 mt-1">FIDE {p.fide_id}</div>}
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-3 gap-3">
          <Stat label="Tournaments" value={tournamentsPlayed} />
          <Stat label="Best rank" value={best?.rank ? `#${best.rank}` : "—"} />
          <Stat label="Best points" value={best?.points ?? "—"} />
        </div>

        <div className="relative mt-8">
          <div className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">Rating trend</div>
          <div className="h-40 rounded-xl bg-white/5 border border-white/10 p-2">
            {trend && trend.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <XAxis dataKey="date" tick={{ fill: "#ffffff88", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#ffffff88", fontSize: 11 }} domain={["dataMin - 50", "dataMax + 50"]} />
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #d4af5588" }} />
                  <Line type="monotone" dataKey="rating" stroke="#d4af55" strokeWidth={2} dot={{ fill: "#d4af55", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-white/50">Not enough tournaments yet for a trend.</div>
            )}
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between text-xs text-white/50">
          <div>Every Move Matters</div>
          <div>64squaressociety.in</div>
        </div>
      </div>

      {/* Scout report */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="text-gold" size={18} />
          <h2 className="font-display text-2xl">Opponent scout report</h2>
        </div>
        {scout?.upcoming?.opp ? (
          <ScoutBlock upcoming={scout.upcoming} past={scout.past} playerId={p.id} />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground flex items-center gap-2">
            <Sparkles size={14} className="text-gold" /> No upcoming pairing yet. Once round pairings are published, your next opponent's history in our tournaments will appear here.
          </div>
        )}
      </section>

      {/* Tournament history */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="text-gold" size={18} />
          <h2 className="font-display text-2xl">Tournament history</h2>
        </div>
        {history.length === 0 ? (
          <div className="text-muted-foreground text-sm">No tournaments yet.</div>
        ) : (
          <ul className="space-y-2">
            {history.map((h: any) => (
              <li key={h.id} className="rounded-xl border border-border bg-card p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{h.tournament?.name}</div>
                  <div className="text-xs text-muted-foreground">{h.tournament?.start_date}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted">{h.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="text-xs uppercase tracking-[0.15em] text-white/60">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}

function ScoutBlock({ upcoming, past, playerId }: { upcoming: any; past: any[]; playerId: string }) {
  const opp = upcoming.opp;
  const priorMatches = past.filter((p) => p.opp?.id === opp.id);
  const wins = priorMatches.filter((m) => (m.playerSide === "white" && m.result === "white_wins") || (m.playerSide === "black" && m.result === "black_wins")).length;
  const losses = priorMatches.filter((m) => (m.playerSide === "white" && m.result === "black_wins") || (m.playerSide === "black" && m.result === "white_wins")).length;
  const draws = priorMatches.filter((m) => m.result === "draw").length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Next opponent · Round {upcoming.round?.round_number} · {upcoming.round?.tournament?.name}</div>
          <Link to="/players/$slug" params={{ slug: opp.slug }} className="font-display text-2xl mt-1 block hover:text-gold">
            {opp.full_name}
          </Link>
          <div className="text-sm text-muted-foreground">{opp.city} · Rating {opp.rating || "Unrated"} · You play {upcoming.playerSide}</div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <ScoutStat label="W" value={wins} color="text-success" />
          <ScoutStat label="D" value={draws} color="text-muted-foreground" />
          <ScoutStat label="L" value={losses} color="text-destructive" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        {priorMatches.length === 0 ? (
          <div className="text-sm text-muted-foreground">No prior matches in our tournaments yet — a fresh page.</div>
        ) : (
          <ul className="text-sm space-y-1">
            {priorMatches.map((m) => (
              <li key={m.id} className="flex justify-between">
                <span>{m.round?.tournament?.name} · R{m.round?.round_number}</span>
                <span className="text-muted-foreground">{formatResult(m, playerId)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ScoutStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className={`font-display text-xl ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function formatResult(m: any, playerId: string) {
  if (m.result === "draw") return "Draw";
  if (m.result === "white_wins") return m.white_id === playerId ? "Win" : "Loss";
  if (m.result === "black_wins") return m.black_id === playerId ? "Win" : "Loss";
  return "—";
}
