import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { volunteerLoginEmail } from "@/lib/volunteer-login";

/**
 * Volunteer accounts.
 *
 * Volunteers never sign themselves up. An admin creates the account with a
 * name, a 10-digit mobile number and a password. Behind the scenes the mobile
 * number is turned into a stable internal login address so the volunteer can
 * sign in with just "number + password".
 */

const PHONE = /^[6-9]\d{9}$/;



const createSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(PHONE, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(6).max(72),
  roleDescription: z.string().trim().max(200).optional().default(""),
});

const idSchema = z.object({ volunteerId: z.string().uuid() });

const resetSchema = z.object({
  volunteerId: z.string().uuid(),
  password: z.string().min(6).max(72),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admins only");
}

export const createVolunteerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = data.phone.replace(/\D/g, "").slice(-10);
    const email = volunteerLoginEmail(phone);

    const { data: existing } = await supabaseAdmin
      .from("volunteers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing) throw new Error("A volunteer with this mobile number already exists");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone, is_volunteer: true },
    });
    if (createErr || !created?.user) throw new Error(createErr?.message ?? "Could not create the login");

    const userId = created.user.id;

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "volunteer" });
    if (roleErr && !roleErr.message.includes("duplicate")) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(roleErr.message);
    }

    const { error: volErr } = await supabaseAdmin.from("volunteers").insert({
      user_id: userId,
      full_name: data.fullName,
      email,
      phone,
      role_description: data.roleDescription || null,
      is_active: true,
      created_by: context.userId,
    });
    if (volErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(volErr.message);
    }

    return { ok: true as const, phone, loginEmail: email };
  });

export const resetVolunteerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => resetSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vol, error } = await supabaseAdmin
      .from("volunteers")
      .select("user_id")
      .eq("id", data.volunteerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vol?.user_id) throw new Error("This volunteer has no login yet");

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(vol.user_id, {
      password: data.password,
    });
    if (updErr) throw new Error(updErr.message);
    return { ok: true as const };
  });

export const deleteVolunteerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vol } = await supabaseAdmin
      .from("volunteers")
      .select("user_id")
      .eq("id", data.volunteerId)
      .maybeSingle();

    await supabaseAdmin.from("volunteer_tasks").delete().eq("volunteer_id", data.volunteerId);
    const { error } = await supabaseAdmin.from("volunteers").delete().eq("id", data.volunteerId);
    if (error) throw new Error(error.message);

    if (vol?.user_id) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", vol.user_id).eq("role", "volunteer");
      await supabaseAdmin.auth.admin.deleteUser(vol.user_id);
    }
    return { ok: true as const };
  });
