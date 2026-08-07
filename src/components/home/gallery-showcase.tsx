import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useMounted } from "@/components/home/use-mounted";
import type { Cms } from "@/lib/home-content";

const EASE = [0.22, 1, 0.36, 1] as const;

type MediaItem = { id: string; url: string; caption?: string | null; title?: string | null };

/**
 * Signature gallery: one large lit stage image with a thumbnail rail below.
 * Selecting a thumbnail cross-fades the stage — no layout shift, no reflow.
 */
export function GalleryShowcase({ cms, media }: { cms: Cms; media: MediaItem[] }) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const items = media.slice(0, 9);
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;

  const current = items[active]!;
  const label = current.title || current.caption || "";

  return (
    <section className="stage relative isolate overflow-hidden py-20">
      <div aria-hidden className="stage-vignette absolute inset-0" />
      <div className="on-navy relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={mounted ? ({ opacity: 0, y: 10 ) : false}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE }}
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

        <motion.div
          initial={mounted ? (reduce ? { opacity: 0 ) : false} : { opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-2xl ring-1 ring-gold/25"
        >
          {items.map((m, i) => (
            <motion.img
              key={m.id}
              src={m.url}
              alt={m.title || m.caption || "Tournament photograph"}
              loading={i === 0 ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ willChange: "opacity" }}
              animate={{ opacity: i === active ? 1 : 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          ))}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(0deg, oklch(0.12 0.03 165 / 0.75), transparent 55%)" }}
          />
          {label ? (
            <div className="absolute bottom-4 left-5 right-5 font-display text-lg text-foreground">{label}</div>
          ) : null}
        </motion.div>

        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photograph ${i + 1}`}
              aria-current={i === active}
              className={`aspect-square overflow-hidden rounded-lg ring-1 transition-all duration-300 ${
                i === active ? "ring-gold" : "ring-gold/15 opacity-65 hover:opacity-100"
              }`}
            >
              <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
