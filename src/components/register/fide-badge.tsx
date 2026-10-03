import { useEffect, useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { lookupFide, type FidePlayer } from "@/lib/fide.functions";

/** Non-blocking FIDE ID check. Shows a gold badge when found; silent otherwise. */
export function FideBadge({ fideId, onFound }: { fideId: string; onFound: (rating: number) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "found" | "none">("idle");
  const [p, setP] = useState<FidePlayer | null>(null);
  const id = fideId.trim();

  useEffect(() => {
    if (!/^\d{4,10}$/.test(id)) { setState("idle"); setP(null); return; }
    let cancelled = false;
    setState("loading");
    const t = setTimeout(async () => {
      const r = await lookupFide({ data: { id } }).catch(() => null);
      if (cancelled) return;
      setP(r);
      setState(r ? "found" : "none");
      const best = r?.standard ?? r?.rapid ?? r?.blitz;
      if (best) onFound(best);
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (state === "loading") return <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" />Checking FIDE records…</div>;
  if (state === "none") return <div className="mt-1 text-xs text-muted-foreground">Couldn't verify this ID right now — you can still continue.</div>;
  if (state !== "found" || !p) return <div className="mt-1 text-xs text-muted-foreground">Optional. We'll fetch your rating automatically.</div>;
  return (
    <div className="mt-2 rounded-lg border border-gold/50 bg-gold/10 p-2.5 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-gold"><BadgeCheck size={14} />FIDE verified</div>
      <div className="mt-1 font-medium text-foreground">{p.title ? `${p.title} ` : ""}{p.name}{p.federation ? ` · ${p.federation}` : ""}</div>
      <div className="mt-0.5 text-muted-foreground">
        Standard {p.standard ?? "—"} · Rapid {p.rapid ?? "—"} · Blitz {p.blitz ?? "—"}
      </div>
    </div>
  );
}
