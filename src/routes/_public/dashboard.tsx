import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getPlayerDashboard } from "@/lib/entry-batches.functions";
import { draftExpiryWarning } from "@/lib/entry-batch-pricing";

export const Route = createFileRoute("/_public/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — 64 Squares Society" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof getPlayerDashboard>> | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { next: "/dashboard" }, replace: true });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    getPlayerDashboard().then(setData).catch((e) => setErr(e.message ?? "Could not load your dashboard"));
  }, [user]);

  if (loading || !user) return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading…</div>;

  const username = data?.profile?.username;
  const now = Date.now();
  const draftWarnings = (data?.drafts ?? []).map((d) => ({ ...d, warn: draftExpiryWarning(d.expires_at, now) }));

  const rows = data?.registrations ?? [];
  const pending = rows.filter((r) => r.is_draft || r.payment_status === "pending");
  const paid = rows.filter((r) => !r.is_draft && r.payment_status === "verified");
  const upcoming = paid.filter((r) => {
    const st = (r.tournament as any)?.status;
    return st === "published" || st === "ongoing" || st === "draft";
  });
  const past = paid.filter((r) => (r.tournament as any)?.status === "completed");

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Your account</div>
          <h1 className="mt-2 font-display text-4xl font-semibold">{username ? `@${username}` : "Dashboard"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.profile?.phone ? `Signed in with ${data.profile.phone}` : "Your registrations live here."}
          </p>
        </div>
        <button onClick={signOut} className="text-sm underline text-muted-foreground">Sign out</button>
      </div>

      {err && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</div>}

      {draftWarnings.some((d) => d.warn.approaching || d.warn.expired) && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          {draftWarnings.filter((d) => d.warn.expired).map((d) => (
            <div key={d.id}>Unpaid entries for {(d.tournament as any)?.name ?? "a tournament"} have expired and were cleared.</div>
          ))}
          {draftWarnings.filter((d) => d.warn.approaching && !d.warn.expired).map((d) => (
            <div key={d.id}>
              Unpaid draft for {(d.tournament as any)?.name ?? "a tournament"} expires soon
              {d.warn.hoursLeft != null ? ` (about ${Math.ceil(d.warn.hoursLeft)} hours left)` : ""}. Finish payment to keep these entries.
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <Link to="/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Register for a tournament</Link>
      </div>

      <Section title="Unpaid / pending" empty="No pending entries.">
        {pending.map((r) => <Row key={r.id} r={r} tag={r.is_draft ? "Draft" : "Pending"} />)}
      </Section>
      <Section title="Upcoming tournaments" empty="No paid upcoming entries yet.">
        {upcoming.map((r) => <Row key={r.id} r={r} tag="Paid" />)}
      </Section>
      <Section title="Past results" empty="No past tournaments on this account yet.">
        {past.map((r) => <Row key={r.id} r={r} tag={(r.tournament as any)?.status ?? "Done"} />)}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  const has = list.filter(Boolean).length > 0;
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold mb-3">{title}</h2>
      {has ? <div className="divide-y divide-border">{children}</div> : <div className="text-sm text-muted-foreground">{empty}</div>}
    </section>
  );
}

function Row({ r, tag }: { r: any; tag: string }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm gap-3">
      <div>
        <div className="font-medium">{r.player?.full_name}</div>
        <div className="text-xs text-muted-foreground">{r.tournament?.name} · {r.category?.name}</div>
      </div>
      <div className="text-right">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{tag}</div>
        <div>₹{r.amount}</div>
        {!r.is_draft && (
          <Link to="/register/success/$id" params={{ id: r.id }} className="text-xs text-primary underline">Receipt</Link>
        )}
      </div>
    </div>
  );
}
