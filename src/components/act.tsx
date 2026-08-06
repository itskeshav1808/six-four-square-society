import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Act label — the phase of the match a section belongs to.
 * Rendered as a chess-notation style tag with a gold rule.
 */
export function ActLabel({
  index,
  name,
  move,
  className,
  tone = "default",
}: {
  index: string;
  name: string;
  move?: string;
  className?: string;
  tone?: "default" | "gold";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE }}
      className={cn("flex items-center gap-3", className)}
    >
      <span
        className={cn(
          "font-display text-sm tabular-nums",
          tone === "gold" ? "text-gold" : "text-muted-foreground",
        )}
      >
        {index}
      </span>
      <span className="h-px w-8 bg-gold/50" />
      <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{name}</span>
      {move ? (
        <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gold">
          {move}
        </span>
      ) : null}
    </motion.div>
  );
}

/**
 * Line-by-line mask reveal: each line rises out from behind a clipping edge.
 * Cheaper than per-character animation and reads as deliberate, editorial motion.
 */
export function MaskLines({
  lines,
  className,
  lineClassName,
  delay = 0,
  step = 0.12,
  once = true,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  step?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={cn("block", className)}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={cn("block", lineClassName)}
            style={{ willChange: "transform, opacity" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: "108%", rotate: 1.5 }}
            whileInView={{ opacity: 1, y: "0%", rotate: 0 }}
            viewport={{ once, margin: "-10%" }}
            transition={{ duration: 0.85, delay: delay + i * step, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Section heading with act label, kicker and optional trailing slot. */
export function ActHeading({
  index,
  act,
  move,
  title,
  blurb,
  trailing,
  align = "left",
}: {
  index: string;
  act: string;
  move?: string;
  title: ReactNode[];
  blurb?: string;
  trailing?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center text-center",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <ActLabel index={index} name={act} move={move} className={align === "center" ? "justify-center" : ""} />
        <h2 className="mt-4 font-display text-4xl sm:text-5xl font-semibold leading-[1.02] tracking-tight">
          <MaskLines lines={title} />
        </h2>
        {blurb ? (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
            className="mt-4 text-muted-foreground"
          >
            {blurb}
          </motion.p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
