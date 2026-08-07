import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { ArrowRight, CalendarDays, MapPin, Trophy, Timer, Crown } from "lucide-react";
import { Magnetic } from "@/components/magnetic";
import { Countdown } from "@/components/countdown";
import type { Cms } from "@/lib/home-content";

const EASE = [0.22, 1, 0.36, 1] as const;

export type Featured = {
  name: string;
  slug: string;
  start_date: string;
  end_date?: string | null;
  venue?: string | null;
  city?: string | null;
  registration_deadline?: string | null;
  prize_pool?: number | string | null;
} | null;

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const day = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * The board: squares illuminate along the diagonals, then four pieces take
 * their posts. Only opacity/transform animate, so it stays smooth on mid-range
 * Android. On mobile the board sits behind the copy at low opacity.
 */
function LightBoard() {
  const reduce = useReducedMotion();
  const squares = useMemo(() => Array.from({ length: 64 }, (_, i) => i), []);
  const pieces = [
    { glyph: "♞", at: 57, delay: 1.05 },
    { glyph: "♝", at: 58, delay: 1.2 },
    { glyph: "♛", at: 59, delay: 1.35 },
    { glyph: "♚", at: 60, delay: 1.5 },
  ];

  return (
    <div className="relative aspect-square w-full">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2rem] blur-3xl"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--gold) 26%, transparent), transparent 70%)" }}
      />
      <div className="relative grid h-full w-full grid-cols-8 overflow-hidden rounded-2xl ring-1 ring-gold/25">
        {squares.map((i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const dark = (row + col) % 2 === 1;
          return (
            <motion.div
              key={i}
              className={dark ? "bg-navy" : "bg-secondary/90"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: reduce ? 0 : 0.1 + (row + col) * 0.025, ease: "easeOut" }}
            >
              {dark ? (
                <div
                  className="lume h-full w-full"
                  style={{ background: "var(--gold)", animationDelay: `${((row + col) % 8) * 0.35}s` }}
                />
              ) : null}
            </motion.div>
          );
        })}

        {/* Spotlight */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 62%, color-mix(in oklab, var(--gold) 26%, transparent), transparent 60%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.7 }}
        />

        {/* Pieces take their posts */}
        {pieces.map((p) => {
          const row = Math.floor(p.at / 8);
          const col = p.at % 8;
          return (
            <motion.span
              key={p.glyph}
              aria-hidden
              className="pointer-events-none absolute grid place-items-center text-gold drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
              style={{
                left: `${col * 12.5}%`,
                top: `${row * 12.5}%`,
                width: "12.5%",
                height: "12.5%",
                fontSize: "min(7vw, 2.6rem)",
                willChange: "transform, opacity",
              }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: "-220%", scale: 0.9 }}
              animate={{ opacity: 1, y: "0%", scale: 1 }}
              transition={{ duration: 0.7, delay: p.delay, ease: EASE }}
            >
              {p.glyph}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

/** Tournament essentials — always visible, never animated away. */
function FactTiles({ cms, featured }: { cms: Cms; featured: Featured }) {
  const pool = Number(featured?.prize_pool ?? 0);
  const facts = [
    { icon: Crown, label: "Tournament", value: featured?.name ?? cms.t("home_facts_empty", "To be announced") },
    { icon: CalendarDays, label: "Date", value: day(featured?.start_date) },
    { icon: MapPin, label: "Venue", value: featured?.venue || featured?.city || "—" },
    { icon: Trophy, label: "Prize pool", value: pool > 0 ? inr(pool) : "—" },
    { icon: Timer, label: "Entries close", value: day(featured?.registration_deadline) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {facts.map((f, i) => (
        <motion.div
          key={f.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.15 + i * 0.07, ease: EASE }}
          className="square rounded-xl p-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <f.icon size={12} className="text-gold" />
            {f.label}
          </div>
          <div className="mt-1.5 font-display text-lg leading-tight font-semibold">{f.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

export function HomeHero({ cms, featured }: { cms: Cms; featured: Featured }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const boardY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const boardOpacity = useTransform(scrollYProgress, [0, 0.9], [1, reduce ? 1 : 0.25]);

  const title = cms.t("home_hero_title", "Every Move Matters");
  const words = title.split(" ");
  const lead = words.slice(0, -1).join(" ");
  const last = words[words.length - 1] ?? "";

  return (
    <section ref={ref} className="stage relative isolate overflow-hidden">
      <div aria-hidden className="stage-vignette absolute inset-0" />
      <div aria-hidden className="checker-band absolute inset-x-0 bottom-0 h-20 opacity-30" />

      <div className="on-navy relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex items-center gap-3"
            >
              <span className="h-px w-8 rule-gold" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-gold">
                {cms.t("home_hero_eyebrow", "64 Squares Society")}
              </span>
            </motion.div>

            <h1 className="mt-5 font-display text-[16vw] leading-[0.95] font-semibold tracking-tight sm:text-7xl lg:text-[5.6rem]">
              {[lead, last].filter(Boolean).map((line, i) => (
                <span key={i} className="block overflow-hidden pb-[0.06em]">
                  <motion.span
                    className="block"
                    style={{ willChange: "transform, opacity" }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: "110%" }}
                    animate={{ opacity: 1, y: "0%" }}
                    transition={{ duration: 0.9, delay: 0.25 + i * 0.14, ease: EASE }}
                  >
                    {i === 1 ? <span className="italic text-gradient-gold">{line}</span> : line}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
              className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
            >
              {cms.t("home_hero_subtitle", "Premier chess tournaments by 64 Squares Society.")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Magnetic>
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground transition-transform hover:scale-[1.03] active:scale-100"
                >
                  {cms.t("home_hero_cta_primary", "Register now")}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link
                  to="/tournaments"
                  className="glass inline-flex items-center rounded-full px-6 py-3.5 text-sm font-medium transition-transform hover:scale-[1.03] active:scale-100"
                >
                  {cms.t("home_hero_cta_secondary", "Browse tournaments")}
                </Link>
              </Magnetic>
            </motion.div>
          </div>

          <motion.div
            style={{ y: boardY, opacity: boardOpacity }}
            className="mx-auto w-full max-w-[340px] sm:max-w-[400px] lg:justify-self-end"
          >
            <LightBoard />
          </motion.div>
        </div>

        {/* Essentials rail */}
        <div className="mt-12">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {cms.t("home_facts_label", "The next event")}
            </span>
            {featured ? (
              <div className="flex items-center gap-4">
                <Countdown date={featured.start_date} />
                <Link
                  to="/tournaments/$slug"
                  params={{ slug: featured.slug }}
                  className="story-link hidden text-sm text-gold sm:inline"
                >
                  Event details
                </Link>
              </div>
            ) : null}
          </div>
          <FactTiles cms={cms} featured={featured} />
        </div>
      </div>
    </section>
  );
}
