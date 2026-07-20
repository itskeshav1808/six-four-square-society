import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_public/register/success/$id")({
  head: () => ({ meta: [{ title: "Registration confirmed" }, { name: "robots", content: "noindex" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  const { id } = Route.useParams();
  const [reg, setReg] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("registrations")
        .select("*, tournament:tournaments(name, start_date, venue), player:players(full_name, email)")
        .eq("id", id)
        .maybeSingle();
      setReg(data);
      if (data?.qr_token) {
        const dataUrl = await QRCode.toDataURL(`64s:${data.qr_token}`, { width: 320, margin: 1, color: { dark: "#0b1220", light: "#ffffff" } });
        setQrDataUrl(dataUrl);
      }
    })();
  }, [id]);

  if (!reg) return <div className="p-16 text-center">Loading…</div>;
  const verified = reg.payment_status === "verified";

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        {verified ? (
          <><CheckCircle2 className="mx-auto text-success" size={56} />
          <h1 className="mt-4 font-display text-3xl font-semibold">You're in!</h1>
          <p className="mt-2 text-muted-foreground">Save this QR code — you'll need it for check-in at the venue.</p></>
        ) : (
          <><Clock className="mx-auto text-warning" size={56} />
          <h1 className="mt-4 font-display text-3xl font-semibold">Registration received</h1>
          <p className="mt-2 text-muted-foreground">An admin will verify your payment shortly. Once approved, your QR check-in code will be active.</p></>
        )}

        <div className="mt-6 rounded-xl bg-muted/50 p-4 text-sm text-left space-y-1">
          <div><span className="text-muted-foreground">Player:</span> {reg.player?.full_name}</div>
          <div><span className="text-muted-foreground">Event:</span> {reg.tournament?.name}</div>
          <div><span className="text-muted-foreground">Amount:</span> ₹{reg.amount}</div>
          <div><span className="text-muted-foreground">Status:</span> {reg.status}</div>
        </div>

        {qrDataUrl && (
          <div className="mt-6">
            <div className="text-sm font-medium mb-2">Your check-in QR</div>
            <img src={qrDataUrl} alt="QR check-in code" className="mx-auto rounded-xl border border-border p-3 bg-white" width={240} height={240} />
            <a href={qrDataUrl} download={`64s-checkin-${reg.id}.png`} className="mt-3 inline-block text-sm text-primary underline">Download QR</a>
          </div>
        )}

        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/" className="px-4 py-2 rounded-lg border border-border text-sm">Home</Link>
          <Link to="/tournaments" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">More tournaments</Link>
        </div>
      </div>
    </div>
  );
}
