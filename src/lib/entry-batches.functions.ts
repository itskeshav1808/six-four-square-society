import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { lineTotal } from "@/lib/entry-batch-pricing";

const PHONE = /^[6-9]\d{9}$/;

const playerFields = z.object({
  full_name: z.string().trim().min(1).max(120),
  dob: z.string().trim().max(20).optional().default(""),
  gender: z.string().trim().max(40).optional().default(""),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(120).optional().default(""),
  school: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().regex(PHONE, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().trim().email(),
  parent_name: z.string().trim().max(120).optional().default(""),
  parent_phone: z.string().trim().max(20).optional().default(""),
  fide_id: z.string().trim().max(40).optional().default(""),
  cda_id: z.string().trim().max(40).optional().default(""),
  rating: z.string().trim().max(10).optional().default(""),
  emergency_contact: z.string().trim().max(200).optional().default(""),
});

const addSchema = z.object({
  tournamentId: z.string().uuid(),
  categoryId: z.string().uuid(),
  avatarUrl: z.string().url(),
  slug: z.string().trim().min(2).max(80),
  customFields: z.any().optional().default({}),
  player: playerFields,
});

const tournamentSchema = z.object({ tournamentId: z.string().uuid().optional() });

const paySchema = z.object({
  batchId: z.string().uuid(),
  method: z.enum(["dummy_gateway", "manual_proof"]),
  dummyPaymentId: z.string().trim().max(120).optional().default(""),
  proofUrl: z.string().trim().max(600).optional().default(""),
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

function numTitle(raw: string | null | undefined) {
  return Number(String(raw ?? "").replace(/[^\d.]/g, ""));
}

async function loadSettings(admin: any) {
  const { data } = await admin
    .from("site_content")
    .select("key,title")
    .in("key", ["group_discount_threshold", "group_discount_amount", "draft_batch_expiry_days"]);
  const map = new Map((data ?? []).map((r: { key: string; title: string | null }) => [r.key, numTitle(r.title)]));
  const threshold = Number(map.get("group_discount_threshold"));
  const discount = Number(map.get("group_discount_amount"));
  const days = Number(map.get("draft_batch_expiry_days"));
  return {
    threshold: Number.isFinite(threshold) && threshold > 1 ? Math.round(threshold) : 5,
    discount: Number.isFinite(discount) && discount > 0 ? Math.round(discount) : 300,
    expiryDays: Number.isFinite(days) && days > 0 ? Math.round(days) : 7,
  };
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admins only");
}

async function entriesForBatch(admin: any, batchId: string) {
  const { data } = await admin
    .from("registrations")
    .select(
      "id, amount, is_draft, payment_status, status, category_id, dummy_payment_id, player:players(id, full_name, city, rating), category:tournament_categories(id, name, entry_fee)",
    )
    .eq("batch_id", batchId)
    .neq("status", "cancelled")
    .order("created_at");
  return data ?? [];
}

async function applyPricing(admin: any, batchId: string, settings: { threshold: number; discount: number }) {
  const entries = await entriesForBatch(admin, batchId);
  const bases = entries.map((e: any) => Number(e.category?.entry_fee ?? e.amount ?? 0));
  const priced = lineTotal(bases, settings.threshold, settings.discount);
  for (let i = 0; i < entries.length; i++) {
    const next = priced.lines[i];
    if (Number(entries[i].amount) !== next) {
      await admin.from("registrations").update({ amount: next }).eq("id", entries[i].id);
    }
  }
  await admin
    .from("entry_batches")
    .update({ discount_applied: priced.unlocked, discount_per_entry: priced.discountPerEntry })
    .eq("id", batchId);
  return { ...priced, entries: entries.length };
}

export const getBatchSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return loadSettings(supabaseAdmin);
});

export const getMyDraftBatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tournamentSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("expire_draft_batches");
    const settings = await loadSettings(supabaseAdmin);
    let q = supabaseAdmin
      .from("entry_batches")
      .select("id, tournament_id, status, discount_applied, discount_per_entry, expires_at")
      .eq("user_id", context.userId)
      .eq("status", "draft");
    if (data.tournamentId) q = q.eq("tournament_id", data.tournamentId);
    const { data: batch } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!batch) {
      return { batch: null, entries: [] as any[], settings, justUnlocked: false };
    }
    const priced = await applyPricing(supabaseAdmin, batch.id, settings);
    const entries = await entriesForBatch(supabaseAdmin, batch.id);
    const { data: fresh } = await supabaseAdmin
      .from("entry_batches")
      .select("id, tournament_id, status, discount_applied, discount_per_entry, expires_at")
      .eq("id", batch.id)
      .single();
    return { batch: fresh, entries, settings, justUnlocked: priced.unlocked };
  });

export const addDraftEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("expire_draft_batches");
    const settings = await loadSettings(supabaseAdmin);

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, entry_fee")
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (!tournament) throw new Error("Tournament not found");

    const { data: category } = await supabaseAdmin
      .from("tournament_categories")
      .select("id, entry_fee, tournament_id")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (!category || category.tournament_id !== tournament.id) throw new Error("Category not found");

    const baseFee = Number(category.entry_fee ?? tournament.entry_fee ?? 0);
    const parentPhone = data.player.parent_phone.replace(/\D/g, "");
    if (parentPhone && !PHONE.test(parentPhone)) throw new Error("Parent phone must be a valid 10-digit mobile number");

    let { data: batch } = await supabaseAdmin
      .from("entry_batches")
      .select("id, expires_at")
      .eq("user_id", context.userId)
      .eq("tournament_id", tournament.id)
      .eq("status", "draft")
      .maybeSingle();

    if (!batch) {
      const expires = new Date();
      expires.setDate(expires.getDate() + settings.expiryDays);
      const { data: created, error } = await supabaseAdmin
        .from("entry_batches")
        .insert({
          user_id: context.userId,
          tournament_id: tournament.id,
          status: "draft",
          expires_at: expires.toISOString(),
        })
        .select("id, expires_at")
        .single();
      if (error || !created) throw new Error(error?.message ?? "Could not start the entry list");
      batch = created;
    }

    const { data: player, error: pe } = await supabaseAdmin
      .from("players")
      .insert({
        full_name: data.player.full_name,
        gender: data.player.gender || null,
        city: data.player.city,
        state: data.player.state || null,
        school: data.player.school || null,
        fide_id: data.player.fide_id || null,
        cda_id: data.player.cda_id || null,
        rating: data.player.rating ? parseInt(data.player.rating, 10) : 0,
        avatar_url: data.avatarUrl,
        slug: data.slug || slugify(data.player.full_name),
      })
      .select("id")
      .single();
    if (pe || !player) throw new Error(pe?.message ?? "Could not save the player");

    const { error: ppe } = await supabaseAdmin.from("player_private").insert({
      player_id: player.id,
      email: data.player.email.trim(),
      phone: data.player.phone,
      dob: data.player.dob || null,
      parent_name: data.player.parent_name || null,
      parent_phone: parentPhone || null,
      emergency_contact: data.player.emergency_contact || null,
    });
    if (ppe) throw new Error(ppe.message);

    const { error: re } = await supabaseAdmin.from("registrations").insert({
      tournament_id: tournament.id,
      category_id: data.categoryId,
      player_id: player.id,
      amount: baseFee,
      batch_id: batch.id,
      created_by: context.userId,
      is_draft: true,
      status: "pending",
      payment_status: "pending",
      custom_fields: data.customFields,
    });
    if (re) throw new Error(re.message);

    const before = (await entriesForBatch(supabaseAdmin, batch.id)).length - 1;
    const priced = await applyPricing(supabaseAdmin, batch.id, settings);
    const justUnlocked = priced.unlocked && before < settings.threshold && priced.entries >= settings.threshold;

    const { data: fresh } = await supabaseAdmin
      .from("entry_batches")
      .select("id, tournament_id, status, discount_applied, discount_per_entry, expires_at")
      .eq("id", batch.id)
      .single();

    const entries = await entriesForBatch(supabaseAdmin, batch.id);
    return { batch: fresh, entries, settings, justUnlocked, count: entries.length };
  });

export const payDraftBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("expire_draft_batches");
    const settings = await loadSettings(supabaseAdmin);

    const { data: batch } = await supabaseAdmin
      .from("entry_batches")
      .select("*")
      .eq("id", data.batchId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!batch) throw new Error("No unpaid entries found");
    if (batch.status !== "draft") throw new Error("This list has already been paid or has expired");

    const priced = await applyPricing(supabaseAdmin, batch.id, settings);
    if (priced.entries < 1) throw new Error("Add at least one entry before paying");

    const paidOnline = data.method === "dummy_gateway";
    const entries = await entriesForBatch(supabaseAdmin, batch.id);

    await supabaseAdmin
      .from("registrations")
      .update({
        is_draft: false,
        payment_method: data.method,
        dummy_payment_id: data.dummyPaymentId || null,
        proof_url: data.proofUrl || null,
        terms_accepted_at: new Date().toISOString(),
        payment_status: paidOnline ? "verified" : "pending",
        status: paidOnline ? "approved" : "pending",
        approved_at: paidOnline ? new Date().toISOString() : null,
      })
      .eq("batch_id", batch.id)
      .eq("is_draft", true);

    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        batch_id: batch.id,
        tournament_id: batch.tournament_id,
        amount: priced.total,
        method: data.method,
        status: paidOnline ? "verified" : "pending",
        reference: data.dummyPaymentId || null,
        proof_url: data.proofUrl || null,
        verified_at: paidOnline ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (payErr) throw new Error(payErr.message);

    await supabaseAdmin
      .from("entry_batches")
      .update({
        status: "paid",
        dummy_payment_id: data.dummyPaymentId || null,
        proof_url: data.proofUrl || null,
        payment_method: data.method,
      })
      .eq("id", batch.id);

    return {
      batchId: batch.id,
      paymentId: payment.id,
      total: priced.total,
      count: entries.length,
      firstRegistrationId: entries[0]?.id as string,
    };
  });

export const getPlayerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("expire_draft_batches");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, phone, full_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select(
        "id, status, payment_status, is_draft, amount, created_at, batch_id, tournament:tournaments(id, name, slug, start_date, status), player:players(full_name), category:tournament_categories(name)",
      )
      .eq("created_by", context.userId)
      .order("created_at", { ascending: false });

    const { data: drafts } = await supabaseAdmin
      .from("entry_batches")
      .select("id, expires_at, tournament_id, discount_applied, tournament:tournaments(name)")
      .eq("user_id", context.userId)
      .eq("status", "draft");

    return { profile, registrations: regs ?? [], drafts: drafts ?? [] };
  });

export const listAdminEntryBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("expire_draft_batches");
    const { data: batches } = await supabaseAdmin
      .from("entry_batches")
      .select(
        "id, status, discount_applied, discount_per_entry, dummy_payment_id, expires_at, created_at, user_id, tournament:tournaments(id, name)",
      )
      .order("created_at", { ascending: false });

    const ids = (batches ?? []).map((b) => b.id);
    const { data: regs } =
      ids.length === 0
        ? { data: [] as any[] }
        : await supabaseAdmin
            .from("registrations")
            .select("id, batch_id, amount, is_draft, status, payment_status, player:players(full_name)")
            .in("batch_id", ids)
            .neq("status", "cancelled");

    const { data: pays } =
      ids.length === 0
        ? { data: [] as any[] }
        : await supabaseAdmin.from("payments").select("id, batch_id, amount, status, reference").in("batch_id", ids);

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, username, phone, full_name");
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (batches ?? []).map((b) => {
      const members = (regs ?? []).filter((r: any) => r.batch_id === b.id);
      const payment = (pays ?? []).find((p: any) => p.batch_id === b.id) ?? null;
      const account = pmap.get(b.user_id);
      return {
        ...b,
        account,
        entries: members,
        payment,
        entryCount: members.length,
      };
    });
  });
