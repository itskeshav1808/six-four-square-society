import { motion, useReducedMotion } from "framer-motion";
import { useMounted } from "@/components/home/use-mounted";
import type { Cms } from "@/lib/home-content";

const EASE = [0.22, 1, 0.36, 1] as const;
const GLYPHS = ["♜", "♞", "♝", "♛", "♚", "♟"];

/**
 * How we run the board. Each card is a square being uncovered: the panel wipes
 * open with a clip-path inset, so nothing shifts layout while it animates.
 */
export function Pillars({ cms }: { cms: Cms }) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const items = cms.pairs("home_pillars", []);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: EASE }}
        className="max-w-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="h-px w-8 rule-gold" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Position</span>
        </div>
        <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {cms.t("home_pillars_heading", "How we run the board")}
        </h2>
      </motion.div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {items.map(([title, body], i) => (
          <motion.article
            key={title + i}
            className="square group rounded-2xl p-6 sm:p-8"
            style={{ willChange: "clip-path, opacity" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 100% 0 0 round 1rem)" }}
            whileInView={{ opacity: 1, clipPath: "inset(0 0% 0 0 round 1rem)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
          >
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-gold/25 text-2xl text-gold transition-transform duration-500 group-hover:-rotate-12">
                {GLYPHS[i % GLYPHS.length]}
              </span>
              <div>
                <h3 className="font-display text-2xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
