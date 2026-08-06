import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Medal, Award, Gift } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { ActHeading, EASE } from "@/components/act";
import { Link } from "@tanstack/react-router";

/**
 * Victory act — prize columns rise from the board like trophies onto a podium.
 */
export function PrizePodium({ pool }: { pool: number }) {
  const reduce = useReducedMotion();
  const total = pool > 0 ? pool : 50000;
  const tiers = [
    { place: "Champion", share: 0.4, icon: Trophy, h: "h-44 sm:h-56" },
    { place: "Runner-up", share: 0.24, icon: Medal, h: "h-36 sm:h-44" },
    { place: "Third", share: 0.14, icon: Award, h: "h-28 sm:h-36" },
    { place: "Category prizes", share: 0.22, icon: Gift, h: "h-24 sm:h-28" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <ActHeading
        index="V."
        act="The Victory"
        move="#"
        title={["Prizes worth", "playing for."]}
        blurb="A transparent prize split published before the first round — no surprises, no revisions."
        trailing={
          <div className="text-left sm:text-right">
            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Total pool</div>
            <div className="font-display text-4xl font-semibold text-gold">
              ₹<CountUp value={total} />
            </div>
          </div>
        }
      />

      <div className="mt-14 grid grid-cols-2 items-end gap-4 lg:grid-cols-4">
        {tiers.map((t, i) => (
          <motion.div
            key={t.place}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scaleY: 0.82 }}
            whileInView={{ opacity: 1, y: 0, scaleY: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
            style={{ transformOrigin: "bottom", willChange: "transform, opacity" }}
            className={`glow-border relative flex ${t.h} flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-5 elev`}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{
                background: "linear-gradient(180deg, transparent, color-mix(in oklab, var(--gold) 12%, transparent))",
              }}
            />
            <t.icon size={22} className="relative text-gold" />
            <div className="relative mt-3 font-display text-2xl font-semibold tabular-nums">
              ₹<CountUp value={Math.round(total * t.share)} />
            </div>
            <div className="relative mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.place}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mt-8"
      >
        <Link to="/prize-structure" className="text-sm text-gold hover:underline">
          See the full prize structure →
        </Link>
      </motion.div>
    </section>
  );
}
