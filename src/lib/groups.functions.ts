import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Group entry bookings.
 *
 * The organizer pays once for 5+ entries and then fills in player names via a
 * tokenised "manage your group" link. Pricing (threshold + discount) always
 * comes from the CMS + the tournament row on the server, never from the client.
 */

const PHONE = /^[6-9]\d{9}$/;

const createSchema = z.object({
  tournamentId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  groupSize: z.number().int().min(2).max(200),
  organizerName: z.string().trim().min(2).max(120),
  organizerEmail: z.string().trim().email().max(255),
  organizerPhone: z.string().trim().regex(PHONE, "Enter a valid 10-digit Indian mobile number"),
  organizerCity: z.string().trim().max(120).optional().default(""),
  method: z.enum(["dummy_gateway", "manual_proof"]),
  dummyPaymentId: z.string().trim().max(120).optional().default(""),
  proofUrl: z.string().trim().max(600).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

const tokenSchema = z.object({ token: z.string().trim().min(8).max(64) });

const membersSchema = z.object({
  token: z.string().trim().min(8).max(64),
  members: z
    .array(
      z.object({
        slot_number: z.number().int().min(1).max(200),
        player_name: z.string().trim().max(120).optional().default(""),
        player_phone: z.string().trim().max(20).optional().default(""),
        player_dob: z.string().trim().max(20).optional().default(""),
      }),
    )
    .max(200),
});

/** Threshold + flat per-entry discount, both editable from the Content Manager. */
export const getGroupSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_content")
    .select("key,title")
    .in("key", ["group_discount_threshold", "group_discount_amount"]);
  const map = new Map((data ?? []).map((r) => [r.key, Number(String(r.title ?? "").replace(/[^\d.]/g, ""))]));
  const threshold = map.get("group_discount_threshold");
  const discount = map.get("group_discount_amount");
  return {
    threshold: Number.isFinite(threshold) && (threshold ?? 0) > 1 ? Math.round(threshold!) : 5,
    discount: Number.isFinite(discount) && (discount ?? 0) > 0 ? Math.round(discount!) : 200,
  };
});

export const createGroupBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: settings }, { data: tournament }] = await Promise.all([
      supabaseAdmin.from("site_content").select("key,title").in("key", ["group_discount_threshold", "group_discount_amount"]),
      supabaseAdmin.from("tournaments").select("id,name,entry_fee").eq("id", data.tournamentId).maybeSingle(),
    ]);
    if (!tournament) throw new Error("Tournament not found");

    const s = new Map((settings ?? []).map((r) => [r.key, Number(String(r.title ?? "").replace(/[^\d.]/g, ""))]));
    const threshold = Number.isFinite(s.get("group_discount_threshold")) && (s.get("group_discount_threshold") ?? 0) > 1
      ? Math.round(s.get("group_discount_threshold")!)
      : 5;
    const discount = Number.isFinite(s.get("group_discount_amount")) && (s.get("group_discount_amount") ?? 0) > 0
      ? Math.round(s.get("group_discount_amount")!)
      : 200;

    if (data.groupSize < threshold) throw new Error(`Group bookings need at least ${threshold} entries.`);

    let baseFee = Number(tournament.entry_fee ?? 0);
    if (data.categoryId) {
      const { data: cat } = await supabaseAdmin
        .from("tournament_categories")
        .select("id,entry_fee,tournament_id")
        .eq("id", data.categoryId)
        .maybeSingle();
      if (cat && cat.tournament_id === tournament.id && cat.entry_fee != null) baseFee = Number(cat.entry_fee);
    }

    const perEntry = Math.max(0, baseFee - discount);
    const total = perEntry * data.groupSize;
    const paid = data.method === "dummy_gateway";

    const { data: group, error } = await supabaseAdmin
      .from("registration_groups")
      .insert({
        tournament_id: tournament.id,
        category_id: data.categoryId ?? null,
        organizer_name: data.organizerName,
        organizer_email: data.organizerEmail,
        organizer_phone: data.organizerPhone,
        organizer_city: data.organizerCity || null,
        group_size: data.groupSize,
        base_fee: baseFee,
        discount_per_entry: discount,
        per_entry_price: perEntry,
        total_amount: total,
        payment_method: data.method,
        payment_status: paid ? "verified" : "pending",
        dummy_payment_id: data.dummyPaymentId || null,
        proof_url: data.proofUrl || null,
        notes: data.notes || null,
        terms_accepted_at: new Date().toISOString(),
      })
      .select("id,manage_token,total_amount,per_entry_price,group_size")
      .single();
    if (error) throw new Error(error.message);

    const slots = Array.from({ length: data.groupSize }, (_, i) => ({ group_id: group.id, slot_number: i + 1 }));
    await supabaseAdmin.from("registration_group_members").insert(slots);

    await supabaseAdmin.from("payments").insert({
      group_id: group.id,
      tournament_id: tournament.id,
      amount: total,
      method: data.method,
      status: paid ? "verified" : "pending",
      reference: data.dummyPaymentId || null,
      proof_url: data.proofUrl || null,
    });

    return {
      token: group.manage_token,
      id: group.id,
      total: Number(group.total_amount),
      perEntry: Number(group.per_entry_price),
      groupSize: group.group_size,
    };
  });

export const getGroupByToken = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: group } = await supabaseAdmin
      .from("registration_groups")
      .select(
        "id,group_size,base_fee,discount_per_entry,per_entry_price,total_amount,payment_status,payment_method,organizer_name,organizer_email,organizer_phone,created_at,manage_token,tournament:tournaments(id,name,slug,start_date,registration_deadline),category:tournament_categories(id,name)",
      )
      .eq("manage_token", data.token)
      .maybeSingle();
    if (!group) return null;

    const { data: members } = await supabaseAdmin
      .from("registration_group_members")
      .select("id,slot_number,player_name,player_phone,player_dob")
      .eq("group_id", group.id)
      .order("slot_number");

    return { group, members: members ?? [] };
  });

export const updateGroupMembers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => membersSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: group } = await supabaseAdmin
      .from("registration_groups")
      .select("id,group_size,tournament:tournaments(registration_deadline)")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (!group) throw new Error("Group not found");

    const deadline = (group.tournament as { registration_deadline: string | null } | null)?.registration_deadline;
    if (deadline && new Date(`${deadline}T23:59:59`) < new Date()) {
      throw new Error("Entries have closed for this tournament — please contact the organisers.");
    }

    for (const m of data.members) {
      if (m.slot_number > group.group_size) continue;
      await supabaseAdmin
        .from("registration_group_members")
        .update({
          player_name: m.player_name || null,
          player_phone: m.player_phone || null,
          player_dob: m.player_dob || null,
        })
        .eq("group_id", group.id)
        .eq("slot_number", m.slot_number);
    }
    return { ok: true };
  });
