import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, CheckCircle2, Camera, CameraOff } from "lucide-react";

export const Route = createFileRoute("/volunteer/check-in")({
  component: CheckIn,
});

function CheckIn() {
  const [scanning, setScanning] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tid, setTid] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [last, setLast] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    supabase.from("tournaments").select("id,name").in("status", ["published", "ongoing"]).then(({ data }) => {
      setTournaments(data ?? []);
      if (data?.[0]) setTid(data[0].id);
    });
  }, []);

  const search = async () => {
    if (!tid) return;
    const { data } = await supabase
      .from("registrations")
      .select("id, checkin_status, qr_token, player:players(full_name,phone,city,rating)")
      .eq("tournament_id", tid)
      .eq("status", "approved");
    const filtered = (data ?? []).filter((r: any) => {
      if (!q) return true;
      const qq = q.toLowerCase();
      return [r.player?.full_name, r.player?.phone, r.player?.city].some((v: string) => v?.toLowerCase().includes(qq));
    });
    setResults(filtered);
  };

  useEffect(() => { search(); }, [tid, q]);

  const checkIn = async (regId: string, name: string) => {
    const { error } = await supabase.from("registrations").update({ checkin_status: "checked_in", checked_in_at: new Date().toISOString() }).eq("id", regId);
    if (error) return toast.error(error.message);
    setLast({ name, at: new Date() });
    toast.success(`${name} checked in`);
    search();
  };

  const startScan = async () => {
    setScanning(true);
    const html5 = new Html5Qrcode("qr-reader");
    scannerRef.current = html5;
    try {
      await html5.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, async (decoded) => {
        const token = decoded.startsWith("64s:") ? decoded.slice(4) : decoded;
        const { data } = await supabase.from("registrations").select("id, checkin_status, tournament_id, player:players(full_name)").eq("qr_token", token).maybeSingle();
        if (!data) { toast.error("Unknown QR"); return; }
        if (data.tournament_id !== tid) toast.warning(`Player is registered for a different tournament — checking in anyway`);
        if (data.checkin_status === "checked_in") { toast(`${data.player?.full_name} already checked in`); return; }
        await checkIn(data.id, data.player?.full_name ?? "Player");
      }, () => {});
    } catch (e: any) {
      toast.error("Camera error: " + e.message);
      setScanning(false);
    }
  };
  const stopScan = async () => {
    try { await scannerRef.current?.stop(); await scannerRef.current?.clear(); } catch {}
    scannerRef.current = null;
    setScanning(false);
  };
  useEffect(() => () => { stopScan(); }, []);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="font-display text-2xl font-semibold mb-4">Check-in station</h1>
      <select value={tid} onChange={(e) => setTid(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mb-4">
        {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        {!scanning ? (
          <button onClick={startScan} className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-2"><Camera size={16} />Start QR scanner</button>
        ) : (
          <>
            <div id="qr-reader" className="rounded-lg overflow-hidden" />
            <button onClick={stopScan} className="mt-3 w-full py-2 rounded-lg border border-border text-sm inline-flex items-center justify-center gap-2"><CameraOff size={16} />Stop</button>
          </>
        )}
        {last && <div className="mt-3 text-center text-sm text-success"><CheckCircle2 className="inline mr-1" size={14} />Last: {last.name} · {last.at.toLocaleTimeString()}</div>}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Manual search — name, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 pr-3 py-2 w-full rounded-lg border border-input bg-background text-sm" />
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2">
              <div className="text-sm">
                <div className="font-medium">{r.player?.full_name}</div>
                <div className="text-xs text-muted-foreground">{r.player?.city} · {r.player?.phone}</div>
              </div>
              {r.checkin_status === "checked_in" ? (
                <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 size={14} />In</span>
              ) : (
                <button onClick={() => checkIn(r.id, r.player?.full_name)} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">Check in</button>
              )}
            </div>
          ))}
          {results.length === 0 && <div className="text-center text-muted-foreground py-6 text-sm">No matches.</div>}
        </div>
      </div>
    </div>
  );
}
