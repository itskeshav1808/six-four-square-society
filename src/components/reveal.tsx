import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Dir = "up" | "left" | "right" | "none";

const offset = (dir: Dir) => {
  switch (dir) {
    case "left": return { x: -28, y: 0 };
    case "right": return { x: 28, y: 0 };
    case "none": return { x: 0, y: 0 };
    default: return { x: 0, y: 24 };
  }
};

/** Fast, elegant scroll reveal. Respects prefers-reduced-motion. */
export function Reveal({
  children,
  dir = "up",
  delay = 0,
  className,
}: {
  children: ReactNode;
  dir?: Dir;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const o = offset(dir);
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, ...o }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Wrap a list; children animate in sequence. Use with <StaggerItem>. */
export function Stagger({
  children,
  className,
  gap = 0.08,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}
