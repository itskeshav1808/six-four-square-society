import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `value` once the element scrolls into view.
 *
 * Uses a plain IntersectionObserver on a real DOM node (rather than a motion
 * wrapper) so the ref is always attached and the animation reliably fires —
 * including when the element is already on screen at first paint.
 */
export function CountUp({
  value,
  duration = 1.4,
  className,
  format = (n: number) => n.toLocaleString("en-IN"),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const run = () => {
      if (done.current) return;
      done.current = true;
      if (reduce || value <= 0) {
        setN(value);
        return;
      }
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / (duration * 1000));
        setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); // easeOutCubic
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    io.observe(el);
    // Safety net: if the observer never fires (offscreen containers, transforms),
    // still show the real value rather than a permanent zero.
    const fallback = window.setTimeout(run, 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(n)}
    </span>
  );
}
