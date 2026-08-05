import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Trophy, Users, Calendar, Sparkles } from "lucide-react";
import { featuredTournamentQuery, siteContentQuery, sponsorsQuery, mediaQuery } from "@/lib/supabase-queries";
import { format } from "date-fns";
import { DailyPuzzle } from "@/components/daily-puzzle";
import { Reveal, Stagger, StaggerItem } from "@/components/reveal";
import { HeroBoard, NotationText } from "@/components/hero-scene";
import { JourneyTimeline } from "@/components/journey-timeline";
import { GalleryStrip } from "@/components/gallery-strip";
import { FinalMove } from "@/components/final-move";
import { Magnetic } from "@/components/magnetic";
import { CountUp } from "@/components/count-up";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "64 Squares Society — Premier Chess Tournaments in India" },
      {
        name: "description",
        content:
          "Rated chess tournaments, live standings, and a community built for the long game. Register for the next 64 Squares Society event.",
      },
      { property: "og:title", content: "64 Squares Society — Every Move Matters" },
      {
        property: "og:description",
        content: "Premier chess tournaments, live standings, and a community built for the long game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(featuredTournamentQuery);
    context.queryClient.ensureQueryData(siteContentQuery("home_hero_title"));
    context.queryClient.ensureQueryData(siteContentQuery("home_hero_subtitle"));
    context.queryClient.ensureQueryData(sponsorsQuery);
    context.queryClient.ensureQueryData(mediaQuery);
  },
  component: Home,
});

const EASE = [0.22, 1, 0.36, 1] as const;

function HeroTitle({ title }: { title?: string | null }) {
  const full = title?.trim() || "Every Move Matters";
  const idx = full.toLowerCase().lastIndexOf("matters");
  if (idx === -1) {
    return <NotationText text={full} delay={0.9} />;
  }
  const before = full.slice(0, idx).trimEnd();
  const after = full.slice(idx + "matters".length).trimStart();
  return (
    <>
      {before ? <NotationText text={before} delay={0.9} /> : null}
      {before ? <br /> : null}
      <NotationText text="Matters" className="text-gradient-gold" delay={before ? 0.9 + before.length * 0.045 : 0.9} />
      {after ? <NotationText text={` ${after}`} delay={1.6} /> : null}
    </>
  );
}

function Home() {
  const { data: featured } = useSuspenseQuery(featuredTournamentQuery);
  const { data: heroTitle } = useSuspenseQuery(siteContentQuery("home_hero_title"));
  const { data: heroSub } = useSuspenseQuery(siteContentQuery("home_hero_subtitle"));
  const { data: sponsors } = useSuspenseQuery(sponsorsQuery);

  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  // Scene 2 — the board glides down as the next scene rises.
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60]);
  const heroFade = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.35]);
  const boardY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const boardFade = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.2]);

  return (
    <div>
      {/* Scene 1 — Opening move */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 sm:pt-24 sm:pb-32">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <motion.div style={{ y: heroY, opacity: heroFade }} className="max-w-3xl">
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"
              >
                <motion.span
                  animate={reduce ? undefined : { rotate: [0, 12, 0, -12, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex"
                >
                  <Sparkles size={14} className="text-gold" />
                </motion.span>
                64 Squares Society
              </motion.span>

              <h1 className="mt-4 font-display text-5xl sm:text-7xl font-semibold leading-[1.05]">
                <HeroTitle title={heroTitle?.title} />
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 2.1, ease: EASE }}
                className="mt-6 text-lg text-muted-foreground max-w-xl"
              >
                {heroSub?.title ?? "Premier chess tournaments, live standings, and a community built for the long game."}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 2.55, ease: EASE }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Magnetic>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-transform hover:scale-[1.03] active:scale-100"
                  >
                    Register now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link
                    to="/tournaments"
                    className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-accent/20 transition-transform hover:scale-[1.03] active:scale-100"
                  >
                    Upcoming tournaments
                  </Link>
                </Magnetic>
              </motion.div>
            </motion.div>

            <motion.div style={{ y: boardY, opacity: boardFade }} className="hidden lg:block justify-self-end">
              <HeroBoard size={340} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured tournament */}
      {featured && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <Reveal>
            <div className="glass glow-border rounded-3xl p-8 sm:p-12 relative overflow-hidden">
              <motion.div
                aria-hidden
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: EASE }}
                className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gold/10 blur-3xl -translate-y-1/2 translate-x-1/2"
              />
              <div className="grid md:grid-cols-2 gap-8 relative">
                <div>
                  <Reveal dir="left" delay={0.05}>
                    <span className="text-xs uppercase tracking-[0.2em] text-gold">Next Tournament</span>
                    <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold">{featured.name}</h2>
                    <p className="mt-3 text-muted-foreground line-clamp-3">{featured.description}</p>
                  </Reveal>
                  <Stagger className="mt-6 flex flex-wrap gap-6 text-sm" gap={0.09}>
                    <StaggerItem>
                      <div className="text-muted-foreground text-xs">Starts</div>
                      <div className="font-medium">{format(new Date(featured.start_date), "MMM d, yyyy")}</div>
                    </StaggerItem>
                    <StaggerItem>
                      <div className="text-muted-foreground text-xs">Venue</div>
                      <div className="font-medium">{featured.venue ?? "—"}</div>
                    </StaggerItem>
                    <StaggerItem>
                      <div className="text-muted-foreground text-xs">Prize Pool</div>
                      <div className="font-medium text-gold inline-flex items-center gap-1.5">
                        <motion.span
                          initial={{ opacity: 0, y: -8, rotate: -20 }}
                          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.25, type: "spring", stiffness: 200, damping: 14 }}
                          className="inline-flex"
                        >
                          <Trophy size={14} />
                        </motion.span>
                        ₹<CountUp value={Number(featured.prize_pool ?? 0)} />
                      </div>
                    </StaggerItem>
                  </Stagger>
                  <Reveal delay={0.15}>
                    <div className="mt-8 flex gap-3">
                      <Magnetic>
                        <Link to="/tournaments/$slug" params={{ slug: featured.slug }} className="inline-flex rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-transform hover:scale-[1.03]">View details</Link>
                      </Magnetic>
                      <Magnetic>
                        <Link to="/register" className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent/20 transition-transform hover:scale-[1.03]">Register</Link>
                      </Magnetic>
                    </div>
                  </Reveal>
                </div>
                <div className="relative flex items-center justify-center min-h-[280px]">
                  <HeroBoard size={256} />
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* Daily puzzle */}
      <Reveal>
        <DailyPuzzle />
      </Reveal>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Stagger className="grid gap-6 md:grid-cols-3" gap={0.1}>
          {[
            { icon: Trophy, title: "Rated tournaments", body: "FIDE-compliant events across all age groups and rating brackets." },
            { icon: Users, title: "Growing community", body: "A home for club players, prodigies, and seasoned veterans alike." },
            { icon: Calendar, title: "Year-round calendar", body: "Regular events, training camps, and championship qualifiers." },
          ].map((f) => (
            <StaggerItem key={f.title}>
              <motion.div
                whileHover={reduce ? undefined : { y: -6 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="group h-full rounded-2xl border border-border bg-card p-6 glow-border hover:shadow-xl hover:border-gold/40 transition-colors"
              >
                <motion.span
                  className="inline-flex"
                  initial={{ rotate: -8, opacity: 0, scale: 0.9 }}
                  whileInView={{ rotate: 0, opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <f.icon className="text-gold transition-transform duration-300 group-hover:rotate-[8deg]" size={28} />
                </motion.span>
                <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Journey timeline */}
      <JourneyTimeline />

      {/* Gallery */}
      <GalleryStrip />

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <Reveal className="text-center mb-8">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Powered by</div>
            <h2 className="mt-2 font-display text-2xl">Our Sponsors</h2>
          </Reveal>
          <Stagger className="flex flex-wrap items-center justify-center gap-6 opacity-80" gap={0.12}>
            {sponsors.map((s) => (
              <StaggerItem key={s.id}>
                <motion.div
                  whileHover={reduce ? undefined : { scale: 1.05, y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-3 rounded-lg border border-border bg-card"
                >
                  <span className="font-medium">{s.name}</span>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Final move */}
      <FinalMove />
    </div>
  );
}
