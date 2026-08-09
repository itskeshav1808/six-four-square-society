import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/admin/content")({
  component: ContentManager,
});

type Row = { key: string; title: string | null; body: string | null };

// Grouping heuristic — keys with these prefixes get grouped under a friendly label.
const GROUPS: { label: string; match: (k: string) => boolean }[] = [
  { label: "Home page", match: (k) => k.startsWith("home_") || k === "hero" },
  { label: "About", match: (k) => k.startsWith("about") },
  { label: "Contact", match: (k) => k.startsWith("contact") },
  { label: "Rules", match: (k) => k.startsWith("rules") },
  { label: "Prizes", match: (k) => k.startsWith("prize") },
  { label: "Legal", match: (k) => k.startsWith("privacy") || k.startsWith("terms") },
  { label: "Registration", match: (k) => k.startsWith("register") || k === "registration_form_config" || k === "whatsapp_group_url" || k.startsWith("group_discount") },
  { label: "Sponsors & Media", match: (k) => k.startsWith("sponsors") || k.startsWith("gallery") || k.startsWith("media") },
  { label: "Footer & Misc", match: () => true }, // catch-all
];

function groupOf(key: string) {
  for (const g of GROUPS) if (g.match(key)) return g.label;
  return "Other";
}

function ContentManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_content").select("*").order("key");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (key: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const save = async (r: Row) => {
    const { error } = await supabase
      .from("site_content")
      .update({ title: r.title, body: r.body } as any)
      .eq("key", r.key);
    if (error) return toast.error(error.message);
    toast.success(`Saved “${r.key}”`);
  };

  const remove = async (key: string) => {
    if (!confirm(`Delete content key “${key}”? This cannot be undone.`)) return;
    const { error } = await supabase.from("site_content").delete().eq("key", key);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const addKey = async () => {
    const key = newKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!key) return toast.error("Key is required");
    const { error } = await supabase.from("site_content").insert({ key, title: newTitle || key, body: "" });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setNewKey(""); setNewTitle("");
    load();
  };

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const qq = q.toLowerCase();
    return r.key.toLowerCase().includes(qq) || (r.title ?? "").toLowerCase().includes(qq) || (r.body ?? "").toLowerCase().includes(qq);
  });

  // Group
  const grouped = new Map<string, Row[]>();
  for (const r of filtered) {
    const g = groupOf(r.key);
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(r);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Content Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit any text on your public site without touching code. Changes go live instantly.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by key, title, or content…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="text-sm font-medium mb-2">Add a new content block</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key (e.g. home_hero_subtitle)" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Friendly title (optional)" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={addKey} className="px-4 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-1"><Plus size={14} />Add</button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!loading && Array.from(grouped.entries()).map(([group, items]) => (
        <section key={group} className="mb-8">
          <h2 className="font-display text-lg font-semibold mb-3 text-gold">{group}</h2>
          <div className="space-y-3">
            {items.map((r) => (
              <div key={r.key} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground truncate">{r.key}</div>
                    <input
                      value={r.title ?? ""}
                      onChange={(e) => update(r.key, { title: e.target.value })}
                      placeholder="Title"
                      className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => save(r)} className="p-2 rounded-md hover:bg-muted text-primary" title="Save"><Save size={16} /></button>
                    <button onClick={() => remove(r.key)} className="p-2 rounded-md hover:bg-muted text-destructive" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
                <textarea
                  value={r.body ?? ""}
                  onChange={(e) => update(r.key, { body: e.target.value })}
                  rows={r.key === "registration_form_config" ? 6 : Math.min(10, Math.max(3, (r.body ?? "").split("\n").length))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder="Body text…"
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No content matches your search.</div>
      )}
    </div>
  );
}
