import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/form-builder")({
  component: FormBuilder,
});

export type FieldType = "text" | "email" | "phone" | "number" | "date" | "textarea" | "select" | "checkbox";

export type CustomField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select
  helpText?: string;
};

const TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

function uid() {
  return "f_" + Math.random().toString(36).slice(2, 9);
}

function FormBuilder() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_content").select("body").eq("key", "registration_form_config").maybeSingle();
    try {
      const parsed = JSON.parse(data?.body ?? "{}");
      setFields(Array.isArray(parsed.fields) ? parsed.fields : []);
    } catch { setFields([]); }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    // Ensure the row exists
    const body = JSON.stringify({ fields });
    const { error } = await supabase.from("site_content").upsert({ key: "registration_form_config", title: "Registration Form Config", body } as any, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Registration form saved");
  };

  const add = () => setFields((f) => [...f, { id: uid(), label: "New question", type: "text", required: false }]);
  const remove = (id: string) => setFields((f) => f.filter((x) => x.id !== id));
  const patch = (id: string, p: Partial<CustomField>) => setFields((f) => f.map((x) => x.id === id ? { ...x, ...p } : x));
  const move = (id: string, dir: -1 | 1) => setFields((f) => {
    const i = f.findIndex((x) => x.id === id);
    if (i < 0) return f;
    const j = i + dir;
    if (j < 0 || j >= f.length) return f;
    const next = [...f];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold">Registration Form Builder</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Add extra questions that appear on your public registration page — after the standard details.
            Answers are saved with each registration and visible in the Registration Manager.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/register" target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border border-border text-sm inline-flex items-center gap-1"><Eye size={14} />Preview</a>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1 disabled:opacity-50">
            <Save size={14} />{saving ? "Saving…" : "Save form"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">#{i + 1}</div>
                  <div className="flex-1" />
                  <button onClick={() => move(f.id, -1)} className="p-1.5 rounded-md hover:bg-muted" title="Move up"><ArrowUp size={14} /></button>
                  <button onClick={() => move(f.id, 1)} className="p-1.5 rounded-md hover:bg-muted" title="Move down"><ArrowDown size={14} /></button>
                  <button onClick={() => remove(f.id)} className="p-1.5 rounded-md hover:bg-muted text-destructive" title="Delete"><Trash2 size={14} /></button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Question label</label>
                    <input value={f.label} onChange={(e) => patch(f.id, { label: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Field type</label>
                    <select value={f.type} onChange={(e) => patch(f.id, { type: e.target.value as FieldType })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Help text (optional)</label>
                    <input value={f.helpText ?? ""} onChange={(e) => patch(f.id, { helpText: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  {f.type !== "checkbox" && (
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Placeholder (optional)</label>
                      <input value={f.placeholder ?? ""} onChange={(e) => patch(f.id, { placeholder: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                  )}
                  {f.type === "select" && (
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Options (one per line)</label>
                      <textarea
                        value={(f.options ?? []).join("\n")}
                        onChange={(e) => patch(f.id, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        placeholder={"Option A\nOption B\nOption C"}
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" checked={f.required} onChange={(e) => patch(f.id, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-12 rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                No custom questions yet. Click “Add question” below.
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={add} className="px-4 py-2 rounded-lg border border-border text-sm inline-flex items-center gap-1"><Plus size={14} />Add question</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1 disabled:opacity-50">
              <Save size={14} />{saving ? "Saving…" : "Save form"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
