import { createFileRoute, Outlet, Link, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Trophy, Users, ShieldCheck, Radio, HandCoins, Package, Award, Image, BarChart3, Settings, LogOut, Handshake, ClipboardList, Megaphone } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

const nav: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { to: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
  { to: "/admin/control-center", label: "Control Center", icon: Radio },
  { to: "/admin/volunteers", label: "Volunteers", icon: Users },
  { to: "/admin/finance", label: "Finance", icon: HandCoins },
  { to: "/admin/inventory", label: "Inventory", icon: Package },
  { to: "/admin/certificates", label: "Certificates", icon: Award },
  { to: "/admin/media", label: "Media", icon: Image },
  { to: "/admin/sponsors", label: "Sponsors", icon: Handshake },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const { user, role, loading, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div>Please sign in to access the admin portal.</div>
        <Link to="/auth" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Sign in</Link>
      </div>
    );
  }
  if (role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-xl font-semibold">Access restricted</div>
        <div className="text-sm text-muted-foreground max-w-md">This portal is limited to approved administrators. If this is your account, contact 64squaressociety@gmail.com.</div>
        <Link to="/" className="px-4 py-2 rounded-lg border border-border text-sm">Back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-border bg-card/50 backdrop-blur flex flex-col">
        <Link to="/admin" className="p-4 border-b border-border"><Brand size={32} /></Link>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to as any} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                <Icon size={16} />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border flex items-center justify-between">
          <ThemeToggle />
          <button onClick={signOut} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><LogOut size={14} />Sign out</button>
        </div>
      </aside>
      <main className="ml-60 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
