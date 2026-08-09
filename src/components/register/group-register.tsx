import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Minus, Plus, Users } from "lucide-react";
import { createGroupBooking, getGroupSettings } from "@/lib/groups.functions";

const PHONE = /^[6-9]\d{9}$/;
const normalizePhone = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(d.length - 10);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
};
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export type GroupTournament = {
  id: string;
  name: string;
  slug: string;
  entry_fee: number | null;
  tournament_categories?: { id: string; name: string; entry_fee: number | null }[];
};

/**
 * Group entry flow: one organizer, one payment, 5+ discounted entries.
 * Player names are collected later from the tokenised group dashboard.
 */
export function GroupRegister({
  tournaments,
  initialSlug,
  onGateway,
}: {
  tournaments: GroupTournament[];
  initialSlug: string;
  onGateway: (amount: number, label: string, onSuccess: (paymentId: string) => void) => void;
}) {
  const nav = useNavigate();
  const settingsFn = useServerFn(getGroupSettings);
  const createFn = useServerFn(createGroupBooking);
  const { data: settings } = useQuery({ queryKey: ["group_settings"], queryFn: () => settingsFn({}) });
  const threshold = settings?.threshold ?? 5;
  const discount = settings?.discount ?? 200;

  const [slug, setSlug] = useState(initialSlug || tournaments[0]?.slug || "");
  const tournament = tournaments.find((t) => t.slug === slug) ?? tournaments[0];
  const categories = tournament?.tournament_categories ?? [];
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const category = categories.find((c) => c.id === categoryId);

  const [size, setSize] = useState(threshold);
  const effectiveSize = Math.max(size, threshold);
  const [organizer, setOrganizer] = useState({ name: "", email: "", phone: "", city: "" });
  const [path, setPath] = useState<"gateway" | "proof">("gateway");
  const [proofUrl, setProofUrl] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const baseFee = Number(category?.entry_fee ?? tournament?.entry_fee ?? 0);
  const perEntry = Math.max(0, baseFee - discount);
  const totals = useMemo(
    () => ({
      normal: baseFee * effectiveSize,
      discounted: perEntry * effectiveSize,
      saved: discount * effectiveSize,
    }),
    [baseFee, perEntry, discount, effectiveSize],
  );

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizer.email.trim());
  const phoneOk = PHONE.test(organizer.phone);
  const ready = !!tournament && organizer.name.trim().length > 1 && emailOk && phoneOk && terms;

  const book = async (payment: { method: "dummy_gateway" | "manual_proof"; dummyPaymentId?: string }) => {
    if (!tournament) return;
    setBusy(true);
    try {
      const res = await createFn({
        data: {
          tournamentId: tournament.id,
          categoryId: categoryId || null,
          groupSize: effectiveSize,
          organizerName: organizer.name.trim(),
          organizerEmail: organizer.email.trim(),
          organizerPhone: organizer.phone,
          organizerCity: organizer.city.trim(),
          method: payment.method,
          dummyPaymentId: payment.dummyPaymentId ?? "",
          proofUrl: payment.method === "manual_proof" ? proofUrl.trim() : "",
        },
      });
      toast.success("Group booked — now add your player names");
      nav({ to: "/g/$token", params: { token: res.token } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Group booking failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gold/40 bg-gold/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users size={16} className="text-gold" />
          Group entry — {threshold}+ players
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Book {threshold} or more entries in a single payment and every entry is {inr(discount)} cheaper. You pay once;
          player names can be added later from your group dashboard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Tournament</label>
          <select
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              const next = tournaments.find((t) => t.slug === e.target.value);
              setCategoryId(next?.tournament_categories?.[0]?.id ?? "");
            }}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {inr(Number(c.entry_fee ?? 0))}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Number of entries</div>
            <div className="text-xs text-muted-foreground">Minimum {threshold} for the group rate</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Fewer entries"
              onClick={() => setSize((s) => Math.max(threshold, s - 1))}
              disabled={effectiveSize <= threshold}
              className="grid h-9 w-9 place-items-center rounded-full border border-border disabled:opacity-40"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center font-display text-2xl tabular-nums">{effectiveSize}</span>
            <button
              type="button"
              aria-label="More entries"
              onClick={() => setSize((s) => Math.min(100, Math.max(threshold, s) + 1))}
              className="grid h-9 w-9 place-items-center rounded-full border border-border"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Normal rate ({inr(baseFee)} × {effectiveSize})</span>
            <span className="line-through">{inr(totals.normal)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Group rate ({inr(perEntry)} × {effectiveSize})</span>
            <span className="text-lg">{inr(totals.discounted)}</span>
          </div>
          <div className="text-xs text-gold">
            {inr(totals.discounted)} for {effectiveSize} entries — you save {inr(totals.saved)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["Your name*", "name", "text"],
            ["Your email*", "email", "email"],
            ["Your mobile number*", "phone", "tel"],
            ["City", "city", "text"],
          ] as const
        ).map(([label, key, type]) => {
          const value = organizer[key];
          const invalid =
            (key === "phone" && value.length > 0 && !phoneOk) || (key === "email" && value.length > 0 && !emailOk);
          return (
            <div key={key}>
              <label className="text-sm font-medium" htmlFor={`g-${key}`}>
                {label}
              </label>
              <input
                id={`g-${key}`}
                type={type}
                inputMode={key === "phone" ? "numeric" : undefined}
                maxLength={key === "phone" ? 10 : 255}
                value={value}
                onChange={(e) =>
                  setOrganizer({ ...organizer, [key]: key === "phone" ? normalizePhone(e.target.value) : e.target.value })
                }
                aria-invalid={invalid || undefined}
                className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm ${invalid ? "border-destructive" : "border-input"}`}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPath("gateway")}
          className={`rounded-xl border p-4 text-left ${path === "gateway" ? "border-primary bg-primary/5" : "border-border"}`}
        >
          <div className="text-sm font-medium">Pay online</div>
          <div className="mt-1 text-xs text-muted-foreground">One payment for the whole group (demo mode)</div>
        </button>
        <button
          type="button"
          onClick={() => setPath("proof")}
          className={`rounded-xl border p-4 text-left ${path === "proof" ? "border-primary bg-primary/5" : "border-border"}`}
        >
          <div className="text-sm font-medium">Upload payment proof</div>
          <div className="mt-1 text-xs text-muted-foreground">Manual verification by admin</div>
        </button>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="text-gold underline">
            Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-gold underline">
            Privacy Policy
          </a>{" "}
          on behalf of every player in this group.
        </span>
      </label>

      {path === "gateway" ? (
        <button
          disabled={!ready || busy}
          onClick={() =>
            onGateway(totals.discounted, `${tournament?.name ?? ""} · ${effectiveSize} group entries`, (pid) =>
              book({ method: "dummy_gateway", dummyPaymentId: pid }),
            )
          }
          className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {ready ? `Pay ${inr(totals.discounted)} for ${effectiveSize} entries` : "Complete your details to continue"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Pay {inr(totals.discounted)} via UPI / bank transfer, then paste a link to your screenshot.
          </div>
          <input
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={!ready || busy || !proofUrl.trim()}
            onClick={() => book({ method: "manual_proof" })}
            className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit group booking"}
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Player names must be finalised before entries close — unnamed slots are treated as unused on the day.
      </p>
    </div>
  );
}
