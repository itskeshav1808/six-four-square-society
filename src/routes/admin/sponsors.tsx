import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/sponsors")({
  component: SponsorsAdmin,
});

function SponsorsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", tier: "gold", logo_url: "", website_url: "", contribution: 0, display_order: 0, is_active: true });

  const load = async () => {
    const { data } = await supabase.from("sponsors").select("*").order("display_order");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("sponsors").insert({ ...form, contribution: Number(form.contribution), display_order: Number(form.display_order) });
    if (error) toast.error(error.message); else { toast.success("Added"); setForm({ name: "", tier: "gold", logo_url: "", website_url: "", contribution: 0, display_order: 0, is_active: true }); load(); }
  };
  const del = async (id: string) => { await supabase.from("sponsors").delete().eq("id", id); load(); };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Sponsors</h1>
      <div className="rounded-2xl border border-border bg-card p-4 grid gap-2 md:grid-cols-6 mb-6">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
        <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          {["title", "platinum", "gold", "silver", "bronze", "partner"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <input placeholder="Logo URL" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Website" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={add} className="rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-1"><Plus size={14} />Add</button>
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {items.map((s) => (
          <div key={s.id} className="p-3 flex items-center gap-3">
            {s.logo_url && <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded object-cover" />}
            <div className="flex-1"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground uppercase">{s.tier}</div></div>
            <button onClick={() => del(s.id)} className="text-destructive"><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No sponsors yet.</div>}
      </div>
    </div>
  );
}
