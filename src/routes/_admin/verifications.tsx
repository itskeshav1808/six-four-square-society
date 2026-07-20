import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_admin/verifications")({
  component: Verifications,
});

function Verifications() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("*, player:players(full_name,email,phone), tournament:tournaments(name)")
      .eq("payment_status", "pending")
      .order("created_at", { ascending: true });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const decide = async (r: any, ok: boolean) => {
    const patch = ok
      ? { payment_status: "verified", status: "approved", approved_at: new Date().toISOString() }
      : { payment_status: "failed", status: "rejected" };
    await supabase.from("registrations").update(patch as any).eq("id", r.id);
    await supabase.from("payments").update({ status: ok ? "verified" : "failed", verified_at: new Date().toISOString() }).eq("registration_id", r.id);
    toast.success(ok ? "Verified · player approved" : "Marked failed");
    load();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Verification Center</h1>
        <p className="text-sm text-muted-foreground">Review manual payment proofs and pending gateway transactions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{r.player?.full_name}</div>
                <div className="text-xs text-muted-foreground">{r.tournament?.name}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-gold text-lg">₹{r.amount}</div>
                <div className="text-xs text-muted-foreground">{r.payment_method ?? "—"}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
              <div>{r.player?.email}</div><div>{r.player?.phone}</div>
            </div>
            {r.proof_url && (
              <a href={r.proof_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline"><ExternalLink size={12} />View proof</a>
            )}
            {r.dummy_payment_id && <div className="mt-2 text-xs">Payment ID: <code className="text-[10px]">{r.dummy_payment_id}</code></div>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => decide(r, true)} className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-success/10 text-success text-sm"><CheckCircle2 size={14} />Verify</button>
              <button onClick={() => decide(r, false)} className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-destructive/10 text-destructive text-sm"><XCircle size={14} />Reject</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="col-span-full text-center py-16 text-muted-foreground">Everything verified. Great job.</div>}
      </div>
    </div>
  );
}
