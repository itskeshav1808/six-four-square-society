import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { ArrowRight, ChevronDown, MapPin, CalendarDays } from "lucide-react";
import { Magnetic } from "@/components/magnetic";
import { MaskLines, ActLabel, EASE } from "@/components/act";
import { useIsMobile } from "@/hooks/use-mobile";

/** Back-rank set that slides onto the board, file by file. */
const OPENING = ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"];

/** A raked, spotlit board — the opening position assembling itself. */
function StageBoard() {
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();
  const squares = useMemo(() => Array.from({ length: 64 }), []);
  const tilt = isMobile ? 0 : 1;

  return (
    <div className="perspective relative mx-auto w-full max-w-[420px]">
      {/* Under-glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--gold) 34%, transparent), transparent 70%)" }}
      />
      <motion.div
        aria-hidden
        className="relative rounded-2xl overflow-hidden ring-1 ring-gold/25"
        style={{
          transform: reduce || !tilt ? undefined : "rotateX(16deg) rotateZ(-8deg)",
          transformStyle: "preserve-3d",
          willChange: "transform, opacity",
        }}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.94, y: reduce ? 0 : 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: EASE }}
      >
        <div className="grid grid-cols-8 aspect-square w-full">
          {squares.map((_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const dark = (row + col) % 2 === 1;
            return (
              <motion.div
                key={i}
                className={dark ? "bg-navy" : "bg-secondary"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: reduce ? 0 : 0.12 + (row + col) * 0.02, ease: "easeOut" }}
              />
            );
          })}
        </div>

        {/* Spotlight */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 34%, color-mix(in oklab, var(--gold) 24%, transparent), transparent 62%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.3, delay: 0.7, ease: "easeOut" }}
        />

        {/* Black back rank descends */}
        <div className="absolute inset-x-0 top-0 grid grid-cols-8">
          {OPENING.map((p, i) => (
            <motion.span
              key={`b${i}`}
              className="grid aspect-square place-items-center text-[7vw] leading-none text-foreground/85 sm:text-[2.2rem]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: "-140%" }}
              animate={{ opacity: 1, y: "0%" }}
              transition={{ duration: 0.65, delay: 0.75 + i * 0.05, ease: EASE }}
            >
              {p}
            </motion.span>
          ))}
        </div>

        {/* White back rank rises */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-8">
          {OPENING.map((p, i) => (
            <motion.span
              key={`w${i}`}
              className="grid aspect-square place-items-center text-[7vw] leading-none text-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-[2.2rem]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: "140%" }}
              animate={{ opacity: 1, y: "0%" }}
              transition={{ duration: 0.65, delay: 0.95 + (7 - i) * 0.05, ease: EASE }}
            >
              {p}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function OpeningHero({
  title,
  subtitle,
  featured,
}: {
  title?: string | null;
  subtitle?: string | null;
  featured?: { name: string; slug: string; start_date: string; venue?: string | null } | null;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const copyFade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0]);
  const boardY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 180]);
  const boardScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.08]);

  const full = (title?.trim() || "Every Move Matters").replace(/\s+/g, " ");
  const idx = full.toLowerCase().lastIndexOf("matters");
  const head = idx === -1 ? full : full.slice(0, idx).trim();
  const tail = idx === -1 ? "" : full.slice(idx).trim();

  return (
    <section ref={ref} className="stage relative isolate overflow-hidden">
      <div aria-hidden className="stage-vignette absolute inset-0" />
      <div aria-hidden className="checker-band absolute inset-x-0 bottom-0 h-24 opacity-40" />

      <div className="on-navy relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div style={{ y: copyY, opacity: copyFade }}>
            <ActLabel index="I." name="The Opening" move="1. e4" tone="gold" />

            <h1 className="mt-6 font-display text-[15vw] font-semibold leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
              <MaskLines
                lines={[
                  head,
                  tail ? (
                    <span className="relative inline-block">
                      <span className="text-gradient-gold">{tail}</span>
                      {!reduce && (
                        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                          <span
                            className="sweep absolute inset-y-0 w-1/3"
                            style={{
                              background:
                                "linear-gradient(90deg, transparent, color-mix(in oklab, var(--gold) 45%, transparent), transparent)",
                            }}
                          />
                        </span>
                      )}
                    </span>
                  ) : null,
                ].filter(Boolean)}
                delay={0.35}
                step={0.14}
              />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
              className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
            >
              {subtitle ||
                "Rated tournaments, live standings, and a community built for the long game. Play where every move is recorded, respected, and rewarded."}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.15, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Magnetic>
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground transition-transform hover:scale-[1.03] active:scale-100"
                >
                  Register for the next event
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link
                  to="/tournaments"
                  className="glass inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition-transform hover:scale-[1.03] active:scale-100"
                >
                  Browse tournaments
                </Link>
              </Magnetic>
            </motion.div>

            {featured ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.35, ease: EASE }}
                className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
              >
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={14} className="text-gold" />
                  {new Date(featured.start_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {featured.venue ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={14} className="text-gold" />
                    {featured.venue}
                  </span>
                ) : null}
                <Link
                  to="/tournaments/$slug"
                  params={{ slug: featured.slug }}
                  className="story-link text-foreground"
                >
                  {featured.name}
                </Link>
              </motion.div>
            ) : null}
          </motion.div>

          <motion.div style={{ y: boardY, scale: boardScale }} className="justify-self-center lg:justify-self-end">
            <StageBoard />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="mt-14 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground"
        >
          Scroll to play the match
          <motion.span
            animate={reduce ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex text-gold"
          >
            <ChevronDown size={14} />
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}
