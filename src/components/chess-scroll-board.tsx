import { useEffect, useRef } from "react";
import {
  buildSnapshots,
  parseDisabledSections,
  parseScript,
  parseThemes,
  type BoardTheme,
  type Piece,
  type Rgb,
} from "@/lib/board-config";
import { initSfx, playMoveFeedback } from "@/lib/move-sfx";
import type { Cms } from "@/lib/home-content";

/**
 * Persistent scroll-driven chessboard behind the homepage.
 *
 * - One fixed canvas paints the 8x8 board; colours are a weighted blend of every
 *   themed section currently on screen, so transitions dissolve instead of snap.
 * - Pieces are individual absolutely-positioned nodes moved once per ply from a
 *   precomputed snapshot array, so no chess rules run at runtime.
 * - Scroll position is the single source of truth: scrolling back replays the
 *   game in reverse.
 */
export function ChessScrollBoard({ cms }: { cms: Cms }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const pieceRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const themes = parseThemes(cms.b("board_themes"));
  const script = parseScript(cms.b("board_chess_script"));
  const disabled = parseDisabledSections(cms.b("board_disabled_sections"));
  const snapshots = buildSnapshots(script);
  const start: Piece[] = snapshots[0]!;

  useEffect(() => {
    initSfx();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = layerRef.current;
    if (!canvas || !layer) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (reduce) layer.dataset.reduced = "1";

    let sections: HTMLElement[] = Array.from(document.querySelectorAll<HTMLElement>("[data-board-theme]"));
    let visible = new Set<HTMLElement>();
    let size = 0;
    let dpr = 1;
    let raf = 0;
    let dirty = true;
    let lastPaint = 0;
    let lastMove = -1;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target as HTMLElement);
          else visible.delete(e.target as HTMLElement);
        }
        dirty = true;
      },
      { threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 3);
      size = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.62);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      layer.style.setProperty("--board-size", `${size}px`);
      layer.style.setProperty("--cell", `${size / 8}px`);
      dirty = true;
    };

    const mix = (a: Rgb, b: Rgb, w: number): Rgb => [
      a[0] + (b[0] - a[0]) * w,
      a[1] + (b[1] - a[1]) * w,
      a[2] + (b[2] - a[2]) * w,
    ];
    const css = (c: Rgb) => `rgb(${c[0].toFixed(0)} ${c[1].toFixed(0)} ${c[2].toFixed(0)})`;

    const blend = (): { theme: BoardTheme; active: boolean } => {
      const vh = window.innerHeight;
      const weights: Record<string, number> = {};
      let total = 0;
      for (const s of sections) {
        if (!visible.has(s)) continue;
        const id = s.dataset.boardSection ?? "";
        if (disabled.has(id)) continue;
        const key = s.dataset.boardTheme ?? "dark";
        if (!themes[key]) continue;
        const r = s.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
        if (overlap <= 0) continue;
        weights[key] = (weights[key] ?? 0) + overlap;
        total += overlap;
      }
      if (total <= 0) return { theme: themes.dark!, active: false };
      let acc: BoardTheme | null = null;
      let done = 0;
      for (const [key, w] of Object.entries(weights)) {
        const t = themes[key]!;
        const share = w / total;
        if (!acc) {
          acc = { ...t };
          done = share;
          continue;
        }
        const k = share / (done + share);
        acc = {
          light: mix(acc.light, t.light, k),
          dark: mix(acc.dark, t.dark, k),
          pieceLight: mix(acc.pieceLight, t.pieceLight, k),
          pieceDark: mix(acc.pieceDark, t.pieceDark, k),
        };
        done += share;
      }
      return { theme: acc!, active: true };
    };

    const applySnapshot = (index: number, announce: boolean) => {
      const snap = snapshots[Math.max(0, Math.min(index, snapshots.length - 1))]!;
      const cell = size / 8;
      for (const p of snap) {
        const el = pieceRefs.current[p.id];
        if (!el) continue;
        el.style.left = `${p.col * cell}px`;
        el.style.top = `${p.row * cell}px`;
        el.style.opacity = p.captured ? "0" : "1";
      }
      if (!announce || index === 0) return;
      const move = script[index - 1];
      if (!move) return;
      playMoveFeedback(move.mate ? "mate" : move.capturesPieceId ? "capture" : "move");
    };

    const paint = (now: number) => {
      raf = 0;
      if (!dirty) return;
      const minFrame = mobile ? 33 : 16;
      if (now - lastPaint < minFrame) {
        schedule();
        return;
      }
      lastPaint = now;
      dirty = false;

      const { theme, active } = blend();
      layer.style.opacity = active ? "1" : "0";
      if (!active) return;

      // Board squares.
      const cell = (size / 8) * dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          ctx.fillStyle = css((r + c) % 2 === 1 ? theme.dark : theme.light);
          ctx.fillRect(Math.round(c * cell), Math.round(r * cell), Math.ceil(cell), Math.ceil(cell));
        }
      }
      ctx.strokeStyle = css(mix(theme.pieceDark, theme.light, 0.35));
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      layer.style.setProperty("--piece-light", css(theme.pieceLight));
      layer.style.setProperty("--piece-dark", css(theme.pieceDark));

      // Scripted game — concludes at ~87% of scroll so it never gets cut off.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      const moveIndex = Math.round(Math.min(progress / 0.87, 1) * script.length);
      if (moveIndex !== lastMove) {
        const announce = lastMove >= 0 && moveIndex > lastMove;
        lastMove = moveIndex;
        applySnapshot(moveIndex, announce);
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onScroll = () => {
      dirty = true;
      schedule();
    };
    const onResize = () => {
      sections = Array.from(document.querySelectorAll<HTMLElement>("[data-board-theme]"));
      resize();
      applySnapshot(Math.max(lastMove, 0), false);
      schedule();
    };

    resize();
    applySnapshot(0, false);
    schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cms]);

  return (
    <div
      ref={layerRef}
      aria-hidden
      className="chess-board-layer pointer-events-none fixed inset-0 grid place-items-center transition-opacity duration-500"
      style={{ zIndex: 1 }}
    >
      <div className="relative" style={{ width: "var(--board-size, 0px)", height: "var(--board-size, 0px)" }}>
        <canvas ref={canvasRef} className="block rounded-md" style={{ opacity: 0.38 }} />
        {start.map((p) => (
          <span
            key={p.id}
            ref={(el) => {
              pieceRefs.current[p.id] = el;
            }}
            className="chess-board-piece absolute grid place-items-center select-none"
            style={{
              width: "var(--cell, 0px)",
              height: "var(--cell, 0px)",
              fontSize: "calc(var(--cell, 0px) * 0.74)",
              lineHeight: 1,
              color: p.side === "w" ? "var(--piece-light)" : "var(--piece-dark)",
            }}
          >
            {p.glyph}
          </span>
        ))}
      </div>
    </div>
  );
}
