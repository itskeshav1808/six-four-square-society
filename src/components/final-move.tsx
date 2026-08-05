import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Magnetic } from "@/components/magnetic";
import { NotationText } from "@/components/hero-scene";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Final scene — the last move. Background darkens, the king reaches the final square. */
export function FinalMove() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const veil = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 0.92]);
  const kingX = useTransform(scrollYProgress, [0.15, 0.85], ["-38%", "0%"]);

  return (
    <section ref={ref} className="relative overflow-hidden">
      <motion.div aria-hidden className="absolute inset-0 bg-navy" style={{ opacity: veil }} />
      <div className="on-navy relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-28 text-center">
        {/* Final rank */}
        <div className="mx-auto flex w-40 justify-between opacity-70">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-6 w-6 rounded-sm ${i % 2 === 0 ? "bg-gold/70" : "bg-gold/20"}`} />
          ))}
        </div>
        <motion.span
          aria-hidden
          className="mt-2 block text-4xl text-gold"
          style={{ x: reduce ? 0 : kingX, willChange: "transform" }}
        >
          ♚
        </motion.span>

        <h2 className="mt-8 font-display text-5xl sm:text-6xl font-semibold">
          <NotationText text="Your Move." />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
          className="mt-4 text-muted-foreground"
        >
          Join the next tournament.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.75, ease: EASE }}
          className="mt-8 flex justify-center"
        >
          <Magnetic>
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-gold text-gold-foreground px-8 py-3.5 text-sm font-medium transition-transform hover:scale-[1.04] active:scale-100"
            >
              Register Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}
