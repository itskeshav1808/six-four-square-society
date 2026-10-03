import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
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
  const remAllow = async (email: string) => { await supabase.from("admin_allowlist").delete().eq("email", email); load(); };
  const saveContent = async (item: any) => {
    await supabase.from("site_content").update({ body: item.body } as any).eq("key", item.key);
    toast.success(`Saved ${item.key}`);
  };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Settings</h1>
      <ContactSetup />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Admin allowlist</h2>
          <div className="flex gap-2 mb-3">
            <input placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button onClick={addAllow} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1"><Plus size={14} />Add</button>
          </div>
          <div className="divide-y divide-border">
            {allow.map((a) => (
              <div key={a.email} className="flex justify-between items-center py-2 text-sm">
                <span>{a.email}</span>
                <button onClick={() => remAllow(a.email)} className="text-destructive"><Trash2 size={14} /></button>
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
                <textarea rows={3} value={c.body ?? ""} onChange={(e) => setContent((prev) => prev.map((x) => x.key === c.key ? { ...x, body: e.target.value } : x))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <button onClick={() => saveContent(c)} className="mt-1 text-xs text-primary">Save</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ContactSetup() {
  const [phone, setPhone] = useState("");
  const [wa, setWa] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_content").select("key,title").in("key", ["support_phone", "whatsapp_group_url"]).then(({ data }) => {
      for (const r of data ?? []) {
        if (r.key === "support_phone") setPhone(r.title ?? "");
        if (r.key === "whatsapp_group_url") setWa(r.title ?? "");
      }
    });
  }, []);

  const save = async () => {
    const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (phone && !/^[6-9]\d{9}$/.test(digits)) return toast.error("Enter a valid 10-digit Indian mobile number");
    if (wa && !/^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\//.test(wa.trim())) return toast.error("Paste a WhatsApp invite link (https://chat.whatsapp.com/...)");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("site_content").upsert([
      { key: "support_phone", title: digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : null, updated_by: u.user?.id },
      { key: "whatsapp_group_url", title: wa.trim() || null, updated_by: u.user?.id },
    ], { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Helpline & WhatsApp link saved");
  };

  return (
    <section className="mb-6 rounded-2xl border border-gold/40 bg-card p-5">
      <h2 className="font-display text-lg font-semibold">Official helpline & WhatsApp group</h2>
      <p className="text-sm text-muted-foreground mb-4">Shown to players on the registration success screen.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Helpline mobile number
          <input inputMode="numeric" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" />
        </label>
        <label className="text-sm">WhatsApp group invite link
          <input placeholder="https://chat.whatsapp.com/..." value={wa} onChange={(e) => setWa(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" />
        </label>
      </div>
      <button onClick={save} disabled={saving} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
    </section>
  );
}
