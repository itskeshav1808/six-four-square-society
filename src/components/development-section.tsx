import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Users, Calendar, ShieldCheck } from "lucide-react";
import { ActHeading, EASE } from "@/components/act";
import { Tilt } from "@/components/tilt";
import { CountUp } from "@/components/count-up";

const PILLARS = [
  {
    icon: Trophy,
    title: "Rated tournaments",
    body: "FIDE-compliant events across every age group and rating bracket, with arbiters who know the rulebook cold.",
    glyph: "♜",
  },
  {
    icon: ShieldCheck,
    title: "Verified play",
    body: "Every entry is checked — age, rating proof, and payment — before pairings are published.",
    glyph: "♝",
  },
  {
    icon: Users,
    title: "A real community",
    body: "Club players, prodigies, coaches, and parents in one room. Post-game analysis included.",
    glyph: "♞",
  },
  {
    icon: Calendar,
    title: "Year-round calendar",
    body: "Regular opens, training camps, and championship qualifiers — never a dead season.",
    glyph: "♛",
  },
];

const STATS = [
  { value: 64, suffix: "", label: "Squares. No shortcuts." },
  { value: 9, suffix: " rounds", label: "Swiss format" },
  { value: 100, suffix: "%", label: "Same-day results" },
];

/** Development act — the pillars take their squares. */
export function DevelopmentSection() {
  const reduce = useReducedMotion();

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <ActHeading
        index="II."
        act="The Development"
        move="Nf3"
        title={["Built the way", "tournaments should run."]}
        blurb="Four pillars we refuse to compromise on — because a good tournament is felt in the details."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.6, delay: i * 0.09, ease: EASE }}
            style={{ willChange: "transform, opacity" }}
          >
            <Tilt className="h-full rounded-2xl">
              <div className="glow-border group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 elev transition-colors hover:border-gold/40">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-4 select-none text-7xl text-gold/10 transition-transform duration-500 group-hover:-translate-y-1 group-hover:text-gold/20"
                >
                  {p.glyph}
                </span>
                <p.icon size={24} className="relative text-gold" />
                <h3 className="relative mt-5 font-display text-xl font-semibold">{p.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </Tilt>
          </motion.div>
        ))}
      </div>

      <div className="hairline mt-16" />

      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: i * 0.1, ease: EASE }}
            className="text-center sm:text-left"
          >
            <div className="font-display text-5xl font-semibold tabular-nums">
              <CountUp value={s.value} />
              <span className="text-gold">{s.suffix}</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
