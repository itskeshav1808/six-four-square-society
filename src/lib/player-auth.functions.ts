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

export const checkUsernameAvailable = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => usernameSchema.parse(d))
  .handler(async ({ data }) => {
    const username = data.username;
    if (!USERNAME_PATTERN.test(username)) {
      return { available: false, reason: "Username must be 3 to 20 letters, numbers, or underscores" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("profiles").select("id,username");
    const taken = (rows ?? []).some((r) => (r.username ?? "").toLowerCase() === username.toLowerCase());
    if (taken) return { available: false, reason: "This username is already in use — try another" };
    return { available: true, reason: null as string | null };
  });

export const signUpPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = data.phone.replace(/\D/g, "").slice(-10);
    const username = data.username.trim();
    const email = playerLoginEmail(phone);

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,username,phone");
    const usernameTaken = (profiles ?? []).some((r) => (r.username ?? "").toLowerCase() === username.toLowerCase());
    if (usernameTaken) throw new Error("This username is already in use — try another");
    const phoneTaken = (profiles ?? []).some((r) => r.phone === phone);
    if (phoneTaken) throw new Error("This mobile number already has an account. Sign in instead.");

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
      if (upErr.message.toLowerCase().includes("username")) {
        throw new Error("This username is already in use — try another");
      }
      throw new Error(upErr.message);
    }

    return { ok: true as const };
  });
