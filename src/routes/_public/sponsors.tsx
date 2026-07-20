import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { sponsorsQuery } from "@/lib/supabase-queries";

export const Route = createFileRoute("/_public/sponsors")({
  head: () => ({ meta: [{ title: "Sponsors — 64 Squares Society" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(sponsorsQuery); },
  component: () => {
    const { data } = useSuspenseQuery(sponsorsQuery);
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-5xl font-semibold">Sponsors</h1>
        <p className="mt-2 text-muted-foreground">Partners who make it all possible.</p>
        {data.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
            Interested in sponsoring? Reach out via the Contact page.
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {data.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border p-6 bg-card">
                <div className="flex items-start gap-4">
                  {s.logo_url && <img src={s.logo_url} alt={s.name} className="w-16 h-16 object-contain rounded-lg" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-semibold">{s.name}</h3>
                      {s.tier && <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold uppercase tracking-wider">{s.tier}</span>}
                    </div>
                    {s.website_url && <a className="text-sm text-primary hover:underline" href={s.website_url} target="_blank" rel="noreferrer">Visit website</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
});
