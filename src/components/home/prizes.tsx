import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { CountUp } from "@/components/count-up";
import type { Cms } from "@/lib/home-content";

const EASE = [0.22, 1, 0.36, 1] as const;

const SPLIT = [
  { place: "1st", share: 0.4, glyph: "♛", h: "h-40 sm:h-52" },
  { place: "2nd", share: 0.25, glyph: "♜", h: "h-32 sm:h-40" },
  { place: "3rd", share: 0.15, glyph: "♝", h: "h-24 sm:h-32" },
];

/** Act IV — Achievement. Columns rise from the board, values count up. */
export function Prizes({ cms, pool }: { cms: Cms; pool: number }) {
  const reduce = useReducedMotion();

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
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Achievement</span>
        </div>
        <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {cms.t("home_prize_heading", "Prizes worth playing for")}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {cms.t("home_prize_body", "A transparent prize split, published before the first round.")}
        </p>
      </motion.div>

      <div className="mt-12 flex items-end justify-center gap-3 sm:gap-6">
        {SPLIT.map((s, i) => {
          const amount = Math.round(pool * s.share);
          return (
            <motion.div
              key={s.place}
              className="flex w-1/3 max-w-[220px] flex-col items-center"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.12 * i, ease: EASE }}
            >
              <span className="mb-3 text-3xl text-gold">{s.glyph}</span>
              <div className="font-display text-2xl font-semibold tabular-nums">
                {pool > 0 ? <CountUp value={amount} format={(n) => `₹${n.toLocaleString("en-IN")}`} /> : "—"}
              </div>
              <div
                className={`square mt-3 flex ${s.h} w-full items-end justify-center rounded-t-xl pb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground`}
              >
                {s.place}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link to="/prize-structure" className="story-link text-sm text-gold">
          See the full prize structure
        </Link>
      </div>
    </section>
  );
}
