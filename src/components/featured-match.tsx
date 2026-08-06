import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { ArrowRight, MapPin, Clock, Trophy } from "lucide-react";
import { format } from "date-fns";
import { ActLabel, MaskLines, EASE } from "@/components/act";
import { Countdown } from "@/components/countdown";
import { Magnetic } from "@/components/magnetic";
import { CountUp } from "@/components/count-up";

type Featured = {
  name: string;
  slug: string;
  description?: string | null;
  start_date: string;
  venue?: string | null;
  city?: string | null;
  prize_pool?: number | string | null;
  status?: string | null;
};

/** Middlegame act — the next event, framed like a headline board. */
export function FeaturedMatch({ featured }: { featured: Featured }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

  return (
    <section className="relative overflow-hidden py-24">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-gold/20 bg-card elev">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full blur-3xl"
            style={{
              y: reduce ? 0 : glowY,
              background: "radial-gradient(circle, color-mix(in oklab, var(--gold) 22%, transparent), transparent 70%)",
            }}
          />
          <div aria-hidden className="checker-band absolute inset-x-0 top-0 h-16 opacity-30" />

          <div className="relative grid gap-10 p-7 sm:p-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <ActLabel index="III." name="The Middlegame" move={featured.status === "ongoing" ? "live" : "next"} tone="gold" />

              <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.03] sm:text-5xl">
                <MaskLines lines={[featured.name]} />
              </h2>

              {featured.description ? (
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
                  className="mt-4 max-w-xl text-muted-foreground"
                >
                  {featured.description}
                </motion.p>
              ) : null}

              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                {[
                  {
                    icon: Clock,
                    label: "First move",
                    value: format(new Date(featured.start_date), "MMM d, yyyy"),
                  },
                  {
                    icon: MapPin,
                    label: "Venue",
                    value: [featured.venue, featured.city].filter(Boolean).join(", ") || "To be announced",
                  },
                  {
                    icon: Trophy,
                    label: "Prize pool",
                    value: null as string | null,
                  },
                ].map((d, i) => (
                  <motion.div
                    key={d.label}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.09, ease: EASE }}
                  >
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      <d.icon size={12} className="text-gold" />
                      {d.label}
                    </div>
                    <div className="mt-1.5 font-medium">
                      {d.value ?? (
                        <span className="text-gold">
                          ₹<CountUp value={Number(featured.prize_pool ?? 0)} />
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-9 flex flex-wrap gap-3">
                <Magnetic>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground transition-transform hover:scale-[1.03]"
                  >
                    Register <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link
                    to="/tournaments/$slug"
                    params={{ slug: featured.slug }}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-transform hover:scale-[1.03] hover:bg-accent/15"
                  >
                    Full details
                  </Link>
                </Magnetic>
              </div>
            </div>

            <div className="lg:justify-self-end">
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Clock starts in</div>
              <div className="mt-4">
                <Countdown date={featured.start_date} />
              </div>
              <div className="hairline my-8" />
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  "Swiss pairings published each round",
                  "Live standings and tie-breaks",
                  "QR check-in at the venue",
                  "Certificate with your player passport",
                ].map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
                    className="flex items-start gap-2.5"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {f}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
