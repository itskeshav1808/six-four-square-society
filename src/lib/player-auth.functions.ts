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

const accountSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(6).max(72),
});

/** Create Account: name + (mobile or email) + password. Signs in immediately. */
export const signUpPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => accountSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raw = data.identifier;
    const digits = raw.replace(/\D/g, "");
    const isPhone = !raw.includes("@");
    let email: string;
    let phone: string | null = null;
    if (isPhone) {
      if (!PHONE.test(digits.slice(-10)) || digits.length < 10) {
        throw new Error("Enter a valid 10-digit Indian mobile number or an email address");
      }
      phone = digits.slice(-10);
      email = playerLoginEmail(phone);
      const { data: byPhone } = await supabaseAdmin.from("profiles").select("id").eq("phone", phone).maybeSingle();
      if (byPhone) throw new Error("This mobile number already has an account. Log in instead.");
    } else {
      const parsed = z.string().email().safeParse(raw.toLowerCase());
      if (!parsed.success) throw new Error("Enter a valid email address");
      email = parsed.data;
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name, phone },
    });
    if (error || !created?.user) {
      const msg = (error?.message ?? "").toLowerCase();
      if (msg.includes("already")) throw new Error("This account already exists. Log in instead.");
      throw new Error(error?.message ?? "Could not create the account");
    }
    await supabaseAdmin.from("profiles").update({ full_name: data.name, phone }).eq("id", created.user.id);
    return { ok: true as const, loginEmail: email };
  });
