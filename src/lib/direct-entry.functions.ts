import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const directEntrySchema = z.object({
  tournamentId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile"),
  city: z.string().trim().max(80).optional().nullable(),
  rating: z.number().int().min(0).max(3500).optional().nullable(),
  paymentMode: z.enum(["cash", "upi", "bank_transfer"]),
  note: z.string().trim().max(200).optional().nullable(),
});

const MODE_LABEL: Record<string, string> = {
  cash: "Cash to Organizer",
  upi: "Direct UPI / GPay",
  bank_transfer: "Bank Transfer",
};

/**
 * Admin-only: record an offline/direct-paid registration in one shot.
 * Creates player + private contact + approved registration + verified payment,
 * flagged `offline_direct` for the financial ledger. Returns the registration id.
 */
export const createDirectEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => directEntrySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve fee: category fee first, then tournament entry fee.
    let amount = 0;
    if (data.categoryId) {
      const { data: cat } = await supabaseAdmin.from("tournament_categories").select("entry_fee").eq("id", data.categoryId).maybeSingle();
      amount = Number(cat?.entry_fee ?? 0);
    }
    if (!amount) {
      const { data: t } = await supabaseAdmin.from("tournaments").select("entry_fee").eq("id", data.tournamentId).maybeSingle();
      amount = Number(t?.entry_fee ?? 0);
    }

    const { data: player, error: pErr } = await supabaseAdmin
      .from("players")
      .insert({ full_name: data.fullName, city: data.city || null, rating: data.rating ?? null })
      .select("id")
      .single();
    if (pErr) throw new Error(pErr.message);

    await supabaseAdmin.from("player_private").insert({ player_id: player.id, phone: data.phone });

    const sourceNote = `offline_direct · ${MODE_LABEL[data.paymentMode]}${data.note ? ` · ${data.note}` : ""}`;
    const now = new Date().toISOString();

    const { data: reg, error: rErr } = await supabaseAdmin
      .from("registrations")
      .insert({
        tournament_id: data.tournamentId,
        category_id: data.categoryId || null,
        player_id: player.id,
        status: "approved",
        payment_status: "verified",
        payment_method: "cash",
        amount,
        qr_token: crypto.randomUUID(),
        approved_by: context.userId,
        approved_at: now,
        created_by: context.userId,
        notes: sourceNote,
      })
      .select("id")
      .single();
    if (rErr) throw new Error(rErr.message);

    await supabaseAdmin.from("payments").insert({
      registration_id: reg.id,
      tournament_id: data.tournamentId,
      amount,
      method: "cash",
      status: "verified",
      reference: sourceNote,
      verified_by: context.userId,
      verified_at: now,
    });

    return { ok: true, registrationId: reg.id as string };
  });
