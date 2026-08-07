import { motion, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/count-up";
import { useMounted } from "@/components/home/use-mounted";
import { useMounted } from "@/components/home/use-mounted";
import type { Cms } from "@/lib/home-content";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Act II — Development. Sentences arrive one by one from behind a clipping
 * edge, then the numbers count themselves up under drawing gold rules.
 */
export function AboutAct({ cms }: { cms: Cms }) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const mounted = useMounted();
  const sentences = cms.lines("home_about_body", [
    "Chess rewards patience.",
    "So do we. Every 64 Squares event is run by players, for players.",
  ]);
  const stats = cms.pairs("home_stats", []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <motion.div
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-3"
          >
            <span className="h-px w-8 rule-gold" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Development</span>
          </motion.div>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className="block"
                initial={!mounted ? false : reduce ? { opacity: 0 } : { opacity: 0, y: "110%" }}
                whileInView={{ opacity: 1, y: "0%" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.85, ease: EASE }}
              >
                {cms.t("home_about_heading", "A society built for the long game")}
              </motion.span>
            </span>
          </h2>
        </div>

        <div>
          <div className="space-y-3 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {sentences.map((s, i) => (
              <span key={i} className="block overflow-hidden">
                <motion.span
                  className="block"
                  style={{ willChange: "transform, opacity" }}
                  initial={!mounted ? false : reduce ? { opacity: 0 } : { opacity: 0, y: "105%" }}
                  whileInView={{ opacity: 1, y: "0%" }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
                >
                  {s}
                </motion.span>
              </span>
            ))}
          </div>

          {stats.length > 0 ? (
            <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
              {stats.map(([value, label], i) => {
                const numeric = Number(String(value).replace(/[^\d.]/g, ""));
                return (
                  <div key={label + i}>
                    <motion.div
                      className="h-px w-full origin-left rule-gold"
                      initial={mounted ? { scaleX: 0 } : false}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
                    />
                    <div className="mt-3 font-display text-4xl font-semibold tabular-nums">
                      {Number.isFinite(numeric) && numeric > 0 ? <CountUp value={numeric} /> : value}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
