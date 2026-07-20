import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { mediaQuery } from "@/lib/supabase-queries";

export const Route = createFileRoute("/_public/gallery")({
  head: () => ({ meta: [{ title: "Gallery — 64 Squares Society" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(mediaQuery); },
  component: () => {
    const { data } = useSuspenseQuery(mediaQuery);
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-5xl font-semibold">Gallery</h1>
        <p className="mt-2 text-muted-foreground">Moments from our tournaments.</p>
        {data.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">Photos will appear here soon.</div>
        ) : (
          <div className="mt-10 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.map((m) => (
              <a href={m.url} target="_blank" rel="noreferrer" key={m.id} className="group rounded-xl overflow-hidden bg-muted aspect-square block relative">
                <img src={m.url} alt={m.caption ?? ""} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  },
});
