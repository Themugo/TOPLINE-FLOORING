import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  Users,
  Image,
  Users2,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  Palette,
  LayoutTemplate,
  Truck,
  FolderKanban,
  Megaphone,
  Warehouse,
  BarChart3,
  Tag,
  Folder,
  Search,
  Wrench,
  ShieldCheck,
  ClipboardList,
  Layers,
  FileText as FileDoc,
  Database,
  Shield,
  Navigation,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-data';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/utils';
import { RevenueTrendChart } from '@/components/admin/RevenueTrendChart';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
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
    label: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Sales',
    items: [
      { href: '/admin/crm', label: 'CRM / Leads', icon: Users },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/invoices', label: 'Invoices', icon: FileText },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/quotations', label: 'Quotations', icon: FileText },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/product-brands', label: 'Brands', icon: ShieldCheck },
      { href: '/admin/product-images', label: 'Product Images', icon: Image },
      { href: '/admin/product-specifications', label: 'Specifications', icon: ClipboardList },
      { href: '/admin/product-variants', label: 'Variants', icon: Layers },
      { href: '/admin/product-documents', label: 'Documents', icon: FileDoc },
      { href: '/admin/services', label: 'Services', icon: Wrench },
      { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
      { href: '/admin/inventory', label: 'Inventory', icon: Warehouse },
      { href: '/admin/suppliers', label: 'Suppliers & POs', icon: Truck },
      { href: '/admin/warehouses', label: 'Warehouses', icon: Building2 },
      { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/promotions', label: 'Promotions', icon: Megaphone },
      { href: '/admin/coupons', label: 'Coupons', icon: Tag },
      { href: '/admin/delivery-zones', label: 'Delivery Zones', icon: Truck },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/homepage', label: 'Homepage Builder', icon: LayoutTemplate },
      { href: '/admin/hero-slides', label: 'Hero Slides', icon: Image },
      { href: '/admin/testimonials', label: 'Testimonials', icon: Users2 },
      { href: '/admin/partners', label: 'Partners', icon: Users2 },
      { href: '/admin/media-library', label: 'Media Library', icon: Folder },
      { href: '/admin/seo', label: 'SEO Manager', icon: Search },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/admin/theme', label: 'Theme', icon: Palette },
      { href: '/admin/site-settings', label: 'Site Settings', icon: Globe },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/navigation', label: 'Navigation', icon: Navigation },
      { href: '/admin/backups', label: 'Backups', icon: Database },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
      { href: '/admin/settings', label: 'Admin Settings', icon: Settings },
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Fixed Header for Desktop & Mobile */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-navy-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-2 lg:hidden">
            <span className="font-display font-bold text-lg text-primary-600">Admin Portal</span>
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
                  Flooring Admin
                </h1>
                <p className="text-[11px] text-gray-500 font-medium">Production CMS v2.0</p>
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
      subtitle="Overview of store performance, revenue, orders, and recent activity"
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

interface RecentQuotation {
  id: string;
  name: string;
  project_type: string | null;
  status: string;
  created_at: string;
}

function DashboardContent() {
  const [stats, setStats] = useState([
    { label: 'Total Orders', value: '0', color: 'bg-blue-500' },
    { label: 'Pending Orders', value: '0', color: 'bg-yellow-500' },
    { label: 'Open Leads', value: '0', color: 'bg-purple-500' },
    { label: 'Outstanding', value: formatKES(0), color: 'bg-red-500' },
  ]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const [ordersRes, pendingRes, leadsRes, invoicesRes] = await Promise.all([
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('leads').select('id', { count: 'exact', head: true }).not('status', 'in', '(won,lost)'),
          supabase.from('invoices').select('total_amount, amount_paid').not('status', 'in', '(paid,cancelled)'),
        ]);

        const outstanding = (invoicesRes.data || []).reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0);

        setStats([
          { label: 'Total Orders', value: ordersRes.count?.toString() || '0', color: 'bg-blue-500' },
          { label: 'Pending Orders', value: pendingRes.count?.toString() || '0', color: 'bg-yellow-500' },
          { label: 'Open Leads', value: leadsRes.count?.toString() || '0', color: 'bg-purple-500' },
          { label: 'Outstanding', value: formatKES(outstanding), color: 'bg-red-500' },
        ]);

        const { data: recentOrdersData } = await supabase
          .from('orders')
          .select('id, customer_name, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentOrders(recentOrdersData || []);

        const { data: recentQuotesData } = await supabase
          .from('quotations')
          .select('id, name, project_type, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentQuotations(recentQuotesData || []);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const orderStatusStyle = (status: string) =>
    status === 'pending'
      ? 'bg-yellow-100 text-yellow-700'
      : status === 'cancelled'
      ? 'bg-red-100 text-red-700'
      : 'bg-green-100 text-green-700';

  const quoteStatusStyle = (status: string) =>
    status === 'new' || status === 'draft'
      ? 'bg-accent-100 text-accent-700'
      : 'bg-gray-100 text-navy-600';

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-navy-500">{stat.label}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-navy-900">
              {loading ? <span className="inline-block h-8 w-12 bg-gray-100 rounded animate-pulse" /> : stat.value}
            </p>
          </div>
        ))}
      </div>

      <RevenueTrendChart />

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="font-semibold text-navy-900 mb-4">Recent Orders</h2>
          {loading ? (
            <p className="text-navy-400 text-sm">Loading...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-navy-400 text-sm">No orders yet</p>
          ) : (
            <div className="space-y-1">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-navy-900 truncate">{order.customer_name}</p>
                    <p className="text-xs text-navy-400">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-medium text-navy-900">{formatKES(order.total_amount || 0)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orderStatusStyle(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="font-semibold text-navy-900 mb-4">Recent Quotations</h2>
          {loading ? (
            <p className="text-navy-400 text-sm">Loading...</p>
          ) : recentQuotations.length === 0 ? (
            <p className="text-navy-400 text-sm">No quotation requests yet</p>
          ) : (
            <div className="space-y-1">
              {recentQuotations.map((quote) => (
                <Link
                  key={quote.id}
                  href="/admin/quotations"
                  className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-navy-900 truncate">{quote.name}</p>
                    <p className="text-xs text-navy-400">{quote.project_type || 'General'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-3 ${quoteStatusStyle(quote.status)}`}>
                    {quote.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Add Product', href: '/admin/products' },
            { label: 'View Orders', href: '/admin/orders' },
            { label: 'CRM / Leads', href: '/admin/crm' },
            { label: 'Invoices', href: '/admin/invoices' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center font-medium text-navy-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
