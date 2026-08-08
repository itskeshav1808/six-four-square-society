import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { playTick } from "@/lib/move-sfx";
import type { Cms } from "@/lib/home-content";

const EASE = [0.22, 1, 0.36, 1] as const;

type MediaItem = {
  id: string;
  url: string;
  caption?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  created_at?: string | null;
};

/**
 * Signature gallery: a lit main stage with a draggable filmstrip beneath it.
 * The stage cross-fades on change and the caption follows the image in.
 */
export function GalleryShowcase({ cms, media }: { cms: Cms; media: MediaItem[] }) {
  const reduce = useReducedMotion();
  const items = media.slice(0, 12);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(true);
  const strip = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ down: boolean; startX: number; startLeft: number; moved: number }>({
    down: false,
    startX: 0,
    startLeft: 0,
    moved: 0,
  });

  // Fade out, swap image + caption in the invisible gap, fade back in.
  useEffect(() => {
    if (active === shown) return;
    if (reduce) {
      setShown(active);
      return;
    }
    setVisible(false);
    const id = window.setTimeout(() => {
      setShown(active);
      setVisible(true);
    }, 220);
    return () => window.clearTimeout(id);
  }, [active, shown, reduce]);

  if (items.length === 0) return null;
  const current = items[shown]!;
  const label = current.title || current.caption || "";
  const year = current.created_at ? new Date(current.created_at).getFullYear() : null;

  const select = (i: number) => {
    if (i === active) return;
    setActive(i);
    playTick();
  };

  const onDown = (e: React.MouseEvent) => {
    const el = strip.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, startLeft: el.scrollLeft, moved: 0 };
  };
  const onMove = (e: React.MouseEvent) => {
    const el = strip.current;
    if (!el || !drag.current.down) return;
    const delta = e.pageX - drag.current.startX;
    drag.current.moved = Math.abs(delta);
    el.scrollLeft = drag.current.startLeft - delta * 1.4;
  };
  const endDrag = () => {
    drag.current.down = false;
  };

  return (
    <section className="stage relative isolate overflow-hidden py-20">
      <div aria-hidden className="stage-vignette absolute inset-0" />
      <div className="on-navy relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 rule-gold" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-gold">Gallery</span>
            </div>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {cms.t("home_gallery_heading", "From the arena")}
            </h2>
            <p className="mt-3 text-muted-foreground">{cms.t("home_gallery_body", "")}</p>
          </div>
          <Link to="/gallery" className="group inline-flex items-center gap-2 text-sm text-gold">
            {cms.t("home_gallery_cta", "View full gallery")}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-2xl ring-1 ring-gold/25">
          <img
            src={current.url}
            alt={label || "Tournament photograph"}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
            style={{ opacity: visible ? 1 : 0, willChange: "opacity" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(0deg, oklch(0.12 0.03 165 / 0.8), transparent 55%)" }}
          />
          <div className="absolute bottom-5 left-5 right-5">
            {[label, [current.category, year].filter(Boolean).join(" · "), current.description]
              .filter(Boolean)
              .map((line, i) => (
                <div
                  key={i}
                  className={
                    i === 0
                      ? "font-display text-xl text-foreground sm:text-2xl"
                      : "mt-1 text-xs text-muted-foreground sm:text-sm"
                  }
                  style={{
                    transition: reduce
                      ? undefined
                      : `opacity .5s ease ${60 + i * 60}ms, clip-path .6s cubic-bezier(.22,1,.36,1) ${60 + i * 60}ms`,
                    opacity: visible ? 1 : 0,
                    clipPath: visible ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
                  }}
                >
                  {line}
                </div>
              ))}
          </div>
        </div>

        <div
          ref={strip}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          className="mt-3 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ cursor: "grab" }}
        >
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                if (drag.current.moved > 6) return;
                select(i);
              }}
              aria-label={m.title || `Photograph ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg outline outline-1 transition-all duration-300 sm:h-20 sm:w-32 ${
                i === active ? "outline-gold scale-[1.03]" : "outline-gold/15 opacity-65 hover:opacity-100"
              }`}
            >
              <img src={m.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
