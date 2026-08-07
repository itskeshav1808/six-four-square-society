import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import type { Cms } from "@/lib/home-content";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Act III — the journey, played as a sequence of moves. A gold file is drawn by
 * scroll progress and a knight rides it; each step's square fills as it lands.
 */
export function Journey({ cms }: { cms: Cms }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
  const knightTop = useTransform(progress, [0, 1], ["0%", "100%"]);

  const steps = cms.pairs("home_journey", []);
  if (steps.length === 0) return null;

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
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Middlegame</span>
        </div>
        <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {cms.t("home_journey_heading", "From registration to champion")}
        </h2>
      </motion.div>

      <div ref={ref} className="relative mt-12 pl-12 sm:pl-16">
        {/* The file being walked */}
        <div aria-hidden className="absolute left-4 top-2 bottom-2 w-px bg-border sm:left-6" />
        <motion.div
          aria-hidden
          className="absolute left-4 top-2 w-px origin-top rule-gold sm:left-6"
          style={{ bottom: "0.5rem", scaleY: reduce ? 1 : progress }}
        />
        {!reduce ? (
          <motion.span
            aria-hidden
            className="absolute left-4 z-10 -ml-3 grid size-6 place-items-center rounded-full bg-gold text-[13px] text-gold-foreground sm:left-6"
            style={{ top: knightTop, willChange: "transform" }}
          >
            ♞
          </motion.span>
        ) : null}

        <ol className="space-y-8">
          {steps.map(([title, body], i) => (
            <motion.li
              key={title + i}
              className="relative"
              style={{ willChange: "transform, opacity" }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span className="absolute -left-12 grid size-8 place-items-center rounded-md border border-gold/30 font-display text-sm text-gold sm:-left-16 sm:size-9">
                {i + 1}
              </span>
              <h3 className="font-display text-2xl font-semibold">{title}</h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
