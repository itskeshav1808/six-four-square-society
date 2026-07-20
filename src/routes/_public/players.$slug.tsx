import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { playerBySlugQuery, playerHistoryQuery } from "@/lib/supabase-queries";

export const Route = createFileRoute("/_public/players/$slug")({
  head: ({ loaderData }: { loaderData?: any }) => ({
    meta: [{ title: `${loaderData?.full_name ?? "Player"} — 64 Squares Society` }],
  }),
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(playerBySlugQuery(params.slug));
    if (!p) throw notFound();
    context.queryClient.prefetchQuery(playerHistoryQuery(p.id));
    return p;
  },
  component: PlayerPage,
  notFoundComponent: () => <div className="p-16 text-center">Player not found. <Link to="/results" className="underline">Back</Link></div>,
});

function PlayerPage() {
  const p = Route.useLoaderData();
  const { data: history } = useSuspenseQuery(playerHistoryQuery(p.id));
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center font-display text-3xl text-gold">{p.full_name.charAt(0)}</div>
        <div>
          <h1 className="font-display text-4xl font-semibold">{p.full_name}</h1>
          <div className="text-muted-foreground">{p.city}{p.state ? `, ${p.state}` : ""}</div>
          <div className="mt-1 text-sm">Rating: <span className="text-gold font-medium">{p.rating || "Unrated"}</span></div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl mb-4">Tournament history</h2>
        {history.length === 0 ? (
          <div className="text-muted-foreground">No tournaments yet.</div>
        ) : (
          <ul className="space-y-2">
            {history.map((h: any) => (
              <li key={h.id} className="rounded-xl border border-border p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{h.tournament?.name}</div>
                  <div className="text-xs text-muted-foreground">{h.tournament?.start_date}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted">{h.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
