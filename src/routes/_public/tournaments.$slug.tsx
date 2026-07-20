import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tournamentBySlugQuery, standingsQuery } from "@/lib/supabase-queries";
import { format } from "date-fns";

export const Route = createFileRoute("/_public/tournaments/$slug")({
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Tournament" }] };
    return {
      meta: [
        { title: `${loaderData.name} — 64 Squares Society` },
        { name: "description", content: loaderData.description?.slice(0, 160) ?? "Tournament details" },
        { property: "og:title", content: loaderData.name },
        { property: "og:description", content: loaderData.description?.slice(0, 160) ?? "" },
        ...(loaderData.cover_image_url ? [{ property: "og:image", content: loaderData.cover_image_url }] : []),
      ],
    };
  },
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData(tournamentBySlugQuery(params.slug));
    if (!t) throw notFound();
    context.queryClient.prefetchQuery(standingsQuery(t.id));
    return t;
  },
  component: TournamentPage,
  notFoundComponent: () => <div className="p-16 text-center">Tournament not found. <Link to="/tournaments" className="underline">Back</Link></div>,
});

function TournamentPage() {
  const t = Route.useLoaderData();
  const { data: standings } = useSuspenseQuery(standingsQuery(t.id));
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
      <span className="text-xs uppercase tracking-[0.2em] text-gold">{t.status}</span>
      <h1 className="mt-2 font-display text-5xl font-semibold">{t.name}</h1>
      <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
        <div>📍 {t.venue}, {t.city}</div>
        <div>📅 {format(new Date(t.start_date), "MMM d")}{t.end_date && ` – ${format(new Date(t.end_date), "MMM d, yyyy")}`}</div>
        <div>🏆 ₹{Number(t.prize_pool ?? 0).toLocaleString("en-IN")}</div>
        <div>⏱ {t.time_control}</div>
      </div>
      <p className="mt-6 text-lg text-muted-foreground whitespace-pre-wrap">{t.description}</p>

      <div className="mt-8 flex gap-3">
        <Link to="/register" search={{ tournament: t.slug } as any} className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90">Register</Link>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl mb-4">Categories</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {t.tournament_categories?.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border p-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-muted-foreground">Entry fee: ₹{c.entry_fee}</div>
            </div>
          ))}
        </div>
      </section>

      {standings.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-4">Live Standings</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left"><tr>
                <th className="p-3">Rank</th><th className="p-3">Player</th><th className="p-3">Points</th><th className="p-3">Games</th>
              </tr></thead>
              <tbody>
                {standings.map((s: any) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3 font-medium">#{s.rank}</td>
                    <td className="p-3">{s.player?.full_name}</td>
                    <td className="p-3">{s.points}</td>
                    <td className="p-3">{s.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {t.rules && (<section className="mt-12"><h2 className="font-display text-2xl mb-4">Rules</h2><div className="whitespace-pre-wrap text-muted-foreground">{t.rules}</div></section>)}
      {t.prize_structure && (<section className="mt-12"><h2 className="font-display text-2xl mb-4">Prizes</h2><div className="whitespace-pre-wrap text-muted-foreground">{t.prize_structure}</div></section>)}
    </div>
  );
}
