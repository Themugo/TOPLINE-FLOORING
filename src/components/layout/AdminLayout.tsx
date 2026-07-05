import { Link, useLocation } from "wouter";
import { useGetAdminMe, useAdminLogout } from "@/lib/api";
import { LayoutDashboard, Package, Tags, ShoppingCart, Users, LogOut, Loader2, Menu, X, Image, Star, Building2, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useGetAdminMe();
  const logout = useAdminLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/admin/login");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Session should exist since AdminAuthGuard handles the redirect
  // This is a safety fallback
  if (!session?.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/quotations", label: "Quotations", icon: FileText },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/categories", label: "Categories", icon: Tags },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { divider: true },
    { section: "Content" },
    { href: "/admin/hero-slides", label: "Hero Slides", icon: Image },
    { href: "/admin/testimonials", label: "Testimonials", icon: Star },
    { href: "/admin/partners", label: "Partners", icon: Building2 },
    { divider: true },
    { section: "Configuration" },
    { href: "/admin/settings", label: "Site Settings", icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar text-sidebar-foreground">
        <span className="font-display font-semibold tracking-tight">Admin Panel</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2" aria-label="Toggle menu">
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <aside className={cn(
        "bg-sidebar text-sidebar-foreground w-full md:w-64 flex-col border-r border-sidebar-border transition-all md:translate-x-0 md:flex fixed md:sticky top-0 h-[100dvh] z-40",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-sidebar-border hidden md:block">
          <h2 className="font-display font-bold text-xl tracking-tight text-sidebar-primary">Topline Admin</h2>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {links.map((link, idx) => {
            if ("divider" in link) {
              return <div key={idx} className="my-3 border-t border-sidebar-border" />;
            }
            if ("section" in link) {
              return (
                <p key={idx} className="px-3 pt-2 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50 font-sans font-medium">
                  {link.section}
                </p>
              );
            }
            const Icon = link.icon;
            const isActive = location === link.href || (link.href !== "/admin" && location.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="mb-4 px-3 flex flex-col">
            <span className="text-xs text-sidebar-foreground/60 uppercase font-semibold tracking-wider">Logged in as</span>
            <span className="text-sm font-medium truncate">{session.username}</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
