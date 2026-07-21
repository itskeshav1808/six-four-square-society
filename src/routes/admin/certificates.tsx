import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { Award, Download } from "lucide-react";

export const Route = createFileRoute("/_admin/certificates")({
  component: Certificates,
});

function makePdf({ recipient, title, details, tournamentName }: { recipient: string; title: string; details?: string; tournamentName: string }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(11, 18, 32); doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(212, 175, 55); doc.setLineWidth(4); doc.rect(24, 24, w - 48, h - 48);
  doc.setDrawColor(212, 175, 55); doc.setLineWidth(1); doc.rect(36, 36, w - 72, h - 72);
  doc.setTextColor(212, 175, 55); doc.setFont("times", "bold"); doc.setFontSize(14); doc.text("64 SQUARES SOCIETY", w / 2, 90, { align: "center" });
  doc.setFontSize(10); doc.setFont("times", "italic"); doc.text("Every Move Matters", w / 2, 108, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(36); doc.text(title, w / 2, 180, { align: "center" });
  doc.setFont("times", "normal"); doc.setFontSize(14); doc.text("This certificate is presented to", w / 2, 220, { align: "center" });
  doc.setFont("times", "bold"); doc.setFontSize(46); doc.setTextColor(212, 175, 55); doc.text(recipient, w / 2, 285, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFont("times", "normal"); doc.setFontSize(14);
  doc.text(`for outstanding participation in ${tournamentName}.`, w / 2, 325, { align: "center" });
  if (details) doc.text(details, w / 2, 355, { align: "center" });
  doc.setFontSize(10); doc.setTextColor(180, 180, 180);
  doc.text(new Date().toLocaleDateString(), 100, h - 70); doc.text("Chief Arbiter", w - 100, h - 70, { align: "right" });
  return doc;
}

function Certificates() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tid, setTid] = useState("");
  const [regs, setRegs] = useState<any[]>([]);
  const [tpl, setTpl] = useState({ cert_type: "participation", title: "Certificate of Participation", details: "" });
  const [certs, setCerts] = useState<any[]>([]);

  useEffect(() => { supabase.from("tournaments").select("id,name").then(({ data }) => setTournaments(data ?? [])); }, []);
  useEffect(() => {
    if (!tid) return;
    supabase.from("registrations").select("id, player:players(id, full_name)").eq("tournament_id", tid).eq("status", "approved").then(({ data }) => setRegs(data ?? []));
    supabase.from("certificates").select("*, player:players(full_name)").eq("tournament_id", tid).order("issued_at", { ascending: false }).then(({ data }) => setCerts(data ?? []));
  }, [tid]);

  const issueOne = async (r: any, preview = false) => {
    const tn = tournaments.find((t) => t.id === tid)?.name ?? "";
    const doc = makePdf({ recipient: r.player?.full_name, title: tpl.title, details: tpl.details, tournamentName: tn });
    if (preview) { doc.save(`${r.player?.full_name}.pdf`); return; }
    await supabase.from("certificates").insert({ tournament_id: tid, player_id: r.player?.id, cert_type: tpl.cert_type, title: tpl.title, recipient_name: r.player?.full_name, details: tpl.details });
    doc.save(`${r.player?.full_name}.pdf`);
  };

  const issueAll = async () => {
    if (!regs.length) return toast.error("No approved players");
    for (const r of regs) await issueOne(r);
    toast.success(`Issued ${regs.length} certificates`);
    supabase.from("certificates").select("*, player:players(full_name)").eq("tournament_id", tid).order("issued_at", { ascending: false }).then(({ data }) => setCerts(data ?? []));
  };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Certificate Generator</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <select value={tid} onChange={(e) => setTid(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="">Select tournament</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select value={tpl.cert_type} onChange={(e) => setTpl({ ...tpl, cert_type: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="participation">Participation</option><option value="winner">Winner</option><option value="volunteer">Volunteer</option><option value="sponsor">Sponsor</option>
          </select>
          <input placeholder="Title" value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <textarea placeholder="Details / achievement" value={tpl.details} onChange={(e) => setTpl({ ...tpl, details: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={issueAll} disabled={!tid} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"><Award size={14} />Generate for all approved</button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Recipients</h2>
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {regs.map((r) => (
              <div key={r.id} className="flex justify-between items-center py-2 text-sm">
                <span>{r.player?.full_name}</span>
                <button onClick={() => issueOne(r)} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-border"><Download size={12} />PDF</button>
              </div>
            ))}
            {!regs.length && <div className="text-sm text-muted-foreground py-6 text-center">Pick a tournament with approved players.</div>}
          </div>
          {certs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-xs uppercase text-muted-foreground mb-2">Recently issued</h3>
              <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {certs.map((c) => <div key={c.id}>{c.recipient_name} · {c.title} · {new Date(c.issued_at).toLocaleDateString()}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
