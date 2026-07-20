import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/supabase-queries";

export const Route = createFileRoute("/_public/contact")({
  head: () => ({ meta: [{ title: "Contact — 64 Squares Society" }, { name: "description", content: "Get in touch with 64 Squares Society." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(siteContentQuery("contact")); },
  component: () => {
    const { data } = useSuspenseQuery(siteContentQuery("contact"));
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-5xl font-semibold">{data?.title ?? "Contact"}</h1>
        <div className="mt-8 text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground">{data?.body}</div>
      </div>
    );
  },
});
