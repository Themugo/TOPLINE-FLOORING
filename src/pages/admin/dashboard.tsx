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
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-data';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
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

function AdminLayout({ children, title }: AdminLayoutProps) {
  const { logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation('/admin/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin') return location === '/admin';
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-navy-600 hover:text-primary-600"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="font-display font-bold text-primary-600">Topline Admin</span>
        <button
          onClick={handleLogout}
          className="p-2 text-navy-500 hover:text-red-600"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 flex-shrink-0">
          <div className="w-10 h-10 rounded-full border-2 border-navy-600 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-600 font-display font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-primary-600 leading-tight">
              TOPLINE
            </h1>
            <p className="text-xs text-navy-500">Admin Portal</p>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-5 overflow-y-auto flex-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold text-navy-400 uppercase tracking-wider">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-navy-600 hover:bg-gray-100 hover:text-navy-900'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-navy-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-[1600px]">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
          </div>
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
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
    <AdminLayout title="Dashboard">
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
