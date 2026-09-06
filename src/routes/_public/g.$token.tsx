import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Users } from "lucide-react";
import { getGroupByToken, updateGroupMembers } from "@/lib/groups.functions";

export const Route = createFileRoute("/_public/g/$token")({
  head: () => ({
    meta: [
      { title: "Manage your group entry — 64 Squares Society" },
      {
        name: "description",
        content: "Add and edit the player names for your 64 Squares Society group booking before entries close.",
      },
      { property: "og:title", content: "Manage your group entry — 64 Squares Society" },
      { property: "og:description", content: "Finalise your group's player names before entries close." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupDashboard,
});

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

type Row = { slot_number: number; player_name: string; player_phone: string; player_dob: string };

function GroupDashboard() {
  const { token } = Route.useParams();
  const fetchGroup = useServerFn(getGroupByToken);
  const saveMembers = useServerFn(updateGroupMembers);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["group", token],
    queryFn: () => fetchGroup({ data: { token } }),
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setRows(
      data.members.map((m) => ({
        slot_number: m.slot_number,
        player_name: m.player_name ?? "",
        player_phone: m.player_phone ?? "",
        player_dob: m.player_dob ?? "",
      })),
    );
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Group not found</h1>
        <p className="mt-3 text-muted-foreground">
          This manage link is no longer valid. Please check the link from your confirmation, or{" "}
          <Link to="/contact" className="text-gold underline">
            contact us
          </Link>
          .
        </p>
      </div>
    );
  }

  const { group } = data;
  const tournament = group.tournament as { name: string; registration_deadline: string | null; start_date: string } | null;
  const { deadline, closed, unnamed, urgent } = getGroupDeadlineState({
    registrationDeadline: tournament?.registration_deadline,
    playerNames: rows.map((r) => r.player_name),
  });

  const save = async () => {
    setSaving(true);
    try {
      await saveMembers({
        data: {
          token,
          members: rows.map((r) => ({
            slot_number: r.slot_number,
            player_name: r.player_name.trim(),
            player_phone: r.player_phone.trim(),
            player_dob: r.player_dob.trim(),
          })),
        },
      });
      toast.success("Player names saved");
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save names");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-xs uppercase tracking-[0.2em] text-gold">Group entry</div>
      <h1 className="mt-2 font-display text-4xl font-semibold">{tournament?.name}</h1>
      <p className="mt-2 text-muted-foreground">
        Booked by {group.organizer_name} · {group.group_size} entries at {inr(Number(group.per_entry_price))} each
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Entries", String(group.group_size)],
          ["Paid (one transaction)", inr(Number(group.total_amount))],
          ["Payment", group.payment_status === "verified" ? "Confirmed" : "Awaiting verification"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            <div className="mt-1 font-display text-xl">{value}</div>
          </div>
        ))}
      </div>

      {closed ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
          <div>
            Entries closed on {deadline?.toLocaleDateString("en-IN")}. Any slots left without a name are treated as
            unused for this tournament — contact the organisers if you need help.
          </div>
        </div>
      ) : urgent ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
          <div>
            Entries close in under 48 hours and {unnamed} slot{unnamed === 1 ? "" : "s"} still {unnamed === 1 ? "has" : "have"}{" "}
            no player name. Unnamed slots will be forfeited.
          </div>
        </div>
      ) : (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <Users size={18} className="mt-0.5 shrink-0 text-gold" />
          <div>
            Add every player's name before entries close
            {deadline ? ` on ${deadline.toLocaleDateString("en-IN")}` : ""}. We need real names for pairings and rating.
          </div>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {rows.map((r, i) => (
          <div key={r.slot_number} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>Player {r.slot_number}</span>
              {r.player_name.trim() ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 size={12} /> named
                </span>
              ) : (
                <span className="text-warning">name pending</span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={r.player_name}
                disabled={closed}
                placeholder="Full name"
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...r, player_name: e.target.value };
                  setRows(next);
                }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                value={r.player_dob}
                disabled={closed}
                type="date"
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...r, player_dob: e.target.value };
                  setRows(next);
                }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {!closed && (
        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save player names"}
        </button>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Keep this page bookmarked — it is your group's private manage link.
      </p>
    </div>
  );
}
