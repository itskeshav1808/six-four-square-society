import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Subtle magnetic hover for buttons/links. Desktop only — disabled on
 * touch devices and when reduced motion is requested.
 */
export function Magnetic({
  children,
  className,
  strength = 8,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 22, mass: 0.4 });
  const y = useSpring(my, { stiffness: 260, damping: 22, mass: 0.4 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      mx.set(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength);
      my.set(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength);
    },
    [mx, my, strength],
  );

  const reset = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  if (reduce || isMobile) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} style={{ x, y }} onMouseMove={onMove} onMouseLeave={reset}>
      {children}
    </motion.div>
  );
}
