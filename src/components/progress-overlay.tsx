import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

/**
 * Full-screen calming overlay shown during sign-in and payment handoffs.
 * Steps advance on a timer purely for reassurance; the overlay stays until
 * the parent unmounts it (i.e. navigation completes).
 */
export function ProgressOverlay({ title, steps, interval = 1100 }: { title: string; steps: string[]; interval?: number }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), interval);
    return () => clearInterval(t);
  }, [steps.length, interval]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md px-4"
    >
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto h-24 w-24">
          <motion.div
            className="absolute inset-0 rounded-full bg-gold/30 blur-2xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-gold/60 bg-gradient-to-br from-primary to-gold text-4xl text-primary-foreground">
            ♛
          </div>
        </div>
        <h2 className="mt-6 font-display text-2xl font-semibold">{title}</h2>
        <ul className="mt-6 space-y-3 text-left">
          {steps.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 text-sm ${i <= active ? "text-foreground" : "text-muted-foreground/60"}`}>
              {i < active ? (
                <CheckCircle2 size={18} className="shrink-0 text-gold" />
              ) : i === active ? (
                <Loader2 size={18} className="shrink-0 animate-spin text-gold" />
              ) : (
                <span className="h-[18px] w-[18px] shrink-0 rounded-full border border-border" />
              )}
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">Please don't close or refresh this page.</p>
      </div>
    </motion.div>
  );
}
