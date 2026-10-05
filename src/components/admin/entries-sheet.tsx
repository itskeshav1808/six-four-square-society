import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, ChevronDown, ChevronRight, Sheet } from "lucide-react";
import * as XLSX from "xlsx";
import type { CustomField } from "@/routes/admin/form-builder";

/**
 * Entries Sheet: spreadsheet view of every registration with the admin-built
 * custom questions as columns. Per-question visibility controls which answers
 * become columns ("table"), which stay in the expandable row detail ("detail"),
 * and which are never exported ("private").
 */
export function EntriesSheet({ tournamentFilter }: { tournamentFilter: string }) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("site_content").select("body").eq("key", "registration_form_config").maybeSingle().then(({ data }) => {
      try {
        const parsed = JSON.parse(data?.body ?? "{}");
        setFields(Array.isArray(parsed.fields) ? parsed.fields : []);
      } catch { setFields([]); }
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let q = supabase
      .from("registrations")
      .select("id, amount, status, payment_status, checkin_status, created_at, custom_fields, player:players(full_name, city, rating, contact:player_private(email, phone)), tournament:tournaments(name), category:tournament_categories(name)")
      .eq("is_draft", false)
      .order("created_at", { ascending: false });
    if (tournamentFilter) q = q.eq("tournament_id", tournamentFilter);
    q.then(({ data, error }) => {
      if (error) toast.error(error.message);
      setRows(data ?? []);
      setLoading(false);
    });
  }, [open, tournamentFilter]);

  const tableFields = useMemo(() => fields.filter((f) => (f.visibility ?? "table") === "table"), [fields]);
  const detailFields = useMemo(() => fields.filter((f) => (f.visibility ?? "table") !== "table"), [fields]);
  const exportFields = useMemo(() => fields.filter((f) => (f.visibility ?? "table") !== "private"), [fields]);

  const answer = (r: any, f: CustomField) => {
    const v = r.custom_fields?.[f.id];
    if (v === undefined || v === null || v === "") return "—";
    if (f.type === "checkbox") return v ? "Yes" : "No";
    return String(v);
  };

  const exportSheet = () => {
    const data = rows.map((r) => {
      const base: Record<string, any> = {
        Name: r.player?.full_name,
        Email: r.player?.contact?.email,
        Phone: r.player?.contact?.phone,
        City: r.player?.city,
        Rating: r.player?.rating,
        Tournament: r.tournament?.name,
        Category: r.category?.name,
        Amount: r.amount,
        Status: r.status,
        Payment: r.payment_status,
        "Check-in": r.checkin_status,
        Registered: new Date(r.created_at).toLocaleString(),
      };
      for (const f of exportFields) base[f.label] = answer(r, f);
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Entries");
    XLSX.writeFile(wb, `entries_${Date.now()}.xlsx`);
    toast.success(`Exported ${data.length} entries`);
  };

  if (fields.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Sheet size={16} className="text-gold" />
        <span className="font-medium text-sm">Entries Sheet</span>
        <span className="text-xs text-muted-foreground">· your custom questions as spreadsheet columns</span>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div className="flex justify-end mb-3">
            <button onClick={exportSheet} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs">
              <Download size={14} />Export Excel
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Loading entries…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2" />
                    {["Player", "Tournament", "Status", ...tableFields.map((f) => f.label)].map((h) => (
                      <th key={h} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <>
                      <tr key={r.id} className="border-t border-border hover:bg-muted/20 cursor-pointer" onClick={() => setExpanded((e) => (e === r.id ? null : r.id))}>
                        <td className="px-2 py-2 text-muted-foreground">{expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td className="px-3 py-2"><div className="font-medium">{r.player?.full_name}</div><div className="text-xs text-muted-foreground">{r.player?.city}</div></td>
                        <td className="px-3 py-2 text-xs">{r.tournament?.name}</td>
                        <td className="px-3 py-2 text-xs">{r.status}</td>
                        {tableFields.map((f) => <td key={f.id} className="px-3 py-2 text-xs whitespace-nowrap">{answer(r, f)}</td>)}
                      </tr>
                      {expanded === r.id && detailFields.length > 0 && (
                        <tr key={r.id + "_detail"} className="border-t border-border bg-muted/10">
                          <td colSpan={4 + tableFields.length} className="px-6 py-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                              {detailFields.map((f) => (
                                <div key={f.id}>
                                  <div className="text-xs text-muted-foreground">{f.label}{(f.visibility ?? "table") === "private" && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">private</span>}</div>
                                  <div className="text-sm">{answer(r, f)}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={4 + tableFields.length} className="px-4 py-10 text-center text-muted-foreground">No entries yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
