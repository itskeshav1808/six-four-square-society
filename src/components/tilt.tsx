import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Pointer-driven perspective tilt with a travelling specular highlight.
 * Desktop only — touch devices and reduced-motion users get a static card.
 */
export function Tilt({
  children,
  className,
  max = 7,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const go = useMotionValue(0);

  const srx = useSpring(rx, { stiffness: 180, damping: 20, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 180, damping: 20, mass: 0.4 });
  const sgo = useSpring(go, { stiffness: 120, damping: 20 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry.set((px - 0.5) * max * 2);
      rx.set(-(py - 0.5) * max * 2);
      gx.set(px * 100);
      gy.set(py * 100);
      go.set(1);
    },
    [max, rx, ry, gx, gy, go],
  );

  const reset = useCallback(() => {
    rx.set(0);
    ry.set(0);
    go.set(0);
  }, [rx, ry, go]);

  if (reduce || isMobile) return <div className={className}>{children}</div>;

  return (
    <div className={cn("perspective", className)}>
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d", willChange: "transform" }}
        className="relative h-full rounded-[inherit]"
      >
        {children}
        {glare ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              opacity: sgo,
              background: "radial-gradient(220px circle at var(--gx) var(--gy), color-mix(in oklab, var(--gold) 22%, transparent), transparent 70%)",
              // @ts-expect-error custom props
              "--gx": gx,
              "--gy": gy,
            }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
