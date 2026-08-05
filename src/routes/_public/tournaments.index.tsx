import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tournamentsQuery } from "@/lib/supabase-queries";
import { format } from "date-fns";

export const Route = createFileRoute("/_public/tournaments/")({
  head: () => ({ meta: [{ title: "Tournaments — 64 Squares Society" }, { name: "description", content: "Upcoming and past tournaments." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(tournamentsQuery); },
  component: () => {
    const { data } = useSuspenseQuery(tournamentsQuery);
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-5xl font-semibold">Tournaments</h1>
        <p className="mt-2 text-muted-foreground">Upcoming, ongoing, and past events.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {data.length === 0 && <div className="text-muted-foreground">No tournaments yet.</div>}
          {data.map((t) => (
            <Link to="/tournaments/$slug" params={{ slug: t.slug }} key={t.id} className="glow-border rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${t.status === "ongoing" ? "bg-success/20 text-success" : t.status === "completed" ? "bg-muted text-muted-foreground" : "bg-gold/20 text-gold"}`}>{t.status}</span>
                <span className="text-muted-foreground">{format(new Date(t.start_date), "MMM d, yyyy")}</span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-semibold">{t.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.venue}, {t.city}</span>
                <span className="text-gold font-medium">₹{Number(t.prize_pool ?? 0).toLocaleString("en-IN")}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  },
});
