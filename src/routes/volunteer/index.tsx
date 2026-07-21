import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/volunteer/")({
  component: VolunteerTasks,
});

function VolunteerTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("volunteer_tasks").select("*, tournament:tournaments(name)").order("reporting_time", { ascending: true });
    setTasks(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: "pending" | "in_progress" | "completed") => {
    await supabase.from("volunteer_tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
    toast.success("Updated");
    load();
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-2xl font-semibold mb-4">My tasks</h1>
      <div className="space-y-3">
        {tasks.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{t.title}</div>
                <div className="text-xs text-muted-foreground">{t.tournament?.name ?? "General"} {t.location && `· ${t.location}`}</div>
                {t.description && <div className="text-sm mt-2">{t.description}</div>}
                {t.reporting_time && <div className="text-xs mt-2 text-muted-foreground">Reporting: {new Date(t.reporting_time).toLocaleString()}</div>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${t.status === "completed" ? "bg-success/10 text-success" : t.status === "in_progress" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>{t.status}</span>
            </div>
            <div className="mt-3 flex gap-2">
              {t.status !== "in_progress" && <button onClick={() => setStatus(t.id, "in_progress")} className="text-xs px-3 py-1.5 rounded-lg border border-border">Start</button>}
              {t.status !== "completed" && <button onClick={() => setStatus(t.id, "completed")} className="text-xs px-3 py-1.5 rounded-lg bg-success/10 text-success inline-flex items-center gap-1"><CheckCircle2 size={12} />Complete</button>}
            </div>
          </div>
        ))}
        {tasks.length === 0 && <div className="text-center text-muted-foreground py-16">No tasks assigned. An admin will assign you soon.</div>}
      </div>
    </div>
  );
}
