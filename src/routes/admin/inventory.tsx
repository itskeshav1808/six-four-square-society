import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/_admin/inventory")({
  component: Inventory,
});

function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", category: "", quantity: 0, condition: "good", location: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("inventory_items").select("*").order("name");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("inventory_items").insert({ ...form, quantity: Number(form.quantity) });
    if (error) toast.error(error.message); else { toast.success("Item added"); setForm({ name: "", category: "", quantity: 0, condition: "good", location: "", notes: "" }); load(); }
  };
  const update = async (id: string, patch: any) => {
    await supabase.from("inventory_items").update(patch).eq("id", id);
  };
  const del = async (id: string) => { await supabase.from("inventory_items").delete().eq("id", id); load(); };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Inventory</h1>

      <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm col-span-2" />
        <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input type="number" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={add} className="rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-1"><Plus size={14} />Add</button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-3 py-2">Item</th><th className="text-left px-3 py-2">Category</th><th className="text-left px-3 py-2">Qty</th><th className="text-left px-3 py-2">Condition</th><th className="text-left px-3 py-2">Location</th><th></th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{it.name}</td>
                <td className="px-3 py-2">{it.category}</td>
                <td className="px-3 py-2"><input defaultValue={it.quantity} type="number" onBlur={(e) => update(it.id, { quantity: Number(e.target.value) })} className="w-20 rounded border border-input bg-background px-2 py-1 text-sm" /></td>
                <td className="px-3 py-2">
                  <select defaultValue={it.condition} onChange={(e) => update(it.id, { condition: e.target.value })} className="text-xs rounded border border-input bg-background px-2 py-1">
                    {["excellent", "good", "fair", "poor"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">{it.location}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => del(it.id)} className="text-destructive"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Empty inventory.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
