import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Puzzle as PuzzleIcon, Eye } from "lucide-react";

type Puzzle = {
  fen: string;
  solution: string;
  side: "white" | "black";
  hint?: string;
  source: string;
  link?: string;
};

// Compute FEN from PGN + initialPly using a tiny move applier is heavy;
// we use chessboardimage.com for lightweight static board rendering from FEN.
function boardImage(fen: string) {
  const enc = encodeURIComponent(fen);
  return `https://fen2image.chessvision.ai/${enc}`;
}

async function fetchCustom(): Promise<Puzzle | null> {
  const { data } = await supabase
    .from("puzzles")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    fen: data.fen,
    solution: data.solution,
    side: (data.side_to_move as "white" | "black") ?? "white",
    hint: data.hint ?? undefined,
    source: "64 Squares Society",
  };
}

async function fetchLichess(): Promise<Puzzle | null> {
  try {
    const res = await fetch("https://lichess.org/api/puzzle/daily");
    if (!res.ok) return null;
    const j = await res.json();
    const moves: string[] = (j.game?.pgn ?? "").split(" ").filter(Boolean);
    const initialPly: number = j.puzzle?.initialPly ?? 0;
    // derive fen client-side using chess.js is heavy; use lichess embed FEN
    // fallback: use their game_id via a static SVG endpoint
    const fen: string = j.puzzle?.fen ?? "";
    if (!fen) return null;
    const side = fen.split(" ")[1] === "w" ? "white" : "black";
    const solutionUci: string[] = j.puzzle?.solution ?? [];
    return {
      fen,
      solution: solutionUci.join(" "),
      side,
      source: "Lichess daily",
      link: `https://lichess.org/training/${j.puzzle?.id ?? "daily"}`,
    };
  } catch {
    return null;
  }
}

// Lichess doesn't expose FEN in /daily; we approximate by using their training embed as fallback.
export function DailyPuzzle() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [embedFallback, setEmbedFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const custom = await fetchCustom();
      if (cancelled) return;
      if (custom) {
        setPuzzle(custom);
        setLoading(false);
        return;
      }
      const lc = await fetchLichess();
      if (cancelled) return;
      if (lc) {
        setPuzzle(lc);
      } else {
        setEmbedFallback(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="rounded-3xl border border-border bg-card/60 backdrop-blur p-6 sm:p-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_1.2fr] items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
            <PuzzleIcon size={14} /> Puzzle of the Day
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold">Find the best move</h2>
          <p className="mt-3 text-muted-foreground text-sm">
            {loading
              ? "Loading today's position…"
              : puzzle
              ? `${puzzle.side === "white" ? "White" : "Black"} to play. Take your time — think one full plan ahead.`
              : "Warm up your calculation on today's position from Lichess."}
          </p>

          {puzzle?.hint && !reveal && (
            <p className="mt-3 text-xs text-muted-foreground italic">Hint: {puzzle.hint}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {puzzle && (
              <button
                onClick={() => setReveal((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
              >
                <Eye size={14} /> {reveal ? "Hide solution" : "Reveal solution"}
              </button>
            )}
            {puzzle?.link && (
              <a
                href={puzzle.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent/20"
              >
                Solve on Lichess
              </a>
            )}
          </div>

          {reveal && puzzle && (
            <div className="mt-4 rounded-xl bg-muted/50 border border-border p-4 text-sm">
              <div className="text-xs text-muted-foreground mb-1">Best line</div>
              <div className="font-mono text-gold">{puzzle.solution}</div>
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">Source: {puzzle?.source ?? "Lichess"}</div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-background/60 aspect-square max-w-[420px] w-full mx-auto">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-muted" />
          ) : puzzle ? (
            <img
              src={boardImage(puzzle.fen)}
              alt="Chess puzzle position"
              loading="lazy"
              className="w-full h-full object-contain"
              onError={() => setEmbedFallback(true)}
            />
          ) : embedFallback ? (
            <iframe
              title="Daily puzzle"
              src="https://lichess.org/training/frame?theme=brown&bg=dark"
              className="w-full h-full"
              loading="lazy"
            />
          ) : null}
          {embedFallback && puzzle && (
            <iframe
              title="Daily puzzle"
              src="https://lichess.org/training/frame?theme=brown&bg=dark"
              className="w-full h-full"
              loading="lazy"
            />
          )}
        </div>
      </div>
    </section>
  );
}
