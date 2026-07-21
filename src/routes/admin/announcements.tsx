import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Send, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_admin/announcements")({
  component: Announcements,
});

function Announcements() {
  const [items, setItems] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [form, setForm] = useState({ audience: "public", tournament_id: "", title: "", body: "", whatsapp_number: "" });

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*, tournament:tournaments(name)").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); supabase.from("tournaments").select("id,name").then(({ data }) => setTournaments(data ?? [])); }, []);

  const send = async () => {
    if (!form.title) return toast.error("Title required");
    const { error } = await supabase.from("announcements").insert({ audience: form.audience, tournament_id: form.tournament_id || null, title: form.title, body: form.body });
    if (error) toast.error(error.message); else { toast.success("Broadcast sent"); load(); }
  };

  const waLink = () => {
    const text = encodeURIComponent(`*${form.title}*\n\n${form.body}\n\n— 64 Squares Society`);
    return form.whatsapp_number ? `https://wa.me/${form.whatsapp_number.replace(/\D/g, "")}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Announcements</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="public">Public site</option><option value="players">Signed-in players</option><option value="volunteers">Volunteers</option>
          </select>
          <select value={form.tournament_id} onChange={(e) => setForm({ ...form, tournament_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Not tournament-specific</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <textarea placeholder="Body" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={send} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-2"><Send size={14} />Post</button>
            <a href={waLink()} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-lg border border-border text-sm inline-flex items-center justify-center gap-2"><ExternalLink size={14} />Share to WhatsApp</a>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 max-h-[600px] overflow-y-auto space-y-3">
          {items.map((a) => (
            <div key={a.id} className="p-3 rounded-lg border border-border">
              <div className="flex justify-between items-start">
                <div className="font-medium flex items-center gap-2"><Megaphone size={14} className="text-gold" />{a.title}</div>
                <span className="text-xs text-muted-foreground">{a.audience}</span>
              </div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{a.body}</div>
              <div className="text-xs text-muted-foreground mt-2">{a.tournament?.name ?? "General"} · {new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
          {items.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">No announcements yet.</div>}
        </div>
      </div>
    </div>
  );
}
