import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { playerLoginEmail, USERNAME_PATTERN } from "@/lib/player-login";

const PHONE = /^[6-9]\d{9}$/;

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(USERNAME_PATTERN, "Username must be 3 to 20 letters, numbers, or underscores"),
  phone: z.string().trim().regex(PHONE, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(6).max(72),
});

const usernameSchema = z.object({ username: z.string().trim() });

function isUniqueViolation(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  if (err.code === "23505") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("duplicate key") && msg.includes("username");
}

export const checkUsernameAvailable = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => usernameSchema.parse(d))
  .handler(async ({ data }) => {
    const username = data.username;
    if (!USERNAME_PATTERN.test(username)) {
      return { available: false, reason: "Username must be 3 to 20 letters, numbers, or underscores" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (row) return { available: false, reason: "This username is already in use — try another" };
    return { available: true, reason: null as string | null };
  });

export const signUpPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = data.phone.replace(/\D/g, "").slice(-10);
    const username = data.username.trim();
    const email = playerLoginEmail(phone);

    const { data: byName, error: nameErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (nameErr) throw new Error(nameErr.message);
    if (byName) throw new Error("This username is already in use — try another");

    const { data: byPhone, error: phoneErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (phoneErr) throw new Error(phoneErr.message);
    if (byPhone) throw new Error("This mobile number already has an account. Sign in instead.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username, phone, full_name: username },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Could not create the account");

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ username, phone, full_name: username })
      .eq("id", created.user.id);
    if (upErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      if (isUniqueViolation(upErr)) {
        throw new Error("This username is already in use — try another");
      }
      throw new Error(upErr.message);
    }

    return { ok: true as const };
  });
