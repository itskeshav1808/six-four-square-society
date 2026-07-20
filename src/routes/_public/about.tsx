import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/supabase-queries";

export const Route = createFileRoute("/_public/about")({
  head: () => ({ meta: [{ title: "About — 64 Squares Society" }, { name: "description", content: "Learn about 64 Squares Society, our mission and our chess community." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(siteContentQuery("about")); },
  component: () => {
    const { data } = useSuspenseQuery(siteContentQuery("about"));
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-5xl font-semibold">{data?.title ?? "About"}</h1>
        <div className="mt-8 text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground">{data?.body}</div>
      </div>
    );
  },
});
