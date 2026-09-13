import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Download, CheckCircle2, XCircle, QrCode } from "lucide-react";
import * as XLSX from "xlsx";
import { GroupBookings } from "@/components/admin/group-bookings";
import { EntryBatches } from "@/components/admin/entry-batches";

export const Route = createFileRoute("/admin/registrations")({
  component: RegistrationsAdmin,
});

function RegistrationsAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [filter, setFilter] = useState({ tournament: "", status: "", q: "" });

  const load = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("*, player:players(full_name, city, rating), tournament:tournaments(id, name), category:tournament_categories(name)")
      .eq("is_draft", false)
      .is("batch_id", null)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); supabase.from("tournaments").select("id,name").then(({ data }) => setTournaments(data ?? [])); }, []);

  useEffect(() => {
    const channel = supabase.channel("admin_regs").on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter.tournament && r.tournament?.id !== filter.tournament) return false;
    if (filter.status && r.status !== filter.status) return false;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      return [r.player?.full_name, r.player?.email, r.player?.phone, r.player?.city].some((v) => v?.toLowerCase().includes(q));
    }
    return true;
  }), [rows, filter]);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("registrations").update(patch as any).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Updated");
  };

  const approve = async (r: any) => {
    await supabase.from("registrations").update({ status: "approved", payment_status: "verified", approved_at: new Date().toISOString() }).eq("id", r.id);
    await supabase.from("payments").update({ status: "verified", verified_at: new Date().toISOString() }).eq("registration_id", r.id);
    toast.success("Approved · entry ticket is now available");
  };
  const reject = async (r: any) => {
    await supabase.from("registrations").update({ status: "rejected" }).eq("id", r.id);
    toast("Rejected", { description: r.player?.full_name });
  };

  const exportCsv = () => {
    const data = filtered.map((r) => ({
      Name: r.player?.full_name, Email: r.player?.email, Phone: r.player?.phone, City: r.player?.city, Rating: r.player?.rating,
      Tournament: r.tournament?.name, Category: r.category?.name, Amount: r.amount, Status: r.status,
      Payment: r.payment_status, Method: r.payment_method, "Check-in": r.checkin_status, "QR": r.qr_token,
      Registered: new Date(r.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `registrations_${Date.now()}.xlsx`);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Registration Manager</h1>
          <p className="text-sm text-muted-foreground">Spreadsheet view · edits sync live.</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm"><Download size={16} />Export</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search name, email, phone…" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} className="pl-8 pr-3 py-2 w-full rounded-lg border border-input bg-background text-sm" />
        </div>
        <select value={filter.tournament} onChange={(e) => setFilter({ ...filter, tournament: e.target.value })} className="rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">All tournaments</option>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">Any status</option>
          {["pending", "approved", "rejected", "waitlisted", "cancelled"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <EntryBatches tournamentFilter={filter.tournament} />
      <GroupBookings tournamentFilter={filter.tournament} />

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>{["Player", "Contact", "Tournament", "Cat.", "Amt", "Pay", "Status", "Check-in", "Actions"].map((h) => <th key={h} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2"><div className="font-medium">{r.player?.full_name}</div><div className="text-xs text-muted-foreground">{r.player?.city} · {r.player?.rating || "unrated"}</div></td>
                <td className="px-3 py-2 text-xs">{r.player?.email}<br />{r.player?.phone}</td>
                <td className="px-3 py-2 text-xs">{r.tournament?.name}</td>
                <td className="px-3 py-2 text-xs">{r.category?.name}</td>
                <td className="px-3 py-2">₹{r.amount}</td>
                <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${r.payment_status === "verified" ? "bg-success/10 text-success" : r.payment_status === "failed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>{r.payment_status}</span></td>
                <td className="px-3 py-2">
                  <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value })} className="text-xs rounded border border-input bg-background px-2 py-1">
                    {["pending", "approved", "rejected", "waitlisted", "cancelled"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2"><span className={`text-xs ${r.checkin_status === "checked_in" ? "text-success" : "text-muted-foreground"}`}>{r.checkin_status}</span></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => approve(r)} disabled={r.status === "approved"} title="Approve" className="p-1 rounded hover:bg-success/10 text-success disabled:opacity-30 disabled:cursor-not-allowed"><CheckCircle2 size={16} /></button>
                    <button onClick={() => reject(r)} disabled={r.status === "rejected"} title="Reject" className="p-1 rounded hover:bg-destructive/10 text-destructive disabled:opacity-30 disabled:cursor-not-allowed"><XCircle size={16} /></button>
                     <a href={`/register/success/${r.id}`} target="_blank" rel="noreferrer" title="View entry ticket" className="p-1 rounded hover:bg-muted"><QrCode size={16} /></a>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No registrations match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
