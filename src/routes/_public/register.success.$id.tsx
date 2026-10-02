import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { CalendarDays, CheckCircle2, Clock, Download, MapPin, MessageCircle, ShieldCheck, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/register/success/$id")({
  head: () => ({ meta: [
    { title: "Tournament Entry Ticket | 64 Squares Society" },
    { name: "description", content: "View your 64 Squares Society tournament registration status and approved entry ticket." },
    { property: "og:title", content: "Tournament Entry Ticket | 64 Squares Society" },
    { property: "og:description", content: "View your tournament registration status and approved entry ticket." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SuccessPage,
});

function SuccessPage() {
  const { id } = Route.useParams();
  const [reg, setReg] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [whatsappUrl, setWhatsappUrl] = useState<string>("");
  const [supportPhone, setSupportPhone] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.rpc("get_registration_receipt", { _id: id });
      const data = Array.isArray(rows) ? rows[0] : rows;
      if (!data) {
        setMissing(true);
        return;
      }
      setReg(data);
      if (data?.qr_token && data?.status === "approved" && data?.payment_status === "verified") {
        // Encode as a URL so any camera app opens the check-in page.
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const checkinUrl = `${origin}/v/checkin/${data.qr_token}`;
        const dataUrl = await QRCode.toDataURL(checkinUrl, { width: 320, margin: 1, color: { dark: "#0b1220", light: "#ffffff" } });
        setQrDataUrl(dataUrl);
      }
      const { data: wa } = await supabase.from("site_content").select("title").eq("key", "whatsapp_group_url").maybeSingle();
      if (wa?.title) setWhatsappUrl(wa.title.trim());
      const { data: sp } = await supabase.from("site_content").select("title").eq("key", "support_phone").maybeSingle();
      if (sp?.title) setSupportPhone(sp.title.trim());
    })();
  }, [id]);


  if (missing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-muted-foreground">We could not find this receipt. Open your dashboard to view your entries.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-primary underline">Go to dashboard</Link>
      </div>
    );
  }
  if (!reg) return <div className="p-16 text-center">Loading…</div>;
  const ticketReady = reg.payment_status === "verified" && reg.status === "approved";

  const steps = [
    { label: "Registration received", done: true },
    { label: "Payment verification", done: reg.payment_status === "verified" },
    { label: "Entry ticket issued", done: ticketReady },
  ];
  const pieces = ["♔", "♕", "♖", "♗", "♘", "♙", "♚", "♛", "♜", "♝", "♞", "♟"];

  return (
    <div className="relative mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-12 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.concat(pieces).map((p, i) => (
          <motion.span
            key={i}
            className="absolute text-gold/40 select-none"
            style={{ left: `${(i * 37) % 100}%`, fontSize: 18 + ((i * 7) % 22) }}
            initial={{ y: -60, opacity: 0, rotate: 0 }}
            animate={{ y: 900, opacity: [0, 1, 1, 0], rotate: (i % 2 ? 1 : -1) * 220 }}
            transition={{ duration: 5 + (i % 5), delay: (i % 8) * 0.25, ease: "easeIn" }}
          >
            {p}
          </motion.span>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-3xl border border-gold/40 bg-card p-8 text-center shadow-2xl"
      >
        <div className="relative mx-auto h-28 w-28">
          <motion.div
            className="absolute inset-0 rounded-full bg-gold/25 blur-2xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
          <motion.div
            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
          >
            <CheckCircle2 size={60} strokeWidth={2.2} />
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="mt-6 text-xs uppercase tracking-[0.3em] text-gold">{reg.tournament_name}</div>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            {ticketReady ? "Your entry is confirmed!" : "You're registered!"}
          </h1>
          <p className="mt-1 font-display text-xl text-gold">Well played, {reg.player_name?.split(" ")[0]}.</p>
          <p className="mt-4 text-muted-foreground">
            {ticketReady
              ? "Your registration is approved. Save the official entry ticket below and show it at the venue."
              : "Your registration and payment details have been received successfully. Your place is reserved while our team completes a quick verification."}
          </p>
          {!ticketReady && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-1.5 text-sm font-medium text-success">
              <ShieldCheck size={16} /> No further action is needed right now
            </p>
          )}
        </motion.div>

        <div className="mt-8 text-left space-y-3">
          {steps.map((st, i) => (
            <motion.div
              key={st.label}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.2 }}
              className="flex items-center gap-3"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${st.done ? "bg-gold text-primary border-gold" : "border-border text-muted-foreground"}`}>
                {st.done ? <CheckCircle2 size={16} /> : <Clock size={14} />}
              </div>
              <span className={st.done ? "font-medium" : "text-muted-foreground"}>{st.label}</span>
            </motion.div>
          ))}
          {!ticketReady && (
            <p className="text-xs text-muted-foreground pl-11">
              Your confirmed entry ticket will appear here and in your dashboard as soon as verification is complete.
            </p>
          )}
        </div>

        <div className="mt-6 font-mono text-xs uppercase text-muted-foreground">Reference No. {String(reg.id).slice(0, 8)}</div>

        {supportPhone && (
          <a href={`tel:${supportPhone.replace(/\s/g, "")}`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm">
            Questions? Call us at <span className="font-semibold text-gold">{supportPhone}</span>
          </a>
        )}

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

        {ticketReady && qrDataUrl && (
          <div className="mt-8">
            <div id="entry-ticket" className="relative overflow-hidden rounded-lg border border-gold/60 bg-primary text-primary-foreground text-left shadow-xl">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gold" />
              <div className="border-b border-primary-foreground/20 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
                      <Ticket size={15} /> Official entry ticket
                    </div>
                    <div className="mt-2 font-display text-2xl font-semibold">64 Squares Society</div>
                  </div>
                  <div className="rounded-md border border-gold/50 px-2.5 py-1 text-[10px] font-bold uppercase text-gold">Approved</div>
                </div>
              </div>

              <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0 space-y-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-primary-foreground/60">Admit one player</div>
                    <div className="mt-1 font-display text-2xl font-semibold break-words">{reg.player_name}</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold" /><span>{reg.tournament_name}</span></div>
                    {reg.tournament_start && <div className="flex items-center gap-2"><CalendarDays size={16} className="shrink-0 text-gold" /><span>{new Date(`${reg.tournament_start}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>}
                    {reg.tournament_venue && <div className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-gold" /><span>{reg.tournament_venue}</span></div>}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-primary-foreground/60">Ticket No. {String(reg.id).slice(0, 8)}</div>
                </div>

                <div className="mx-auto w-fit rounded-md bg-card p-2.5 text-center sm:mx-0">
                  <img src={qrDataUrl} alt="Entry ticket check-in code" className="h-36 w-36" width={144} height={144} />
                  <div className="mt-1 text-[9px] font-bold uppercase text-card-foreground">Scan at entrance</div>
                </div>
              </div>

              <div className="border-t border-dashed border-primary-foreground/30 px-6 py-3 text-center text-[10px] uppercase text-primary-foreground/60">
                Valid for one entry · Keep this ticket ready at check-in
              </div>
            </div>
            <Button type="button" variant="outline" className="mt-4" onClick={() => window.print()}>
              <Download size={16} /> Print or save ticket
            </Button>
          </div>
        )}

        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/dashboard" className="px-4 py-2 rounded-lg border border-border text-sm">My dashboard</Link>
          <Link to="/tournaments" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">More tournaments</Link>
        </div>
      </motion.div>
    </div>
  );
}
