import { useEffect, useMemo, useState } from "react";
import { listAdminEntryBatches } from "@/lib/entry-batches.functions";

export function EntryBatches({ tournamentFilter }: { tournamentFilter?: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listAdminEntryBatches>>>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    try {
      setRows(await listAdminEntryBatches());
    } catch {
      setRows([]);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => !tournamentFilter || (r.tournament as any)?.id === tournamentFilter),
    [rows, tournamentFilter],
  );

  if (filtered.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-display text-lg font-semibold">Account batches</h2>
        <p className="text-xs text-muted-foreground">Linked entries under one payment. Drafts are unpaid and do not count as confirmed registrations.</p>
      </div>
      <div className="divide-y divide-border">
        {filtered.map((b) => {
          const account = b.account?.username ? `@${b.account.username}` : (b.account?.phone || b.account?.full_name || "account");
          const unpaid = b.status !== "paid";
          return (
            <div key={b.id} className={unpaid ? "bg-warning/5" : ""}>
              <button type="button" onClick={() => setOpen(open === b.id ? null : b.id)} className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {b.entryCount} {b.entryCount === 1 ? "entry" : "entries"}, {b.payment ? "1 payment" : "no payment yet"}, by {account}
                  </div>
                  <div className="text-xs text-muted-foreground">{(b.tournament as any)?.name}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === "paid" ? "bg-success/10 text-success" : b.status === "expired" ? "bg-muted text-muted-foreground" : "bg-warning/10 text-warning"}`}>
                  {b.status === "paid" ? "Paid" : b.status === "expired" ? "Expired" : "Unpaid / incomplete"}
                </span>
              </button>
              {open === b.id && (
                <div className="px-4 pb-3 text-xs space-y-1">
                  {b.discount_applied && <div className="text-gold">₹{b.discount_per_entry} off per entry applied</div>}
                  {b.payment && <div>Payment ID: {b.payment.reference || b.payment.id} · ₹{b.payment.amount} · {b.payment.status}</div>}
                  {b.entries.map((e: any) => (
                    <div key={e.id} className="flex justify-between">
                      <span>{e.player?.full_name}</span>
                      <span>₹{e.amount} {e.is_draft ? "(draft)" : e.payment_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
