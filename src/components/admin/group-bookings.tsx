import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Copy, Users } from "lucide-react";

type Member = { id: string; slot_number: number; player_name: string | null; player_phone: string | null };
type Group = {
  id: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  group_size: number;
  base_fee: number;
  discount_per_entry: number;
  per_entry_price: number;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  manage_token: string;
  created_at: string;
  tournament?: { id: string; name: string } | null;
  category?: { name: string } | null;
  registration_group_members?: Member[];
};

const inr = (n: number) => `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;

/** Group bookings shown as one row per booking, expandable to member names. */
export function GroupBookings({ tournamentFilter }: { tournamentFilter: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("registration_groups")
      .select(
        "*, tournament:tournaments(id,name), category:tournament_categories(name), registration_group_members(id,slot_number,player_name,player_phone)",
      )
      .order("created_at", { ascending: false });
    setGroups((data ?? []) as unknown as Group[]);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin_groups")
      .on("postgres_changes", { event: "*", schema: "public", table: "registration_groups" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = groups.filter((g) => !tournamentFilter || g.tournament?.id === tournamentFilter);
  if (visible.length === 0) return null;

  const setPayment = async (id: string, status: string) => {
    const { error } = await supabase.from("registration_groups").update({ payment_status: status as never }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      await supabase.from("payments").update({ status: status as never }).eq("group_id", id);
      toast.success("Group payment updated");
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-gold" />
        <h2 className="font-display text-lg font-semibold">Group bookings</h2>
        <span className="text-xs text-muted-foreground">{visible.length} booking(s) · one payment each</span>
      </div>

      <div className="space-y-2">
        {visible.map((g) => {
          const members = [...(g.registration_group_members ?? [])].sort((a, b) => a.slot_number - b.slot_number);
          const named = members.filter((m) => m.player_name?.trim()).length;
          const expanded = open === g.id;
          return (
            <div key={g.id} className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <button onClick={() => setOpen(expanded ? null : g.id)} className="p-1 text-muted-foreground">
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-gold">
                  Group · {g.group_size}
                </span>
                <div className="min-w-[160px]">
                  <div className="font-medium">{g.organizer_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.organizer_phone} · {g.organizer_email}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {g.tournament?.name}
                  {g.category?.name ? ` · ${g.category.name}` : ""}
                </div>
                <div className="text-xs">
                  {inr(g.per_entry_price)}/entry
                  <span className="text-muted-foreground"> (−{inr(g.discount_per_entry)})</span>
                </div>
                <div className="font-medium">{inr(g.total_amount)}</div>
                <div>
                  <select
                    value={g.payment_status}
                    onChange={(e) => setPayment(g.id, e.target.value)}
                    className="rounded border border-input bg-background px-2 py-1 text-xs"
                  >
                    {["pending", "verified", "failed", "refunded"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className={`text-xs ${named === g.group_size ? "text-success" : "text-warning"}`}>
                  {named}/{g.group_size} named
                </div>
                <button
                  title="Copy organizer manage link"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/g/${g.manage_token}`);
                    toast.success("Manage link copied");
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                >
                  <Copy size={12} /> Manage link
                </button>
              </div>

              {expanded && (
                <div className="grid gap-1 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((m) => (
                    <div key={m.id} className="rounded-lg bg-muted/30 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">#{m.slot_number} </span>
                      {m.player_name?.trim() ? m.player_name : <span className="text-warning">name pending</span>}
                      {m.player_phone ? <span className="text-muted-foreground"> · {m.player_phone}</span> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
