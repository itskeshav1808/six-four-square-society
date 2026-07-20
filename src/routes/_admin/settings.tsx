import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/settings")({
  component: Settings,
});

function Settings() {
  const [allow, setAllow] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [content, setContent] = useState<any[]>([]);

  const load = async () => {
    const [a, c] = await Promise.all([
      supabase.from("admin_allowlist").select("*"),
      supabase.from("site_content").select("*").order("key"),
    ]);
    setAllow(a.data ?? []); setContent(c.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addAllow = async () => {
    if (!newEmail) return;
    const { error } = await supabase.from("admin_allowlist").insert({ email: newEmail.toLowerCase().trim() });
    if (error) toast.error(error.message); else { toast.success("Added"); setNewEmail(""); load(); }
  };
  const remAllow = async (id: string) => { await supabase.from("admin_allowlist").delete().eq("id", id); load(); };
  const saveContent = async (item: any) => {
    await supabase.from("site_content").update({ value: item.value }).eq("id", item.id);
    toast.success(`Saved ${item.key}`);
  };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Settings</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Admin allowlist</h2>
          <div className="flex gap-2 mb-3">
            <input placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button onClick={addAllow} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1"><Plus size={14} />Add</button>
          </div>
          <div className="divide-y divide-border">
            {allow.map((a) => (
              <div key={a.id} className="flex justify-between items-center py-2 text-sm">
                <span>{a.email}</span>
                <button onClick={() => remAllow(a.id)} className="text-destructive"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Site content</h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {content.map((c: any) => (
              <div key={c.id}>
                <label className="text-xs uppercase text-muted-foreground">{c.key}</label>
                <textarea rows={3} value={c.value ?? ""} onChange={(e) => setContent((prev) => prev.map((x) => x.id === c.id ? { ...x, value: e.target.value } : x))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <button onClick={() => saveContent(c)} className="mt-1 text-xs text-primary">Save</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
