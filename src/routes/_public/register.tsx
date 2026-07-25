import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tournamentsQuery, tournamentBySlugQuery } from "@/lib/supabase-queries";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { cropFaceSquare } from "@/lib/face-crop";
import type { CustomField } from "@/routes/admin/form-builder";


type SearchParams = { tournament?: string };

export const Route = createFileRoute("/_public/register")({
  head: () => ({ meta: [{ title: "Register — 64 Squares Society" }] }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({ tournament: s.tournament as string | undefined }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(tournamentsQuery); },
  component: Register,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

function Register() {
  const search = Route.useSearch() as SearchParams;
  const nav = useNavigate();
  const { data: tournaments } = useSuspenseQuery(tournamentsQuery);
  const upcoming = tournaments.filter((t) => t.status !== "completed");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tournamentSlug, setTournamentSlug] = useState<string>(search.tournament ?? upcoming[0]?.slug ?? "");
  const { data: tournament } = useSuspenseQuery(tournamentBySlugQuery(tournamentSlug || (upcoming[0]?.slug ?? "")));

  const [player, setPlayer] = useState({
    full_name: "", dob: "", gender: "", city: "", state: "", school: "",
    phone: "", email: "", parent_name: "", parent_phone: "",
    fide_id: "", cda_id: "", rating: "", emergency_contact: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentPath, setPaymentPath] = useState<"gateway" | "proof">("gateway");
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showGateway, setShowGateway] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Admin-built custom fields
  const { data: formConfig } = useQuery({
    queryKey: ["registration_form_config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("body").eq("key", "registration_form_config").maybeSingle();
      try { return JSON.parse(data?.body ?? "{}") as { fields?: CustomField[] }; } catch { return { fields: [] }; }
    },
  });
  const customFields: CustomField[] = useMemo(() => formConfig?.fields ?? [], [formConfig]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (tournament?.tournament_categories?.[0]) setCategoryId(tournament.tournament_categories[0].id);
  }, [tournament]);

  const category = tournament?.tournament_categories?.find((c: any) => c.id === categoryId);
  const amount = Number(category?.entry_fee ?? tournament?.entry_fee ?? 0);

  const customValid = customFields.every((f) => {
    if (!f.required) return true;
    const v = customAnswers[f.id];
    if (f.type === "checkbox") return v === true;
    return v !== undefined && v !== null && String(v).trim() !== "";
  });

  const canStep2 = tournamentSlug && player.full_name && player.email && player.phone && player.city && categoryId && photoFile && customValid;

  const onPhotoChange = async (f: File | null) => {
    if (!f) { setPhotoFile(null); setPhotoPreview(""); return; }
    if (!f.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return; }
    setUploadingPhoto(true);
    try {
      // Face-aware square crop (falls back to center-crop if no face detected)
      const cropped = await cropFaceSquare(f);
      const croppedFile = new File([cropped], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
      setPhotoFile(croppedFile);
      setPhotoPreview(URL.createObjectURL(cropped));
    } catch (err: any) {
      // Fall back to using the original file as-is
      console.warn("Face crop failed, using original photo:", err);
      setPhotoFile(f);
      setPhotoPreview(URL.createObjectURL(f));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    try {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage.from("player-photos").upload(path, photoFile, {
        contentType: "image/jpeg", upsert: false,
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("player-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      return signed?.signedUrl ?? null;
    } catch (e: any) {
      toast.error(e.message ?? "Photo upload failed");
      return null;
    }
  };


  const submit = async (payment: { method: "dummy_gateway" | "manual_proof"; status: "verified" | "pending"; dummy_payment_id?: string; proof_url?: string }) => {
    if (!tournament) return null;
    if (!photoFile) { toast.error("Please upload your photo"); return null; }
    setSubmitting(true);
    try {
      const avatarUrl = await uploadPhoto();
      if (!avatarUrl) { setSubmitting(false); return null; }
      const { data: p, error: pe } = await supabase.from("players").insert({
        full_name: player.full_name, dob: player.dob || null, gender: player.gender || null,
        city: player.city, state: player.state || null, school: player.school || null,
        phone: player.phone, email: player.email,
        parent_name: player.parent_name || null, parent_phone: player.parent_phone || null,
        fide_id: player.fide_id || null, cda_id: player.cda_id || null,
        rating: player.rating ? parseInt(player.rating) : 0,
        emergency_contact: player.emergency_contact || null,
        avatar_url: avatarUrl,
        slug: slugify(player.full_name),
      }).select().single();
      if (pe) throw pe;

      const { data: reg, error: re } = await supabase.from("registrations").insert({
        tournament_id: tournament.id,
        category_id: categoryId,
        player_id: p.id,
        amount,
        payment_method: payment.method,
        payment_status: payment.status,
        status: payment.status === "verified" ? "approved" : "pending",
        dummy_payment_id: payment.dummy_payment_id ?? null,
        proof_url: payment.proof_url ?? null,
        terms_accepted_at: new Date().toISOString(),
      }).select().single();
      if (re) throw re;

      await supabase.from("payments").insert({
        registration_id: reg.id,
        tournament_id: tournament.id,
        amount,
        method: payment.method,
        status: payment.status,
        reference: payment.dummy_payment_id ?? null,
        proof_url: payment.proof_url ?? null,
      });

      return reg;
    } catch (err: any) {
      toast.error(err.message ?? "Registration failed");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const onGatewaySuccess = async (paymentId: string) => {
    if (!termsAccepted) { toast.error("Please accept the Terms & Privacy Policy"); return; }
    const reg = await submit({ method: "dummy_gateway", status: "verified", dummy_payment_id: paymentId });
    if (reg) nav({ to: "/register/success/$id", params: { id: reg.id } });
  };

  const onManualSubmit = async () => {
    if (!termsAccepted) { toast.error("Please accept the Terms & Privacy Policy"); return; }
    if (!proofUrl.trim()) { toast.error("Please add a link to your payment proof"); return; }
    const reg = await submit({ method: "manual_proof", status: "pending", proof_url: proofUrl });
    if (reg) nav({ to: "/register/success/$id", params: { id: reg.id } });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Registration</div>
        <h1 className="mt-2 font-display text-4xl font-semibold">Join a tournament</h1>
      </div>

      <div className="flex items-center gap-2 mb-8 text-sm">
        {["Event", "Player details", "Payment"].map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${step > i + 1 ? "bg-success text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
            <span className={step >= i + 1 ? "" : "text-muted-foreground"}>{s}</span>
            {i < 2 && <div className={`flex-1 h-px ${step > i + 1 ? "bg-success" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tournament</label>
              <select value={tournamentSlug} onChange={(e) => setTournamentSlug(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {upcoming.map((t) => <option key={t.id} value={t.slug}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {tournament?.tournament_categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name} — ₹{c.entry_fee}</option>)}
              </select>
            </div>
            <button onClick={() => setStep(2)} disabled={!tournamentSlug || !categoryId} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50">Continue</button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Full name*", "full_name"], ["Email*", "email"], ["Phone*", "phone"],
                ["City*", "city"], ["State", "state"], ["Date of birth", "dob", "date"],
                ["Gender", "gender"], ["School", "school"],
                ["Parent name", "parent_name"], ["Parent phone", "parent_phone"],
                ["FIDE ID", "fide_id"], ["CDA ID", "cda_id"],
                ["Rating", "rating", "number"], ["Emergency contact", "emergency_contact"],
              ] as const
            ).map(([label, key, type]) => (
              <div key={key} className={key === "emergency_contact" ? "sm:col-span-2" : ""}>
                <label className="text-sm font-medium">{label}</label>
                <input
                  type={type ?? "text"}
                  value={(player as any)[key]}
                  onChange={(e) => setPlayer({ ...player, [key]: e.target.value })}
                  required={String(label).includes("*")}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Photo* <span className="text-xs text-muted-foreground font-normal">(auto-cropped to your face, printed on your certificate & profile)</span></label>
              <div className="mt-1 flex items-center gap-4 rounded-lg border border-dashed border-input bg-background p-3">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0 ring-2 ring-gold/40">
                  {uploadingPhoto ? <Loader2 size={20} className="animate-spin" />
                    : photoPreview ? <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
                    : "No photo"}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
                    className="text-sm w-full"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {uploadingPhoto ? "Detecting your face and cropping…" : "Clear headshot works best. JPG/PNG under 5MB."}
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 flex gap-3 mt-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg border border-border">Back</button>
              <button onClick={() => setStep(3)} disabled={!canStep2} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex justify-between"><span>{tournament?.name}</span><span className="text-muted-foreground">{category?.name}</span></div>
              <div className="mt-2 flex justify-between items-baseline">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-display text-2xl text-gold">₹{amount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentPath("gateway")} className={`p-4 rounded-xl border text-left ${paymentPath === "gateway" ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="font-medium text-sm">Pay online</div>
                <div className="text-xs text-muted-foreground mt-1">Instant confirmation (demo mode)</div>
              </button>
              <button onClick={() => setPaymentPath("proof")} className={`p-4 rounded-xl border text-left ${paymentPath === "proof" ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="font-medium text-sm">Upload payment proof</div>
                <div className="text-xs text-muted-foreground mt-1">Manual verification by admin</div>
              </button>
            </div>

            <label className="flex items-start gap-3 text-sm rounded-xl border border-border bg-muted/30 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[color:var(--color-primary)]"
              />
              <span>
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noreferrer" className="underline text-gold">Terms &amp; Conditions</a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" className="underline text-gold">Privacy Policy</a>.
                {" "}For junior categories, a parent or guardian must accept on the player's behalf.
              </span>
            </label>

            {paymentPath === "gateway" ? (
              <button disabled={submitting || !termsAccepted} onClick={() => setShowGateway(true)} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                {termsAccepted ? `Pay ₹${amount}` : "Accept Terms to continue"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Pay via UPI / bank transfer, then paste a link to your screenshot (Google Drive, Imgur, etc).</div>
                <input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <button disabled={submitting || !termsAccepted} onClick={onManualSubmit} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50">
                  {submitting ? "Submitting…" : termsAccepted ? "Submit registration" : "Accept Terms to continue"}
                </button>
              </div>
            )}

            <button onClick={() => setStep(2)} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">Back</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showGateway && <DummyRazorpayModal amount={amount} tournamentName={tournament?.name ?? ""} onClose={() => setShowGateway(false)} onSuccess={(pid) => { setShowGateway(false); onGatewaySuccess(pid); }} />}
      </AnimatePresence>
    </div>
  );
}

function DummyRazorpayModal({ amount, tournamentName, onClose, onSuccess }: { amount: number; tournamentName: string; onClose: () => void; onSuccess: (paymentId: string) => void }) {
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<"pending" | "success" | "fail">("pending");

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      const ok = Math.random() > 0.05; // 95% success
      if (ok) {
        setResult("success");
        setTimeout(() => onSuccess("pay_" + Math.random().toString(36).slice(2, 12)), 900);
      } else {
        setResult("fail");
        setProcessing(false);
      }
    }, 1600);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white text-black overflow-hidden shadow-2xl"
      >
        <div className="bg-[#02042B] text-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-70">Demo payment (no real charge)</div>
            <div className="font-semibold">64 Squares Society</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-70">Amount</div>
            <div className="text-lg font-bold">₹{amount}</div>
          </div>
        </div>
        <div className="p-5">
          {result === "pending" && !processing && (
            <>
              <div className="text-xs text-neutral-600 mb-2">{tournamentName}</div>
              <div className="text-sm font-medium mb-3">Choose payment method</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(["upi", "card", "netbanking"] as const).map((m) => (
                  <button key={m} onClick={() => setMethod(m)} className={`p-3 text-xs rounded-lg border ${method === m ? "border-[#3395FF] bg-[#3395FF]/10" : "border-neutral-200"}`}>
                    {m === "upi" ? "UPI" : m === "card" ? "Card" : "Netbanking"}
                  </button>
                ))}
              </div>
              {method === "upi" && <input placeholder="yourname@upi" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm mb-3" defaultValue="test@upi" />}
              {method === "card" && (
                <div className="space-y-2 mb-3">
                  <input placeholder="Card number" defaultValue="4111 1111 1111 1111" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="MM/YY" defaultValue="12/28" className="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="CVV" defaultValue="123" className="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}
              {method === "netbanking" && (
                <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm mb-3">
                  <option>HDFC Bank</option><option>ICICI Bank</option><option>SBI</option><option>Axis</option>
                </select>
              )}
              <button onClick={pay} className="w-full py-3 rounded-lg bg-[#3395FF] text-white font-medium">Pay ₹{amount}</button>
              <button onClick={onClose} className="w-full mt-2 py-2 text-sm text-neutral-500">Cancel</button>
            </>
          )}
          {processing && result === "pending" && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="animate-spin" size={36} />
              <div className="text-sm text-neutral-600">Processing payment…</div>
            </div>
          )}
          {result === "success" && (
            <div className="py-8 flex flex-col items-center gap-3">
              <CheckCircle2 size={48} className="text-green-600" />
              <div className="font-semibold">Payment successful</div>
              <div className="text-xs text-neutral-500">Redirecting…</div>
            </div>
          )}
          {result === "fail" && (
            <div className="py-8 flex flex-col items-center gap-3">
              <XCircle size={48} className="text-red-600" />
              <div className="font-semibold">Payment failed</div>
              <button onClick={() => { setResult("pending"); setProcessing(false); }} className="text-sm underline">Try again</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
