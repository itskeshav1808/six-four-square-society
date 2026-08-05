import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ClipboardCheck, ShieldCheck, Swords, ListOrdered, Crown } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { title: "Registration", body: "Pick your category, submit your details, secure your seat.", icon: ClipboardCheck },
  { title: "Verification", body: "We confirm age, rating proof, and payment before pairing.", icon: ShieldCheck },
  { title: "Tournament", body: "Round-by-round play with live pairings and standings.", icon: Swords },
  { title: "Results", body: "Scores published the same day, tie-breaks fully transparent.", icon: ListOrdered },
  { title: "Champion", body: "Trophies, prize money, and a certificate with your passport QR.", icon: Crown },
];

/** Scene 5 — the journey, animated like a knight advancing checkpoint to checkpoint. */
export function JourneyTimeline() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const pieceY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, ease: EASE }}
        className="text-center"
      >
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The Game Plan</div>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">From First Move to Champion</h2>
      </motion.div>

      <div ref={ref} className="relative mt-14 pl-14 sm:pl-20">
        {/* Track */}
        <div className="absolute left-6 sm:left-9 top-2 bottom-2 w-px bg-border" />
        <motion.div
          className="absolute left-6 sm:left-9 top-2 bottom-2 w-px origin-top bg-gold"
          style={{ scaleY: reduce ? 1 : lineScale, willChange: "transform" }}
        />
        {/* Travelling knight */}
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute left-6 sm:left-9 top-2 -translate-x-1/2 text-gold text-xl select-none"
            style={{ y: pieceY, willChange: "transform" }}
          >
            ♘
          </motion.span>
        )}

        <ol className="space-y-10">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: i % 2 === 0 ? -24 : 24, y: 12 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: EASE }}
              className="relative"
            >
              <span className="absolute -left-[2.1rem] sm:-left-[2.9rem] top-1 grid place-items-center h-7 w-7 rounded-full border border-gold/50 bg-card text-gold">
                <s.icon size={14} />
              </span>
              <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-gold/40">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Move {i + 1}</div>
                <h3 className="mt-1 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
