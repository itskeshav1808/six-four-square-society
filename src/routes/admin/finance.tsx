import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/_admin/finance")({
  component: Finance,
});

const COLORS = ["#d4af37", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444"];

function Finance() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [form, setForm] = useState({ tournament_id: "", category: "", description: "", amount: "", incurred_on: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    const [t, p, e] = await Promise.all([
      supabase.from("tournaments").select("id,name"),
      supabase.from("payments").select("amount, tournament_id, status").eq("status", "verified"),
      supabase.from("expenses").select("*, tournament:tournaments(name)").order("incurred_on", { ascending: false }),
    ]);
    setTournaments(t.data ?? []);
    const rev = (t.data ?? []).map((tn: any) => ({ name: tn.name, revenue: (p.data ?? []).filter((x: any) => x.tournament_id === tn.id).reduce((a: number, x: any) => a + Number(x.amount), 0) }));
    setRevenue(rev);
    setExpenses(e.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addExpense = async () => {
    if (!form.category || !form.amount) return toast.error("Category & amount required");
    const { error } = await supabase.from("expenses").insert({ ...form, amount: Number(form.amount), tournament_id: form.tournament_id || null });
    if (error) toast.error(error.message); else { toast.success("Expense logged"); setForm({ tournament_id: "", category: "", description: "", amount: "", incurred_on: new Date().toISOString().slice(0, 10) }); load(); }
  };

  const totalRev = revenue.reduce((a, r) => a + r.revenue, 0);
  const totalExp = expenses.reduce((a: number, r: any) => a + Number(r.amount), 0);
  const expByCat = Object.entries(expenses.reduce((acc: any, e: any) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + Number(e.amount) }), {})).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Finance</h1>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-5"><div className="text-xs uppercase text-muted-foreground">Total revenue</div><div className="mt-1 font-display text-3xl text-success">₹{totalRev.toLocaleString()}</div></div>
        <div className="rounded-2xl border border-border bg-card p-5"><div className="text-xs uppercase text-muted-foreground">Total expenses</div><div className="mt-1 font-display text-3xl text-destructive">₹{totalExp.toLocaleString()}</div></div>
        <div className="rounded-2xl border border-border bg-card p-5"><div className="text-xs uppercase text-muted-foreground">Net</div><div className="mt-1 font-display text-3xl text-gold">₹{(totalRev - totalExp).toLocaleString()}</div></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Revenue by tournament</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={revenue}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="revenue" fill="#d4af37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Expenses by category</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={expByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {expByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <h2 className="font-display text-lg font-semibold mb-2">Log expense</h2>
          <select value={form.tournament_id} onChange={(e) => setForm({ ...form, tournament_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="">General</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input placeholder="Category (e.g. venue, prizes, staff)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input type="date" value={form.incurred_on} onChange={(e) => setForm({ ...form, incurred_on: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={addExpense} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm">Add expense</button>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Tournament</th><th className="text-left px-3 py-2">Category</th><th className="text-left px-3 py-2">Description</th><th className="text-right px-3 py-2">Amount</th></tr></thead>
            <tbody>
              {expenses.map((e: any) => (
                <tr key={e.id} className="border-t border-border"><td className="px-3 py-2 text-xs">{e.incurred_on}</td><td className="px-3 py-2">{e.tournament?.name ?? "—"}</td><td className="px-3 py-2">{e.category}</td><td className="px-3 py-2 text-xs">{e.description}</td><td className="px-3 py-2 text-right">₹{Number(e.amount).toLocaleString()}</td></tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No expenses yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
