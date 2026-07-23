import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Award, Download, FileArchive, Loader2 } from "lucide-react";
import { makeCertificatePdf, mergeCertificatesToMaster } from "@/lib/certificate-pdf";

export const Route = createFileRoute("/admin/certificates")({
  component: Certificates,
});

function playerUrl(slug?: string | null) {
  if (!slug) return undefined;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/players/${slug}`;
}

function Certificates() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tid, setTid] = useState("");
  const [regs, setRegs] = useState<any[]>([]);
  const [tpl, setTpl] = useState({ cert_type: "participation", title: "Certificate of Participation", details: "" });
  const [certs, setCerts] = useState<any[]>([]);
  const [buildingMaster, setBuildingMaster] = useState(false);

  useEffect(() => {
    supabase.from("tournaments").select("id,name").then(({ data }) => setTournaments(data ?? []));
  }, []);

  const refreshCerts = () => {
    supabase
      .from("certificates")
      .select("*, player:players(full_name, slug), tournament:tournaments(name)")
      .eq("tournament_id", tid)
      .order("issued_at", { ascending: false })
      .then(({ data }) => setCerts(data ?? []));
  };

  useEffect(() => {
    if (!tid) return;
    supabase
      .from("registrations")
      .select("id, player:players(id, full_name, slug, avatar_url)")
      .eq("tournament_id", tid)
      .eq("status", "approved")
      .then(({ data }) => setRegs(data ?? []));
    refreshCerts();
  }, [tid]);

  const issueOne = async (r: any, preview = false) => {
    const tn = tournaments.find((t) => t.id === tid)?.name ?? "";
    const target = playerUrl(r.player?.slug);
    const doc = await makeCertificatePdf({
      recipient: r.player?.full_name,
      title: tpl.title,
      details: tpl.details,
      tournamentName: tn,
      qrTargetUrl: target,
      photoUrl: r.player?.avatar_url ?? undefined,
    });
    if (preview) { doc.save(`${r.player?.full_name}.pdf`); return; }
    await supabase.from("certificates").insert({
      tournament_id: tid,
      player_id: r.player?.id,
      cert_type: tpl.cert_type,
      title: tpl.title,
      recipient_name: r.player?.full_name,
      details: tpl.details,
      qr_target_url: target ?? null,
    });
    doc.save(`${r.player?.full_name}.pdf`);
  };

  const issueAll = async () => {
    if (!regs.length) return toast.error("No approved players");
    for (const r of regs) await issueOne(r);
    toast.success(`Issued ${regs.length} certificates`);
    refreshCerts();
  };

  const downloadMaster = async () => {
    setBuildingMaster(true);
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, player:players(full_name, slug), tournament:tournaments(name)")
        .order("issued_at", { ascending: true });
      if (error) throw error;
      if (!data?.length) { toast.error("No certificates issued yet"); return; }
      toast.info(`Building master PDF (${data.length} certificates)…`);
      const pdfs = [];
      for (const c of data) {
        const doc = await makeCertificatePdf({
          recipient: c.recipient_name ?? c.player?.full_name ?? "Recipient",
          title: c.title ?? "Certificate",
          details: c.details ?? undefined,
          tournamentName: c.tournament?.name ?? "",
          issuedAt: c.issued_at,
          qrTargetUrl: c.qr_target_url ?? playerUrl(c.player?.slug),
        });
        pdfs.push(doc);
      }
      const blob = await mergeCertificatesToMaster(pdfs);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `64squares-master-certificates-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Master PDF downloaded");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to build master PDF");
    } finally {
      setBuildingMaster(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl font-semibold">Certificate Generator</h1>
        <button
          onClick={downloadMaster}
          disabled={buildingMaster}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent/20 text-sm disabled:opacity-50"
        >
          {buildingMaster ? <Loader2 size={14} className="animate-spin" /> : <FileArchive size={14} />}
          Download master PDF (all certificates)
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <select value={tid} onChange={(e) => setTid(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="">Select tournament</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select value={tpl.cert_type} onChange={(e) => setTpl({ ...tpl, cert_type: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="participation">Participation</option><option value="winner">Winner</option><option value="volunteer">Volunteer</option><option value="sponsor">Sponsor</option>
          </select>
          <input placeholder="Title" value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <textarea placeholder="Details / achievement" value={tpl.details} onChange={(e) => setTpl({ ...tpl, details: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={issueAll} disabled={!tid} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"><Award size={14} />Generate for all approved</button>
          <p className="text-xs text-muted-foreground">Each certificate PDF includes a QR code linking to that player's public Chess Passport.</p>
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
