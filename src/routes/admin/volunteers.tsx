import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/admin/volunteers")({
  component: VolunteersAdmin,
});

function VolunteersAdmin() {
  const [vols, setVols] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", role_description: "" });
  const [taskForm, setTaskForm] = useState({ volunteer_id: "", tournament_id: "", title: "", description: "", duty: "", location: "", reporting_time: "" });

  const load = async () => {
    const [v, t, tr] = await Promise.all([
      supabase.from("volunteers").select("*").order("created_at", { ascending: false }),
      supabase.from("volunteer_tasks").select("*, volunteer:volunteers(full_name), tournament:tournaments(name)").order("created_at", { ascending: false }),
      supabase.from("tournaments").select("id,name"),
    ]);
    setVols(v.data ?? []); setTasks(t.data ?? []); setTournaments(tr.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addVol = async () => {
    if (!form.full_name || !form.email) return toast.error("Name and email required");
    const { error } = await supabase.from("volunteers").insert(form);
    if (error) toast.error(error.message); else { toast.success("Volunteer added — ask them to sign up with this email"); setForm({ full_name: "", email: "", phone: "", role_description: "" }); load(); }
  };
  const removeVol = async (id: string) => { await supabase.from("volunteers").delete().eq("id", id); load(); };
  const addTask = async () => {
    if (!taskForm.volunteer_id || !taskForm.title) return toast.error("Volunteer + title required");
    const payload = { ...taskForm, reporting_time: taskForm.reporting_time || null, tournament_id: taskForm.tournament_id || null };
    const { error } = await supabase.from("volunteer_tasks").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Task assigned"); setTaskForm({ volunteer_id: "", tournament_id: "", title: "", description: "", duty: "", location: "", reporting_time: "" }); load(); }
  };

  return (
    <div className="p-8 grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="font-display text-xl font-semibold mb-3">Volunteers</h2>
        <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-2">
          {(["full_name", "email", "phone", "role_description"] as const).map((k) => (
            <input key={k} placeholder={k.replace(/_/g, " ")} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          ))}
          <button onClick={addVol} className="w-full inline-flex justify-center items-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><UserPlus size={14} />Add volunteer</button>
        </div>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {vols.map((v) => (
            <div key={v.id} className="p-3 flex justify-between items-center text-sm">
              <div><div className="font-medium">{v.full_name}</div><div className="text-xs text-muted-foreground">{v.email} · {v.phone}</div></div>
              <button onClick={() => removeVol(v.id)} className="text-destructive"><Trash2 size={14} /></button>
            </div>
          ))}
          {vols.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No volunteers yet.</div>}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold mb-3">Assign task</h2>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2 mb-4">
          <select value={taskForm.volunteer_id} onChange={(e) => setTaskForm({ ...taskForm, volunteer_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select volunteer</option>{vols.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
          </select>
          <select value={taskForm.tournament_id} onChange={(e) => setTaskForm({ ...taskForm, tournament_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">No specific tournament</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {(["title", "duty", "location", "description"] as const).map((k) => (
            <input key={k} placeholder={k} value={(taskForm as any)[k]} onChange={(e) => setTaskForm({ ...taskForm, [k]: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          ))}
          <input type="datetime-local" value={taskForm.reporting_time} onChange={(e) => setTaskForm({ ...taskForm, reporting_time: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={addTask} className="w-full inline-flex justify-center items-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Plus size={14} />Assign</button>
        </div>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border max-h-[500px] overflow-y-auto">
          {tasks.map((t) => (
            <div key={t.id} className="p-3 text-sm">
              <div className="flex justify-between"><div className="font-medium">{t.title}</div><span className="text-xs text-muted-foreground">{t.status}</span></div>
              <div className="text-xs text-muted-foreground">{t.volunteer?.full_name} · {t.tournament?.name ?? "General"} {t.location && `· ${t.location}`}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
