import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2, AlertTriangle, Loader2, LogIn } from "lucide-react";

export const Route = createFileRoute("/v/checkin/$token")({
  head: () => ({ meta: [{ title: "Check-in" }, { name: "robots", content: "noindex" }] }),
  component: CheckinByToken,
});

function CheckinByToken() {
  const { token } = Route.useParams();
  const { user, role, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [state, setState] = useState<"loading" | "not-authorized" | "not-found" | "already-in" | "checked-in" | "error">("loading");
  const [reg, setReg] = useState<any>(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;

    (async () => {
      // Everyone can look up the registration (RLS allows reading pending/approved regs).
      const { data, error } = await supabase
        .from("registrations")
        .select("id, checkin_status, status, tournament:tournaments(name), player:players(full_name, city, avatar_url)")
        .eq("qr_token", token)
        .maybeSingle();

      if (error || !data) {
        setState("not-found");
        return;
      }
      setReg(data);

      // If viewer isn't a volunteer/admin, we just show the player details —
      // they can hand the phone to a volunteer at the venue.
      if (!user || (role !== "admin" && role !== "volunteer")) {
        setState("not-authorized");
        return;
      }

      if (data.checkin_status === "checked_in") {
        setState("already-in");
        return;
      }

      // Perform the check-in.
      const { error: upErr } = await supabase
        .from("registrations")
        .update({ checkin_status: "checked_in", checked_in_at: new Date().toISOString(), checked_in_by: user.id })
        .eq("id", data.id);

      if (upErr) {
        setErrMsg(upErr.message);
        setState("error");
      } else {
        setState("checked-in");
      }
    })();
  }, [token, user, role, authLoading]);

  if (state === "loading" || authLoading) {
    return <div className="p-16 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto" /></div>;
  }

  if (state === "not-found") {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto text-destructive" size={48} />
        <h1 className="mt-4 font-display text-2xl">QR not recognized</h1>
        <p className="mt-2 text-muted-foreground text-sm">This code doesn't match any registration.</p>
        <Link to="/" className="mt-6 inline-block underline">Home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6 sm:p-8">
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        {reg?.player?.avatar_url && (
          <img src={reg.player.avatar_url} alt="" className="h-24 w-24 rounded-full mx-auto object-cover ring-2 ring-gold/50" />
        )}
        <div className="mt-4 font-display text-2xl">{reg?.player?.full_name}</div>
        <div className="text-sm text-muted-foreground">{reg?.player?.city}</div>
        <div className="mt-1 text-xs text-muted-foreground">{reg?.tournament?.name}</div>

        {state === "checked-in" && (
          <div className="mt-6 text-success">
            <CheckCircle2 className="mx-auto" size={40} />
            <div className="mt-2 font-medium">Checked in ✓</div>
          </div>
        )}

        {state === "already-in" && (
          <div className="mt-6 text-muted-foreground">
            <CheckCircle2 className="mx-auto text-success" size={40} />
            <div className="mt-2 font-medium">Already checked in</div>
          </div>
        )}

        {state === "not-authorized" && (
          <div className="mt-6">
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-left">
              This is a <b>check-in QR</b>. A tournament volunteer must scan it to admit the player.
              {" "}Please hand this screen to a volunteer at the venue, or if you are a volunteer/admin,{" "}
              <button onClick={() => nav({ to: "/auth" })} className="underline text-primary inline-flex items-center gap-1"><LogIn size={12} />sign in</button>.
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="mt-6 text-destructive text-sm">{errMsg || "Check-in failed."}</div>
        )}

        <Link to="/" className="mt-6 inline-block text-xs text-muted-foreground underline">Back to home</Link>
      </div>
    </div>
  );
}
