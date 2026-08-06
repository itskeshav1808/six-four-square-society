import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE } from "@/components/act";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [
    { label: "Days", value: Math.floor(s / 86400) },
    { label: "Hrs", value: Math.floor((s % 86400) / 3600) },
    { label: "Min", value: Math.floor((s % 3600) / 60) },
    { label: "Sec", value: s % 60 },
  ];
}

/** Live clock counting down to the next tournament's first move. */
export function Countdown({ date }: { date: string }) {
  const target = new Date(date).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const done = target - now <= 0;
  const items = parts(target - now);

  return (
    <div className="flex items-end gap-3 sm:gap-4">
      {done ? (
        <span className="text-sm font-medium text-gold">Play has begun — follow the live standings.</span>
      ) : (
        items.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}
            className="rounded-xl border border-gold/25 bg-card/60 px-3 py-2 text-center backdrop-blur-sm sm:px-4"
          >
            <div className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">
              {String(p.value).padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{p.label}</div>
          </motion.div>
        ))
      )}
    </div>
  );
}
