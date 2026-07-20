import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/supabase-queries";

export const Route = createFileRoute("/_public/rules")({
  head: () => ({ meta: [{ title: "Rules — 64 Squares Society" }, { name: "description", content: "Tournament rules and code of conduct." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(siteContentQuery("rules")); },
  component: () => {
    const { data } = useSuspenseQuery(siteContentQuery("rules"));
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-5xl font-semibold">{data?.title ?? "Rules"}</h1>
        <div className="mt-8 text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground">{data?.body}</div>
      </div>
    );
  },
});
