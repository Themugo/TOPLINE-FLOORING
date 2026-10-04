import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  Users,
  Users2,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  LayoutTemplate,
  Truck,
  FolderKanban,
  Megaphone,
  Warehouse,
  BarChart3,
  Folder,
  Search,
  Wrench,
  ShieldCheck,
  ClipboardList,
  FileText as FileDoc,
  Database,
  Shield,
  ChevronRight,
  ExternalLink,
  CheckCircle2, ShieldAlert, TimerReset,
  Building2,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-data';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/admin', label: 'Home', icon: LayoutDashboard },
      { href: '/admin/sales', label: 'Sales & Enquiries', icon: Briefcase },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Products & Services',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/services', label: 'Services', icon: Wrench },
      { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
      { href: '/admin/inventory', label: 'Inventory', icon: Warehouse },
    ],
  },
  {
    label: 'Projects & Delivery',
    items: [
      { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
      { href: '/admin/site-visits', label: 'Site Visits', icon: ClipboardList },
      { href: '/admin/project-delivery', label: 'Delivery', icon: Truck },
      { href: '/admin/installation-workforce', label: 'Installation Team', icon: Users2 },
      { href: '/admin/project-profitability', label: 'Project Profitability', icon: BarChart3 },
      { href: '/admin/service-cases', label: 'Warranty & Service', icon: ShieldCheck },
    ],
  },
  {
    label: 'Website & Content',
    items: [
      { href: '/admin/homepage', label: 'Homepage', icon: LayoutTemplate },
      { href: '/admin/media-library', label: 'Media Library', icon: Folder },
      { href: '/admin/testimonials', label: 'Testimonials', icon: Users2 },
      { href: '/admin/seo', label: 'Website SEO', icon: Search },
    ],
  },
  {
    label: 'Money & Records',
    items: [
      { href: '/admin/invoices', label: 'Invoices', icon: FileText },
      { href: '/admin/quotations', label: 'Quotations', icon: FileDoc },
      { href: '/admin/finance', label: 'Finance', icon: BarChart3 },
      { href: '/admin/reports', label: 'Reports', icon: ClipboardList },
    ],
  },
  {
    label: 'More',
    items: [
      { href: '/admin/promotions', label: 'Promotions', icon: Megaphone },
      { href: '/admin/deliveries', label: 'Delivery Operations', icon: Truck },
      { href: '/admin/suppliers', label: 'Suppliers', icon: Building2 },
      { href: '/admin/settings', label: 'Business Settings', icon: Settings },
    ],
  },
  {
    label: 'System Administration',
    items: [
      { href: '/admin/system-health', label: 'System Health', icon: CheckCircle2 },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
      { href: '/admin/identity-access-360', label: 'Identity & Access', icon: ShieldAlert },
      { href: '/admin/backups', label: 'Backups', icon: Database },
      { href: '/admin/site-control', label: 'Site Control Center', icon: SlidersHorizontal },
      { href: '/admin/automation-operations-360', label: 'Automation & Workers', icon: TimerReset },
      { href: '/admin/reliability-operations-360', label: 'Reliability & Incidents', icon: ShieldAlert },
      { href: '/admin/business-continuity-360', label: 'Business Continuity', icon: ShieldAlert },
      { href: '/admin/data-governance-360', label: 'Data Governance', icon: ShieldAlert },
    ],
  },
];

function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const { logout, user } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [location] = useLocation();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    setLocation('/admin/login');
  };

  const isActive = useCallback(
    (href: string) => {
      if (href === '/admin') return location === '/admin';
      return location.startsWith(href);
    },
    [location]
  );

  // Find parent group label for breadcrumb
  const currentGroupLabel = useMemo(() => {
    for (const g of NAV_GROUPS) {
      if (g.items.some((i) => isActive(i.href))) {
        return g.label;
      }
    }
    return 'Admin';
  }, [isActive]);

  // Flatten items for command palette
  const allNavItems = useMemo(() => {
    return NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
  }, []);

  const filteredNavGroups = useMemo(() => {
    if (!navSearch.trim()) return NAV_GROUPS;
    const term = navSearch.toLowerCase();
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.label.toLowerCase().includes(term) || g.label.toLowerCase().includes(term)),
    })).filter((g) => g.items.length > 0);
  }, [navSearch]);

  const filteredCmdItems = useMemo(() => {
    if (!cmdQuery.trim()) return allNavItems;
    const q = cmdQuery.toLowerCase();
    return allNavItems.filter((i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [cmdQuery, allNavItems]);

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col font-sans">
      {/* Top Fixed Header for Desktop & Mobile */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-navy-100/70 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-[0_8px_30px_rgba(15,23,42,.06)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-navy-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-2 lg:hidden">
            <span className="font-display font-bold text-lg text-navy-950">Topline Admin</span>
          </Link>

          {/* Quick Jumper Button on Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200/80 border border-gray-200 text-gray-500 rounded-lg text-xs font-medium transition-colors w-64 justify-between"
            >
              <span className="flex items-center gap-2 text-gray-600">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                Quick navigate...
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded text-gray-500 font-mono shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 lg:gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            System Ready
          </span>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors"
            title="Preview live website in new tab"
          >
            <Globe className="w-3.5 h-3.5 text-primary-600" />
            <span className="hidden sm:inline">Live Site</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="hidden md:inline-block text-xs font-medium text-navy-800 max-w-[120px] truncate">
              {user?.email || 'Admin'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Admin Header Logo */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-900 text-gold-400 font-display font-bold text-base flex items-center justify-center shadow-xs">
                FL
              </div>
              <div>
                <h1 className="font-display font-bold text-navy-900 leading-tight text-sm">
                  Topline Admin
                </h1>
                <p className="text-[11px] text-gray-500 font-medium">Topline Business Portal</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Nav Search inside Sidebar */}
          <div className="p-3 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter menu..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-gray-800"
              />
              {navSearch && (
                <button
                  onClick={() => setNavSearch('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Nav Items */}
          <nav className="px-3 py-3 space-y-4 overflow-y-auto flex-1">
            {filteredNavGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          active
                            ? 'bg-primary-600 text-white font-semibold shadow-2xs'
                            : 'text-navy-700 hover:bg-gray-100 hover:text-navy-900'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-navy-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer logout */}
          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 w-full text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
            >
              <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 bg-gray-50 flex flex-col">
          {/* Breadcrumb & Header */}
          <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-[1600px] mx-auto">
              <div>
                {/* Breadcrumb Trail */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 font-medium">
                  <Link href="/admin" className="hover:text-primary-600">
                    Dashboard
                  </Link>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">{currentGroupLabel}</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-900 font-semibold">{title}</span>
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">
                  {title}
                </h1>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5 font-normal">{subtitle}</p>}
              </div>

              {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
            </div>
          </div>

          {/* Page Body */}
          <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full flex-1">{children}</div>
        </main>
      </div>

      {/* Command Palette Modal */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-4 pt-20">
          <div
            className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 border-b border-gray-200 bg-gray-50">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search admin module or section..."
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                autoFocus
                className="w-full py-3.5 bg-transparent text-sm focus:outline-hidden text-gray-900 placeholder:text-gray-400"
              />
              <button
                onClick={() => setCmdOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCmdItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  No admin section matching &quot;{cmdQuery}&quot;
                </div>
              ) : (
                filteredCmdItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      setLocation(item.href);
                      setCmdOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-gray-500 group-hover:text-primary-600" />
                      <span className="text-xs font-medium text-gray-900">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 bg-gray-50 border border-gray-200 rounded">
                      {item.group}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 flex justify-between items-center">
              <span>Use Cmd+K anytime to open quick navigation</span>
              <span className="font-mono text-[10px] text-gray-400">ESC to close</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export function DashboardPage() {
  return (
    <AdminLayout
      title="Dashboard"
      subtitle="A simple view of what needs attention today"
    >
      <DashboardContent />
    </AdminLayout>
  );
}

export { AdminLayout };

interface RecentOrder {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

function DashboardContent() {
  const [stats, setStats] = useState([
    { label: 'Orders', value: '0', helper: 'All orders', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Open enquiries', value: '0', helper: 'Customers waiting', href: '/admin/sales', icon: Briefcase },
    { label: 'Active projects', value: '0', helper: 'Work in progress', href: '/admin/projects', icon: FolderKanban },
    { label: 'Outstanding', value: formatKES(0), helper: 'Invoices not fully paid', href: '/admin/invoices', icon: FileText },
  ]);
  const [attention, setAttention] = useState<Array<{label:string; value:string; helper:string; href:string; tone:'amber'|'blue'|'green'}>>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        const [ordersRes, leadsRes, projectsRes, invoicesRes, pendingOrdersRes] = await Promise.all([
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id', { count: 'exact', head: true }).not('status', 'in', '(won,lost)'),
          supabase.from('projects').select('id', { count: 'exact', head: true }).not('status', 'in', '(completed,cancelled)'),
          supabase.from('invoices').select('total_amount, amount_paid').not('status', 'in', '(paid,cancelled)'),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);

        const outstanding = (invoicesRes.data || []).reduce((sum, inv) => sum + Math.max(0, Number(inv.total_amount || 0) - Number(inv.amount_paid || 0)), 0);
        setStats([
          { label: 'Orders', value: String(ordersRes.count || 0), helper: 'All orders', href: '/admin/orders', icon: ShoppingCart },
          { label: 'Open enquiries', value: String(leadsRes.count || 0), helper: 'Customers waiting', href: '/admin/sales', icon: Briefcase },
          { label: 'Active projects', value: String(projectsRes.count || 0), helper: 'Work in progress', href: '/admin/projects', icon: FolderKanban },
          { label: 'Outstanding', value: formatKES(outstanding), helper: 'Invoices not fully paid', href: '/admin/invoices', icon: FileText },
        ]);

        const nextAttention: Array<{label:string; value:string; helper:string; href:string; tone:'amber'|'blue'|'green'}> = [];
        if ((leadsRes.count || 0) > 0) nextAttention.push({ label: 'Customer enquiries need attention', value: String(leadsRes.count), helper: 'Open enquiries', href: '/admin/sales', tone: 'blue' });
        if ((pendingOrdersRes.count || 0) > 0) nextAttention.push({ label: 'Orders are waiting', value: String(pendingOrdersRes.count), helper: 'Pending orders', href: '/admin/orders', tone: 'amber' });
        if (outstanding > 0) nextAttention.push({ label: 'Payments are outstanding', value: formatKES(outstanding), helper: 'Open invoices', href: '/admin/invoices', tone: 'amber' });
        if (nextAttention.length === 0) nextAttention.push({ label: 'Nothing urgent right now', value: 'All clear', helper: 'Your main work areas are up to date', href: '/admin', tone: 'green' });
        setAttention(nextAttention.slice(0, 3));

        const { data: recentOrdersData } = await supabase
          .from('orders')
          .select('id, customer_name, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentOrders(recentOrdersData || []);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    void fetchDashboard();
  }, []);

  const statusClass = (status: string) => {
    if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-gray-200 p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Business workspace</p>
            <h2 className="mt-1 text-xl lg:text-2xl font-bold text-navy-950">What would you like to manage?</h2>
            <p className="mt-1 text-sm text-gray-500">Use the simple areas below. Technical system controls are kept separately under System Administration.</p>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800 transition-colors">
            <Globe className="w-4 h-4" /> View website <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div><h2 className="text-base font-semibold text-navy-950">Today at a glance</h2><p className="text-xs text-gray-500 mt-0.5">The numbers that matter for day-to-day business.</p></div>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return <Link key={stat.label} href={stat.href} className="group bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-primary-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3"><div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center"><Icon className="w-5 h-5" /></div><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 mt-1" /></div>
              <p className="mt-4 text-2xl font-bold text-navy-950">{loading ? <span className="inline-block h-7 w-16 bg-gray-100 rounded animate-pulse" /> : stat.value}</p>
              <p className="text-sm font-medium text-navy-800 mt-1">{stat.label}</p><p className="text-xs text-gray-500 mt-0.5">{stat.helper}</p>
            </Link>;
          })}
        </div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-base font-semibold text-navy-950">Needs attention</h2><p className="text-xs text-gray-500 mt-0.5">Start here when something needs action.</p></div>
        <div className="grid lg:grid-cols-3 gap-4">
          {attention.map((item) => <Link key={item.label} href={item.href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-200 hover:shadow-sm transition-all">
            <div className={`w-2 h-2 rounded-full mb-3 ${item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'blue' ? 'bg-primary-500' : 'bg-emerald-500'}`} />
            <p className="text-sm font-semibold text-navy-900">{item.label}</p><p className="text-xl font-bold text-navy-950 mt-2">{item.value}</p><p className="text-xs text-gray-500 mt-1">{item.helper}</p>
          </Link>)}
        </div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-base font-semibold text-navy-950">Quick actions</h2><p className="text-xs text-gray-500 mt-0.5">Common tasks without hunting through the menu.</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['/admin/products', 'Add product', Package],
            ['/admin/services', 'Add service', Wrench],
            ['/admin/quotations', 'Create quotation', FileText],
            ['/admin/projects', 'Open projects', FolderKanban],
          ].map(([href, label, Icon]) => <Link key={String(href)} href={String(href)} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gray-100 text-navy-700 flex items-center justify-center"><Icon className="w-4 h-4" /></div><span className="text-sm font-semibold text-navy-800">{String(label)}</span>
          </Link>)}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div><h2 className="font-semibold text-navy-950">Recent orders</h2><p className="text-xs text-gray-500 mt-0.5">The latest customer orders.</p></div><Link href="/admin/orders" className="text-xs font-semibold text-primary-700 hover:text-primary-800">View all</Link></div>
        {loading ? <div className="p-5 text-sm text-gray-500">Loading orders...</div> : recentOrders.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-medium text-navy-800">No orders yet</p><p className="text-xs text-gray-500 mt-1">New customer orders will appear here.</p></div> : <div className="divide-y divide-gray-100">
          {recentOrders.map((order) => <Link key={order.id} href="/admin/orders" className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="min-w-0"><p className="text-sm font-medium text-navy-900 truncate">{order.customer_name || 'Customer'}</p><p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p></div>
            <div className="flex items-center gap-3 flex-shrink-0"><span className="text-sm font-semibold text-navy-900">{formatKES(order.total_amount || 0)}</span><span className={`text-[11px] px-2 py-1 rounded-full border font-medium capitalize ${statusClass(order.status)}`}>{order.status}</span></div>
          </Link>)}
        </div>}
      </section>

      <details className="bg-white border border-gray-200 rounded-xl">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between text-sm font-semibold text-navy-900">System administration <span className="text-xs font-normal text-gray-500">For technical support and platform maintenance</span></summary>
        <div className="px-5 pb-5 text-sm text-gray-500">System Health, Audit Logs, Backups, Identity & Access, Automation, Reliability, Business Continuity and Data Governance remain available from the sidebar under <strong>System Administration</strong>. These controls are intentionally not part of the day-to-day business workspace.</div>
      </details>
    </div>
  );
}

