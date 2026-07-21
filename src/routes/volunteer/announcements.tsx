import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/volunteer/announcements")({
  component: VolAnn,
});

function VolAnn() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("announcements").select("*, tournament:tournaments(name)").in("audience", ["public", "volunteers"]).order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, []);
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-3">
      <h1 className="font-display text-2xl font-semibold mb-2">Announcements</h1>
      {items.map((a) => (
        <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 font-medium"><Megaphone size={14} className="text-gold" />{a.title}</div>
          <div className="text-sm mt-1 whitespace-pre-wrap">{a.body}</div>
          <div className="text-xs text-muted-foreground mt-2">{a.tournament?.name ?? "General"} · {new Date(a.created_at).toLocaleString()}</div>
        </div>
      ))}
      {items.length === 0 && <div className="text-center text-muted-foreground py-12">Nothing new.</div>}
    </div>
  );
}
