import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Thin gold move-progress bar pinned under the header.
 * Scroll-linked transform only — no layout work per frame.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 top-0 z-50 h-[2px] w-full origin-left bg-gold"
      style={{ scaleX, willChange: "transform" }}
    />
  );
}
