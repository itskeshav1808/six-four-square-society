import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_admin/media")({
  component: MediaAdmin,
});

function MediaAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [form, setForm] = useState({ url: "", caption: "", album: "", tournament_id: "" });

  const load = async () => {
    const { data } = await supabase.from("media_assets").select("*, tournament:tournaments(name)").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); supabase.from("tournaments").select("id,name").then(({ data }) => setTournaments(data ?? [])); }, []);

  const add = async () => {
    if (!form.url) return toast.error("URL required");
    const { error } = await supabase.from("media_assets").insert({ ...form, tournament_id: form.tournament_id || null });
    if (error) toast.error(error.message); else { toast.success("Added"); setForm({ url: "", caption: "", album: "", tournament_id: "" }); load(); }
  };
  const suggest = () => {
    const stock = ["Focused concentration at Board 1.", "A quiet moment before the storm.", "Champions in the making.", "Every move matters.", "Grit and grace on 64 squares."];
    setForm({ ...form, caption: stock[Math.floor(Math.random() * stock.length)] });
  };
  const del = async (id: string) => { await supabase.from("media_assets").delete().eq("id", id); load(); };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Media Library</h1>
      <div className="rounded-2xl border border-border bg-card p-4 grid gap-2 md:grid-cols-5 mb-6">
        <input placeholder="Image URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
        <input placeholder="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Album" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <button onClick={suggest} title="AI caption" className="px-2 rounded-lg border border-border"><Sparkles size={14} /></button>
          <button onClick={add} className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-1"><Plus size={14} />Add</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((m) => (
          <div key={m.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
            <img src={m.url} alt={m.caption ?? ""} className="w-full aspect-square object-cover" />
            <div className="p-2 text-xs">
              <div className="truncate">{m.caption ?? "—"}</div>
              <div className="text-muted-foreground text-[10px]">{m.tournament?.name ?? m.album ?? ""}</div>
            </div>
            <button onClick={() => del(m.id)} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No media yet.</div>}
      </div>
    </div>
  );
}
