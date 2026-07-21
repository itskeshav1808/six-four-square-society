import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { QrCode, ClipboardList, Megaphone, LogOut } from "lucide-react";

export const Route = createFileRoute("/volunteer")({
  component: VolunteerLayout,
});

const nav: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/volunteer", label: "My Tasks", icon: ClipboardList, exact: true },
  { to: "/volunteer/check-in", label: "Check-In Scanner", icon: QrCode },
  { to: "/volunteer/announcements", label: "Announcements", icon: Megaphone },
];

function VolunteerLayout() {
  const { user, role, loading, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div>Please sign in as a volunteer.</div>
      <Link to="/auth" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Sign in</Link>
    </div>
  );
  if (role !== "volunteer" && role !== "admin") return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-xl font-semibold">Volunteer access only</div>
      <div className="text-sm text-muted-foreground max-w-md">Ask an admin to add you as a volunteer.</div>
      <Link to="/" className="px-4 py-2 rounded-lg border border-border text-sm">Back home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/volunteer"><Brand size={28} /></Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><LogOut size={14} />Sign out</button>
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-4 pb-2 flex gap-1 overflow-x-auto">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to as any} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                <Icon size={14} />{n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1"><Outlet /></main>
    </div>
  );
}
