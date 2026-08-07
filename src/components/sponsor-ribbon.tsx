import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { EASE } from "@/components/act";

/**
 * Sponsor ribbon — a continuous, pausable marquee. Duplicated once so the
 * translateX(-50%) loop is seamless; only transform animates.
 */
export function SponsorRibbon({
  sponsors,
  label = "Backed by",
  heading = "Our sponsors",
}: {
  sponsors: { id: string; name: string }[];
  label?: string;
  heading?: string;
}) {
  if (sponsors.length === 0) return null;
  const row = [...sponsors, ...sponsors];
  const duration = Math.max(18, sponsors.length * 6);

  return (
    <section className="py-20">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8"
      >
        <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{label}</div>
        <h2 className="mt-3 font-display text-3xl font-semibold">{heading}</h2>
      </motion.div>

      <div className="hairline mx-auto mt-10 max-w-5xl" />

      <div className="marquee-wrap marquee-mask mt-8 overflow-hidden">
        <div className="marquee-track flex w-max gap-4" style={{ ["--marquee-duration" as string]: `${duration}s` }}>
          {row.map((s, i) => (
            <div
              key={`${s.id}-${i}`}
              className="flex items-center gap-3 rounded-full border border-border bg-card px-6 py-3 whitespace-nowrap"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              <span className="text-sm font-medium">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link to="/sponsors" className="text-sm text-gold hover:underline">
          Partner with us →
        </Link>
      </div>
    </section>
  );
}
