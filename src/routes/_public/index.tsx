import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Users, Calendar, Sparkles } from "lucide-react";
import { featuredTournamentQuery, siteContentQuery, sponsorsQuery } from "@/lib/supabase-queries";
import { format } from "date-fns";

export const Route = createFileRoute("/_public/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(featuredTournamentQuery);
    context.queryClient.ensureQueryData(siteContentQuery("home_hero_title"));
    context.queryClient.ensureQueryData(siteContentQuery("home_hero_subtitle"));
    context.queryClient.ensureQueryData(sponsorsQuery);
  },
  component: Home,
});

function HeroTitle({ title }: { title?: string | null }) {
  const full = title?.trim() || "Every Move Matters";
  const idx = full.toLowerCase().lastIndexOf("matters");
  if (idx === -1) {
    return <>{full}</>;
  }
  const before = full.slice(0, idx).trimEnd();
  const after = full.slice(idx + "matters".length).trimStart();
  return (
    <>
      {before}
      {before ? <br /> : null}
      <span className="text-gradient-gold">Matters</span>
      {after ? ` ${after}` : null}
    </>
  );
}

function Home() {
  const { data: featured } = useSuspenseQuery(featuredTournamentQuery);
  const { data: heroTitle } = useSuspenseQuery(siteContentQuery("home_hero_title"));
  const { data: heroSub } = useSuspenseQuery(siteContentQuery("home_hero_subtitle"));
  const { data: sponsors } = useSuspenseQuery(sponsorsQuery);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 sm:pt-24 sm:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles size={14} className="text-gold" /> 64 Squares Society
            </span>
            <h1 className="mt-4 font-display text-5xl sm:text-7xl font-semibold leading-[1.05]">
              <HeroTitle title={heroTitle?.title} />
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              {heroSub?.title ?? "Premier chess tournaments, live standings, and a community built for the long game."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90">
                Register now <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/tournaments" className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-accent/20">
                Upcoming tournaments
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured tournament */}
      {featured && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-8 sm:p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gold/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="grid md:grid-cols-2 gap-8 relative">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-gold">Next Tournament</span>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold">{featured.name}</h2>
                <p className="mt-3 text-muted-foreground line-clamp-3">{featured.description}</p>
                <div className="mt-6 flex flex-wrap gap-6 text-sm">
                  <div><div className="text-muted-foreground text-xs">Starts</div><div className="font-medium">{format(new Date(featured.start_date), "MMM d, yyyy")}</div></div>
                  <div><div className="text-muted-foreground text-xs">Venue</div><div className="font-medium">{featured.venue ?? "—"}</div></div>
                  <div><div className="text-muted-foreground text-xs">Prize Pool</div><div className="font-medium text-gold">₹{Number(featured.prize_pool ?? 0).toLocaleString("en-IN")}</div></div>
                </div>
                <div className="mt-8 flex gap-3">
                  <Link to="/tournaments/$slug" params={{ slug: featured.slug }} className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90">View details</Link>
                  <Link to="/register" className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent/20">Register</Link>
                </div>
              </div>
              <div className="relative flex items-center justify-center min-h-[280px]">
                <div className="grid grid-cols-8 gap-0 rounded-2xl overflow-hidden shadow-2xl w-64 h-64">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const row = Math.floor(i / 8);
                    const dark = (row + i) % 2 === 1;
                    return <div key={i} className={dark ? "bg-navy" : "bg-white"} />;
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Trophy, title: "Rated tournaments", body: "FIDE-compliant events across all age groups and rating brackets." },
            { icon: Users, title: "Growing community", body: "A home for club players, prodigies, and seasoned veterans alike." },
            { icon: Calendar, title: "Year-round calendar", body: "Regular events, training camps, and championship qualifiers." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow"
            >
              <f.icon className="text-gold" size={28} />
              <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Powered by</div>
            <h2 className="mt-2 font-display text-2xl">Our Sponsors</h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 opacity-80">
            {sponsors.map((s) => (
              <div key={s.id} className="px-6 py-3 rounded-lg border border-border bg-card">
                <span className="font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
