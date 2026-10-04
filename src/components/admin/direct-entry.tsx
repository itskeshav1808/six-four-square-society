import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, MessageCircle, Ticket } from "lucide-react";
import { createDirectEntry } from "@/lib/direct-entry.functions";

const MODES = [
  { value: "cash", label: "Cash to Organizer" },
  { value: "upi", label: "Direct UPI / GPay" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

/** Admin "+ Direct Entry" sheet: 30-second offline/cash/direct-UPI registration with instant ticket. */
export function DirectEntry({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [issued, setIssued] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [form, setForm] = useState({
    tournamentId: "", categoryId: "", fullName: "", phone: "", city: "", rating: "",
    paymentMode: "cash" as "cash" | "upi" | "bank_transfer", note: "", addAnother: false,
  });

  useEffect(() => {
    if (!open) return;
    supabase.from("tournaments").select("id,name,entry_fee").in("status", ["published", "ongoing"]).then(({ data }) => setTournaments(data ?? []));
  }, [open]);

  useEffect(() => {
    if (!form.tournamentId) { setCategories([]); return; }
    supabase.from("tournament_categories").select("id,name,entry_fee").eq("tournament_id", form.tournamentId).then(({ data }) => setCategories(data ?? []));
  }, [form.tournamentId]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const resetPlayer = () => setForm((f) => ({ ...f, fullName: "", phone: "", city: "", rating: "", note: "" }));

  const submit = async () => {
    if (!form.tournamentId) return toast.error("Select a tournament");
    if (form.fullName.trim().length < 2) return toast.error("Enter the player's full name");
    if (!/^[6-9]\d{9}$/.test(form.phone)) return toast.error("Enter a valid 10-digit Indian mobile");
    setBusy(true);
    try {
      const r = await createDirectEntry({
        data: {
          tournamentId: form.tournamentId,
          categoryId: form.categoryId || null,
          fullName: form.fullName.trim(),
          phone: form.phone,
          city: form.city.trim() || null,
          rating: form.rating ? parseInt(form.rating, 10) : null,
          paymentMode: form.paymentMode,
          note: form.note.trim() || null,
        },
      });
      setIssued({ id: r.registrationId, name: form.fullName.trim(), phone: form.phone });
      toast.success("Entry confirmed · ticket issued");
      onDone();
      if (form.addAnother) {
        resetPlayer();
        setIssued(null);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save entry");
    } finally {
      setBusy(false);
    }
  };

  const ticketUrl = issued ? `${window.location.origin}/register/success/${issued.id}` : "";
  const waUrl = issued
    ? `https://wa.me/91${issued.phone}?text=${encodeURIComponent(
        `Hello ${issued.name}, your entry for the tournament has been confirmed by 64 Squares Society. View your official entry ticket here: ${ticketUrl}`,
      )}`
    : "";

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
        <Plus size={16} />Direct Entry
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-semibold">Quick Direct Entry</h2>
            <p className="mt-1 text-xs text-muted-foreground">For offline, cash & direct UPI registrations. Payment is marked verified and the ticket is issued immediately.</p>

            {issued ? (
              <div className="mt-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success"><Ticket size={26} /></div>
                <div className="mt-3 font-semibold">{issued.name} is confirmed</div>
                <p className="mt-1 text-xs text-muted-foreground">Ticket #{issued.id.slice(0, 8)} · payment verified · approved</p>
                <div className="mt-5 grid gap-2">
                  <a href={waUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-success-foreground">
                    <MessageCircle size={16} />Send ticket on WhatsApp
                  </a>
                  <a href={ticketUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm">
                    View ticket
                  </a>
                  <button onClick={() => { resetPlayer(); setIssued(null); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm">
                    <Plus size={16} />Add another player
                  </button>
                  <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:underline">Done</button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <select value={form.tournamentId} onChange={(e) => set("tournamentId", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select tournament…</option>
                  {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {categories.length > 0 && (
                  <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Category (optional)…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.entry_fee ? ` · ₹${c.entry_fee}` : ""}</option>)}
                  </select>
                )}
                <input placeholder="Player full name *" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <input placeholder="Mobile number (10 digits) *" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="City / academy" value={form.city} onChange={(e) => set("city", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                  <input placeholder="Rating (optional)" inputMode="numeric" value={form.rating} onChange={(e) => set("rating", e.target.value.replace(/\D/g, ""))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <select value={form.paymentMode} onChange={(e) => set("paymentMode", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input placeholder="Transaction note (optional)" value={form.note} onChange={(e) => set("note", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={form.addAnother} onChange={(e) => set("addAnother", e.target.checked)} className="rounded border-input" />
                  Save & add another (for academy delegations)
                </label>
                <button onClick={submit} disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60 inline-flex items-center justify-center gap-2">
                  {busy && <Loader2 size={16} className="animate-spin" />}Confirm & Issue Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
