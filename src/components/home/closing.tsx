import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Magnetic } from "@/components/magnetic";
import { useMounted } from "@/components/home/use-mounted";
import type { Cms } from "@/lib/home-content";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Final scene — the hall darkens and the king takes the last square.
 */
export function Closing({ cms }: { cms: Cms }) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const veil = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 0.7]);
  const kingX = useTransform(scrollYProgress, [0.15, 0.85], ["-160%", "0%"]);

  return (
    <section ref={ref} className="stage relative isolate overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ opacity: veil, background: "oklch(0.09 0.02 165)" }}
      />
      <div aria-hidden className="checker-band absolute inset-x-0 top-0 h-16 opacity-25" />

      <div className="on-navy relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <div className="mx-auto grid w-full max-w-[220px] grid-cols-4 overflow-hidden rounded-xl ring-1 ring-gold/25">
          {Array.from({ length: 16 }, (_, i) => {
            const dark = (Math.floor(i / 4) + (i % 4)) % 2 === 1;
            return (
              <div key={i} className={`relative aspect-square ${dark ? "bg-navy" : "bg-secondary/90"}`}>
                {i === 15 ? (
                  <motion.span
                    className="absolute inset-0 grid place-items-center text-2xl text-gold"
                    style={{ x: reduce ? 0 : kingX, willChange: "transform" }}
                  >
                    ♚
                  </motion.span>
                ) : null}
              </div>
            );
          })}
        </div>

        <h2 className="mt-10 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
          <span className="block overflow-hidden pb-[0.06em]">
            <motion.span
              className="block italic text-gradient-gold"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: "110%" }}
              whileInView={{ opacity: 1, y: "0%" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              {cms.t("home_final_heading", "Your Move.")}
            </motion.span>
          </span>
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          className="mx-auto mt-4 max-w-md text-muted-foreground"
        >
          {cms.t("home_final_body", "The next tournament is open for entries.")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Magnetic>
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-sm font-semibold text-gold-foreground transition-transform hover:scale-[1.03] active:scale-100"
            >
              {cms.t("home_final_cta", "Register now")}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          <Link
            to="/contact"
            className="glass inline-flex items-center rounded-full px-6 py-4 text-sm font-medium transition-transform hover:scale-[1.03]"
          >
            Talk to the organisers
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
