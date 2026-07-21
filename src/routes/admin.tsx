import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Trophy, Users, ShieldCheck, Radio, HandCoins, Package, Award, Image, BarChart3, Settings, LogOut, Handshake, ClipboardList, Megaphone, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
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
  const [open, setOpen] = useState(false);

  // Auto-close the drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-3 border-b border-border bg-card/80 backdrop-blur">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/admin"><Brand size={28} /></Link>
        <ThemeToggle />
      </header>

      {/* Backdrop (mobile only) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"} lg:bg-card/50 lg:backdrop-blur`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link to="/admin"><Brand size={32} /></Link>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-muted"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to as any} onClick={() => setOpen(false)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
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

      <main className="lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
