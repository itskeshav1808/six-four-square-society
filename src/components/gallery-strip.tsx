import { motion, useReducedMotion } from "framer-motion";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { mediaQuery } from "@/lib/supabase-queries";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Scene 7 — photographs being laid down on a chess table. */
export function GalleryStrip() {
  const reduce = useReducedMotion();
  const { data } = useSuspenseQuery(mediaQuery);
  const items = data.slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3"><span className="font-display text-sm text-gold">VI.</span><span className="h-px w-8 bg-gold/50" /><span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">From the arena</span></div>
          <h2 className="mt-2 font-display text-3xl font-semibold">Gallery</h2>
        </div>
        <Link to="/gallery" className="text-sm text-gold hover:underline">View all</Link>
      </motion.div>

      <motion.div
        className="mt-8 grid gap-3 grid-cols-2 md:grid-cols-4"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        {items.map((m, i) => (
          <motion.div
            key={m.id}
            className="relative rounded-xl overflow-hidden bg-muted aspect-square"
            style={{ willChange: "transform, opacity" }}
            variants={{
              hidden: reduce
                ? { opacity: 0 }
                : { opacity: 0, y: -18, rotate: i % 2 === 0 ? -4 : 4, scale: 1.04 },
              show: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
            }}
            whileHover={reduce ? undefined : { scale: 1.04 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <img
              src={m.url}
              alt={m.caption ?? "Tournament photo"}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
