import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_public/register/success/$id")({
  head: () => ({ meta: [{ title: "Registration confirmed" }, { name: "robots", content: "noindex" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  const { id } = Route.useParams();
  const [reg, setReg] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [whatsappUrl, setWhatsappUrl] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.rpc("get_registration_receipt", { _id: id });
      const data = Array.isArray(rows) ? rows[0] : rows;
      setReg(data);
      if (data?.qr_token) {
        // Encode as a URL so any camera app opens the check-in page.
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const checkinUrl = `${origin}/v/checkin/${data.qr_token}`;
        const dataUrl = await QRCode.toDataURL(checkinUrl, { width: 320, margin: 1, color: { dark: "#0b1220", light: "#ffffff" } });
        setQrDataUrl(dataUrl);
      }
      const { data: wa } = await supabase.from("site_content").select("title").eq("key", "whatsapp_group_url").maybeSingle();
      if (wa?.title) setWhatsappUrl(wa.title.trim());
    })();
  }, [id]);


  if (!reg) return <div className="p-16 text-center">Loading…</div>;
  const verified = reg.payment_status === "verified";

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-border bg-card p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 18 }}
        >
          {verified ? <CheckCircle2 className="mx-auto text-success" size={56} /> : <Clock className="mx-auto text-warning" size={56} />}
        </motion.div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Registration Successful 🎉</h1>
        <p className="mt-2 text-muted-foreground">
          {verified
            ? "You're in! Save the QR code below — you'll need it for check-in at the venue."
            : "We've received your registration. An admin will verify your payment shortly, and your QR check-in code becomes active on approval."}
        </p>

        {/* WhatsApp group */}
        <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/5 p-5">
          <a
            href={whatsappUrl || "https://chat.whatsapp.com/"}
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-4 text-base font-semibold text-black hover:opacity-90 transition-transform hover:scale-[1.02]"
          >
            <MessageCircle size={20} /> Join Official Tournament WhatsApp Group
          </a>
          <p className="mt-3 text-sm text-muted-foreground">
            All tournament announcements, schedules, round pairings and live updates are shared through the official
            WhatsApp group. Please join now so you don't miss anything.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-muted/50 p-4 text-sm text-left space-y-1">
          <div><span className="text-muted-foreground">Player:</span> {reg.player_name}</div>
          <div><span className="text-muted-foreground">Event:</span> {reg.tournament_name}</div>
          <div><span className="text-muted-foreground">Mobile:</span> {reg.player_phone ?? "—"}</div>
          <div><span className="text-muted-foreground">Amount:</span> ₹{reg.amount}</div>

          <div><span className="text-muted-foreground">Payment:</span> {reg.payment_status}</div>
          <div><span className="text-muted-foreground">Status:</span> {reg.status}</div>
          <div><span className="text-muted-foreground">Registered at:</span> {new Date(reg.created_at).toLocaleString("en-IN")}</div>
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
      </motion.div>
    </div>
  );
}
