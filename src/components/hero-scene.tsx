import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Scene 1 — Opening Move.
 * Board fades in, two kings arrive, a soft spotlight blooms.
 * Purely decorative; sequencing is handled by delays so nothing lands together.
 */
export function HeroBoard({ size = 320 }: { size?: number }) {
  const reduce = useReducedMotion();
  const cell = size / 8;
  const squares = useMemo(() => Array.from({ length: 64 }), []);

  return (
    <motion.div
      aria-hidden
      className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/60"
      style={{ width: size, height: size, willChange: "transform, opacity" }}
      initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: EASE }}
    >
      <div className="grid grid-cols-8 w-full h-full">
        {squares.map((_, i) => {
          const row = Math.floor(i / 8);
          const dark = (row + i) % 2 === 1;
          return (
            <motion.div
              key={i}
              className={dark ? "bg-navy" : "bg-white"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.15 + (row + (i % 8)) * 0.018, ease: "easeOut" }}
            />
          );
        })}
      </div>

      {/* Soft spotlight */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 42%, color-mix(in oklab, var(--gold) 26%, transparent), transparent 62%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.9, ease: "easeOut" }}
      />

      {/* White king slides in from the bottom rank */}
      <motion.span
        className="absolute flex items-center justify-center select-none text-gold drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
        style={{ width: cell, height: cell, fontSize: cell * 0.82, left: cell * 4, top: cell * 7 }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: cell * 1.4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.8, ease: EASE }}
      >
        ♔
      </motion.span>

      {/* Black king answers */}
      <motion.span
        className="absolute flex items-center justify-center select-none text-navy drop-shadow"
        style={{ width: cell, height: cell, fontSize: cell * 0.82, left: cell * 2, top: 0 }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -cell * 1.4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.05, ease: EASE }}
      >
        ♚
      </motion.span>
    </motion.div>
  );
}

/** Chess-notation style writer: characters appear as if being noted down. */
export function NotationText({
  text,
  className,
  delay = 0,
  charStep = 0.03,
}: {
  text: string;
  className?: string;
  delay?: number;
  charStep?: number;
}) {
  const reduce = useReducedMotion();
  const chars = useMemo(() => Array.from(text), [text]);

  if (reduce) {
    return (
      <motion.span className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay }}>
        {text}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: charStep, delayChildren: delay } } }}
    >
      {chars.map((c, i) => (
        <motion.span
          key={`${c}-${i}`}
          className="inline-block"
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } } }}
        >
          {c === " " ? "\u00A0" : c}
        </motion.span>
      ))}
    </motion.span>
  );
}
