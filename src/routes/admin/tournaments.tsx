import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/tournaments")({
  component: TournamentsAdmin,
});

const empty = { name: "", slug: "", description: "", venue: "", city: "", start_date: "", end_date: "", registration_deadline: "", entry_fee: 0, prize_pool: 0, total_rounds: 7, time_control: "", status: "draft" as const, is_featured: false, cover_image_url: "" };

function TournamentsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("tournaments").select("*").order("start_date", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...form, entry_fee: Number(form.entry_fee), prize_pool: Number(form.prize_pool), total_rounds: Number(form.total_rounds) };
      if (!payload.slug) payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (editing) {
        const { error } = await supabase.from("tournaments").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Updated");
      } else {
        const { error } = await supabase.from("tournaments").insert(payload);
        if (error) throw error;
        toast.success("Tournament created");
      }
      setEditing(null); setForm(empty); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Tournaments</h1>
          <p className="text-sm text-muted-foreground">Create, edit and publish events.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(empty); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Plus size={16} />New</button>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Status</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{t.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{t.start_date}</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "ongoing" ? "bg-success/10 text-success" : t.status === "published" ? "bg-primary/10 text-primary" : "bg-muted"}`}>{t.status}</span></td>
                  <td className="px-4 py-2 flex gap-2 justify-end">
                    <Link to="/tournaments/$slug" params={{ slug: t.slug }} className="text-muted-foreground hover:text-foreground"><ExternalLink size={14} /></Link>
                    <button onClick={() => { setEditing(t); setForm({ ...empty, ...t }); }} className="text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No tournaments yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">{editing ? "Edit tournament" : "New tournament"}</h2>
          {(["name", "slug", "venue", "city", "time_control", "cover_image_url"] as const).map((k) => (
            <div key={k}><label className="text-xs uppercase text-muted-foreground">{k.replace(/_/g, " ")}</label>
              <input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          ))}
          <div><label className="text-xs uppercase text-muted-foreground">Description</label>
            <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["start_date", "end_date", "registration_deadline"] as const).map((k) => (
              <div key={k}><label className="text-xs uppercase text-muted-foreground">{k.replace(/_/g, " ")}</label>
                <input type="date" value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["entry_fee", "prize_pool", "total_rounds"] as const).map((k) => (
              <div key={k}><label className="text-xs uppercase text-muted-foreground">{k.replace(/_/g, " ")}</label>
                <input type="number" value={form[k] ?? 0} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1"><label className="text-xs uppercase text-muted-foreground">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {["draft", "published", "ongoing", "completed", "cancelled"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <label className="text-sm flex items-center gap-2 mt-6"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />Featured</label>
          </div>
          <div className="flex gap-2 pt-2">
            {editing && <button onClick={() => { setEditing(null); setForm(empty); }} className="flex-1 py-2 rounded-lg border border-border text-sm">Cancel</button>}
            <button disabled={busy} onClick={save} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{busy ? "Saving…" : editing ? "Save changes" : "Create tournament"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
