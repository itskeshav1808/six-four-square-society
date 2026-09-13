import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tournamentsQuery, tournamentBySlugQuery } from "@/lib/supabase-queries";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cropFaceSquare } from "@/lib/face-crop";
import type { CustomField } from "@/routes/admin/form-builder";
import { useAuth } from "@/lib/auth-context";
import { addDraftEntry, getBatchSettings, getMyDraftBatch, payDraftBatch } from "@/lib/entry-batches.functions";


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

/** Keeps only digits and drops a leading +91 / 0 so users can paste any format. */
function normalizeIndianPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(d.length - 10);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
function isValidIndianPhone(raw: string) {
  return INDIAN_MOBILE.test(normalizeIndianPhone(raw));
}

const emptyPlayer = {
  full_name: "", dob: "", gender: "", city: "", state: "", school: "",
  phone: "", email: "", parent_name: "", parent_phone: "",
  fide_id: "", cda_id: "", rating: "", emergency_contact: "",
};

function Register() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <RegisterForm />;
}

function RegisterForm() {
  const search = Route.useSearch() as SearchParams;
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: tournaments } = useSuspenseQuery(tournamentsQuery);
  const upcoming = tournaments.filter((t) => t.status !== "completed");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tournamentSlug, setTournamentSlug] = useState<string>(search.tournament ?? upcoming[0]?.slug ?? "");
  const { data: tournament } = useSuspenseQuery(tournamentBySlugQuery(tournamentSlug || (upcoming[0]?.slug ?? "")));

  const [player, setPlayer] = useState({ ...emptyPlayer });
  const [batchInfo, setBatchInfo] = useState<Awaited<ReturnType<typeof getMyDraftBatch>> | null>(null);
  const [settings, setSettings] = useState({ threshold: 5, discount: 300, expiryDays: 7 });
  const [unlockedFlash, setUnlockedFlash] = useState(false);
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
    if (!authLoading && !user) {
      const next = search.tournament ? `/register?tournament=${encodeURIComponent(search.tournament)}` : "/register";
      nav({ to: "/auth", search: { next }, replace: true });
    }
  }, [user, authLoading, nav, search.tournament]);

  useEffect(() => {
    getBatchSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || !tournament?.id) return;
    getMyDraftBatch({ data: { tournamentId: tournament.id } }).then(setBatchInfo).catch(() => {});
  }, [user, tournament?.id]);

  useEffect(() => {
    if (tournament?.tournament_categories?.[0]) setCategoryId(tournament.tournament_categories[0].id);
  }, [tournament]);

  const customValid = customFields.every((f) => {
    if (!f.required) return true;
    const v = customAnswers[f.id];
    if (f.type === "checkbox") return v === true;
    return v !== undefined && v !== null && String(v).trim() !== "";
  });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(player.email.trim());
  const phoneValid = isValidIndianPhone(player.phone);
  const parentPhoneValid = !player.parent_phone.trim() || isValidIndianPhone(player.parent_phone);

  const canStep2 =
    !!tournamentSlug && !!player.full_name.trim() && emailValid && phoneValid && parentPhoneValid &&
    !!player.city.trim() && !!categoryId && !!photoFile && customValid;

  const [checkingPhone, setCheckingPhone] = useState(false);
  const entryCount = batchInfo?.entries?.length ?? 0;
  const payTotal = (batchInfo?.entries ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);
  const unlocked = !!batchInfo?.batch?.discount_applied;

  const validateDetails = async () => {
    if (!player.full_name.trim()) { toast.error("Please enter the player's full name."); return false; }
    if (!emailValid) { toast.error("Please enter a valid email address."); return false; }
    if (!phoneValid) { toast.error("Please enter a valid 10-digit mobile number."); return false; }
    if (!parentPhoneValid) { toast.error("Parent phone must be a valid 10-digit mobile number."); return false; }
    if (!player.city.trim()) { toast.error("Please enter your city."); return false; }
    if (!photoFile) { toast.error("Please upload your photo."); return false; }
    if (!customValid) { toast.error("Please answer all required questions."); return false; }
    return true;
  };

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


  const saveCurrentEntry = async () => {
    if (!tournament) return null;
    if (!photoFile) { toast.error("Please upload your photo"); return null; }
    setSubmitting(true);
    setCheckingPhone(true);
    try {
      const { data: dup, error: dupErr } = await supabase.rpc("phone_already_registered", {
        _phone: normalizeIndianPhone(player.phone),
      });
      if (dupErr) throw dupErr;
      if (dup === true) {
        toast.error("This mobile number is already registered for a tournament. Please use a different number or contact us.");
        return null;
      }
      const avatarUrl = await uploadPhoto();
      if (!avatarUrl) return null;
      const result = await addDraftEntry({
        data: {
          tournamentId: tournament.id,
          categoryId,
          avatarUrl,
          slug: slugify(player.full_name),
          customFields: customAnswers,
          player: {
            ...player,
            phone: normalizeIndianPhone(player.phone),
            parent_phone: player.parent_phone ? normalizeIndianPhone(player.parent_phone) : "",
          },
        },
      });
      setBatchInfo(result);
      if (result.justUnlocked) {
        setUnlockedFlash(true);
        toast.success(`You've unlocked ₹${result.settings.discount} off per entry!`);
      }
      return result;
    } catch (err: any) {
      toast.error(err.message ?? "Could not save this entry");
      return null;
    } finally {
      setSubmitting(false);
      setCheckingPhone(false);
    }
  };

  const resetForm = () => {
    setPlayer({ ...emptyPlayer });
    setPhotoFile(null);
    setPhotoPreview("");
    setCustomAnswers({});
    setTermsAccepted(false);
  };

  const onRegisterMore = async () => {
    if (!(await validateDetails())) return;
    const saved = await saveCurrentEntry();
    if (!saved) return;
    resetForm();
    setStep(2);
    toast.success(`Entries added: ${saved.count}`);
  };

  const onMakePayment = async () => {
    if (canStep2) {
      if (!(await validateDetails())) return;
      const saved = await saveCurrentEntry();
      if (!saved) return;
      resetForm();
    } else if (entryCount < 1) {
      toast.error("Fill in this entry first, or add at least one entry.");
      return;
    }
    setStep(3);
  };

  const finishPay = async (payment: { method: "dummy_gateway" | "manual_proof"; dummy_payment_id?: string; proof_url?: string }) => {
    const batchId = batchInfo?.batch?.id;
    if (!batchId) { toast.error("No entries to pay for"); return; }
    if (!termsAccepted) { toast.error("Please accept the Terms & Privacy Policy"); return; }
    setSubmitting(true);
    try {
      const paid = await payDraftBatch({
        data: {
          batchId,
          method: payment.method,
          dummyPaymentId: payment.dummy_payment_id ?? "",
          proofUrl: payment.proof_url ?? "",
        },
      });
      if (!paid.firstRegistrationId) {
        nav({ to: "/dashboard", replace: true });
        return;
      }
      nav({ to: "/register/success/$id", params: { id: paid.firstRegistrationId }, replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Payment could not be completed");
    } finally {
      setSubmitting(false);
    }
  };

  const onGatewaySuccess = async (paymentId: string) => {
    await finishPay({ method: "dummy_gateway", dummy_payment_id: paymentId });
  };

  const onManualSubmit = async () => {
    if (!proofUrl.trim()) { toast.error("Please add a link to your payment proof"); return; }
    await finishPay({ method: "manual_proof", proof_url: proofUrl });
  };

  if (authLoading || !user) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted-foreground">Sign in required to register…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Registration</div>
        <h1 className="mt-2 font-display text-4xl font-semibold">Join a tournament</h1>
      </div>

      {entryCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span>Entries added: <strong>{entryCount}</strong></span>
          {unlocked && <span className="text-gold">₹{settings.discount} off per entry unlocked</span>}
          <button type="button" onClick={() => setStep(3)} className="text-xs underline">Review and pay</button>
        </div>
      )}
      {unlockedFlash && (
        <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          You've unlocked ₹{settings.discount} off per entry! The discount applies to every entry in this list, including the ones already added.
        </div>
      )}

      <>
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
                ["Full name*", "full_name"], ["Email*", "email"], ["Mobile number*", "phone"],
                ["City*", "city"], ["State", "state"], ["Date of birth", "dob", "date"],
                ["Gender", "gender"], ["School", "school"],
                ["Parent name", "parent_name"], ["Parent phone", "parent_phone"],
                ["FIDE ID", "fide_id"], ["CDA ID", "cda_id"],
                ["Rating", "rating", "number"], ["Emergency contact", "emergency_contact"],
              ] as const
            ).map(([label, key, type]) => {
              const isPhone = key === "phone" || key === "parent_phone";
              const value = (player as any)[key] as string;
              const showPhoneError = isPhone && value.length > 0 && !isValidIndianPhone(value);
              return (
                <div key={key} className={key === "emergency_contact" ? "sm:col-span-2" : ""}>
                  <label className="text-sm font-medium" htmlFor={`f-${key}`}>{label}</label>
                  <input
                    id={`f-${key}`}
                    type={isPhone ? "tel" : (type ?? "text")}
                    inputMode={isPhone ? "numeric" : undefined}
                    maxLength={isPhone ? 10 : undefined}
                    autoComplete={isPhone ? "tel-national" : undefined}
                    placeholder={isPhone ? "10-digit mobile number" : undefined}
                    value={value}
                    onChange={(e) =>
                      setPlayer({ ...player, [key]: isPhone ? normalizeIndianPhone(e.target.value) : e.target.value })
                    }
                    required={String(label).includes("*")}
                    aria-invalid={showPhoneError || undefined}
                    className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm ${showPhoneError ? "border-destructive" : "border-input"}`}
                  />
                  {isPhone && (
                    <div className={`mt-1 text-xs ${showPhoneError ? "text-destructive" : "text-muted-foreground"}`}>
                      {showPhoneError ? "Please enter a valid 10-digit mobile number." : "Indian mobile number, 10 digits (starts with 6–9)."}
                    </div>
                  )}
                </div>
              );
            })}
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

            {customFields.length > 0 && (
              <div className="sm:col-span-2 mt-2 pt-4 border-t border-border space-y-4">
                <div className="text-sm font-medium text-gold uppercase tracking-wider text-xs">Additional questions</div>
                {customFields.map((f) => (
                  <div key={f.id}>
                    {f.type === "checkbox" ? (
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!customAnswers[f.id]}
                          onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.checked })}
                          className="mt-0.5"
                        />
                        <span>{f.label}{f.required && "*"}</span>
                      </label>
                    ) : (
                      <>
                        <label className="text-sm font-medium">{f.label}{f.required && "*"}</label>
                        {f.type === "textarea" ? (
                          <textarea
                            value={customAnswers[f.id] ?? ""}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.value })}
                            placeholder={f.placeholder}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                        ) : f.type === "select" ? (
                          <select
                            value={customAnswers[f.id] ?? ""}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select…</option>
                            {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type={f.type === "phone" ? "tel" : f.type}
                            value={customAnswers[f.id] ?? ""}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [f.id]: e.target.value })}
                            placeholder={f.placeholder}
                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                        )}
                      </>
                    )}
                    {f.helpText && <div className="text-xs text-muted-foreground mt-1">{f.helpText}</div>}
                  </div>
                ))}
              </div>
            )}

            <div className="sm:col-span-2 flex flex-col gap-3 mt-2">
              <button onClick={() => setStep(1)} className="w-full py-2.5 rounded-lg border border-border">Back</button>
              <button onClick={onMakePayment} disabled={(!canStep2 && entryCount < 1) || checkingPhone || submitting} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {checkingPhone || submitting ? <><Loader2 size={14} className="animate-spin" />Saving…</> : "Make Payment"}
              </button>
              <button onClick={onRegisterMore} disabled={!canStep2 || checkingPhone || submitting} className="w-full py-2.5 rounded-lg border-2 border-gold bg-gold/10 font-medium disabled:opacity-50">
                Register more entries
                <span className="ml-2 text-xs rounded-full bg-gold text-black px-2 py-0.5">₹{settings.discount} off on {settings.threshold}+ entries</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span>{tournament?.name}</span><span className="text-muted-foreground">{entryCount} {entryCount === 1 ? "entry" : "entries"}</span></div>
              {(batchInfo?.entries ?? []).map((e: any) => (
                <div key={e.id} className="flex justify-between text-xs">
                  <span>{e.player?.full_name} · {e.category?.name}</span>
                  <span>₹{e.amount}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between items-baseline border-t border-border pt-2">
                <span className="text-muted-foreground">{unlocked ? `${settings.threshold}+ discount applied (₹${settings.discount} off each)` : `No discount (add ${Math.max(0, settings.threshold - entryCount)} more for ₹${settings.discount} off)`}</span>
                <span className="font-display text-2xl text-gold">₹{payTotal}</span>
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
                {termsAccepted ? `Pay ₹${payTotal}` : "Accept Terms to continue"}
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
      </>

      <AnimatePresence>
        {showGateway && <DummyRazorpayModal amount={payTotal} tournamentName={tournament?.name ?? ""} onClose={() => setShowGateway(false)} onSuccess={(pid) => { setShowGateway(false); onGatewaySuccess(pid); }} />}
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
