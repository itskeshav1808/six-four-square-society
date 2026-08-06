import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
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
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const go = useMotionValue(0);

  const srx = useSpring(rx, { stiffness: 180, damping: 20, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 180, damping: 20, mass: 0.4 });
  const sgo = useSpring(go, { stiffness: 120, damping: 20 });
  const glareLeft = useTransform(px, (v) => `${v * 100}%`);
  const glareTop = useTransform(py, (v) => `${v * 100}%`);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      ry.set((nx - 0.5) * max * 2);
      rx.set(-(ny - 0.5) * max * 2);
      px.set(nx);
      py.set(ny);
      go.set(1);
    },
    [max, rx, ry, px, py, go],
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
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <motion.span
              className="absolute h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: glareLeft,
                top: glareTop,
                opacity: sgo,
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--gold) 24%, transparent), transparent 70%)",
                willChange: "transform, opacity",
              }}
            />
          </span>
        ) : null}
      </motion.div>
    </div>
  );
}
