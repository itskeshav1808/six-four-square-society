import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, KeyRound, Copy } from "lucide-react";
import {
  createVolunteerAccount,
  resetVolunteerPassword,
  deleteVolunteerAccount,
} from "@/lib/volunteers.functions";

export const Route = createFileRoute("/admin/volunteers")({
  component: VolunteersAdmin,
});

function VolunteersAdmin() {
  const [vols, setVols] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", password: "", role_description: "" });
  const [taskForm, setTaskForm] = useState({ volunteer_id: "", tournament_id: "", title: "", description: "", duty: "", location: "", reporting_time: "" });

  const createVol = useServerFn(createVolunteerAccount);
  const resetPass = useServerFn(resetVolunteerPassword);
  const delVol = useServerFn(deleteVolunteerAccount);

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
    if (!form.full_name.trim()) return toast.error("Enter the volunteer's name");
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) return toast.error("Enter a valid 10-digit mobile number");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      await createVol({
        data: {
          fullName: form.full_name.trim(),
          phone: form.phone.trim(),
          password: form.password,
          roleDescription: form.role_description.trim(),
        },
      });
      toast.success(`Volunteer created. They sign in at /auth with ${form.phone.trim()} and the password you set.`);
      setForm({ full_name: "", phone: "", password: "", role_description: "" });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create the volunteer");
    } finally {
      setBusy(false);
    }
  };

  const removeVol = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} and their login? This cannot be undone.`)) return;
    try {
      await delVol({ data: { volunteerId: id } });
      toast.success("Volunteer removed");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not remove volunteer");
    }
  };

  const changePassword = async (id: string, name: string) => {
    const pass = prompt(`New password for ${name} (at least 6 characters)`);
    if (!pass) return;
    if (pass.length < 6) return toast.error("Password must be at least 6 characters");
    try {
      await resetPass({ data: { volunteerId: id, password: pass } });
      toast.success("Password updated — share it with the volunteer");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update password");
    }
  };

  const addTask = async () => {
    if (!taskForm.volunteer_id || !taskForm.title) return toast.error("Volunteer + title required");
    const payload = { ...taskForm, reporting_time: taskForm.reporting_time || null, tournament_id: taskForm.tournament_id || null };
    const { error } = await supabase.from("volunteer_tasks").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Task assigned"); setTaskForm({ volunteer_id: "", tournament_id: "", title: "", description: "", duty: "", location: "", reporting_time: "" }); load(); }
  };

  return (
    <div className="p-6 lg:p-8 grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="font-display text-xl font-semibold mb-1">Volunteers</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Create a login here. The volunteer signs in on the sign-in page with their <strong>mobile number</strong> and the password you set.
        </p>
        <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-2">
          <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Mobile number (10 digits)" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Password (min 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Role / duty (optional)" value={form.role_description} onChange={(e) => setForm({ ...form, role_description: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button disabled={busy} onClick={addVol} className="w-full inline-flex justify-center items-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"><UserPlus size={14} />{busy ? "Creating…" : "Create volunteer login"}</button>
        </div>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {vols.map((v) => (
            <div key={v.id} className="p-3 flex justify-between items-center gap-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{v.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {v.phone ? `Signs in with ${v.phone}` : "No login yet"}{v.role_description ? ` · ${v.role_description}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {v.phone && (
                  <button title="Copy number" onClick={() => { navigator.clipboard.writeText(v.phone); toast.success("Number copied"); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><Copy size={14} /></button>
                )}
                <button title="Set new password" onClick={() => changePassword(v.id, v.full_name)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><KeyRound size={14} /></button>
                <button title="Remove volunteer" onClick={() => removeVol(v.id, v.full_name)} className="p-1.5 rounded-md hover:bg-muted text-destructive"><Trash2 size={14} /></button>
              </div>
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
          {tasks.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No tasks assigned yet.</div>}
        </div>
      </section>
    </div>
  );
}
