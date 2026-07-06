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
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-data';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

function AdminLayout({ children, title }: AdminLayoutProps) {
  const { logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
    { href: '/admin/inventory', label: 'Inventory', icon: Warehouse },
    { href: '/admin/customers', label: 'Customers', icon: Users },
    { href: '/admin/quotations', label: 'Quotations', icon: FileText },
    { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
    { href: '/admin/promotions', label: 'Promotions', icon: Megaphone },
    { href: '/admin/coupons', label: 'Coupons', icon: Tag },
    { href: '/admin/delivery-zones', label: 'Delivery Zones', icon: Truck },
    { href: '/admin/homepage', label: 'Homepage Builder', icon: LayoutTemplate },
    { href: '/admin/hero-slides', label: 'Hero Slides', icon: Image },
    { href: '/admin/testimonials', label: 'Testimonials', icon: Users2 },
    { href: '/admin/partners', label: 'Partners', icon: Users2 },
    { href: '/admin/media-library', label: 'Media Library', icon: Folder },
    { href: '/admin/seo', label: 'SEO Manager', icon: Search },
    { href: '/admin/theme', label: 'Theme', icon: Palette },
    { href: '/admin/site-settings', label: 'Site Settings', icon: Globe },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/settings', label: 'Admin Settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    setLocation('/admin/login');
  };

  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === '/admin') return location === '/admin';
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-navy-900 border-b border-navy-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-gray-400 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="font-display font-bold text-white">Topline Admin</span>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-400"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy-900 border-r border-navy-800 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-800">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-display font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-white leading-tight">
              TOPLINE
            </h1>
            <p className="text-xs text-primary-400">Admin Portal</p>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-gray-400 hover:bg-navy-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-navy-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
          </div>
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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

function DashboardContent() {
  const [stats, setStats] = useState([
    { label: 'Total Orders', value: '0', color: 'bg-blue-500' },
    { label: 'Pending Orders', value: '0', color: 'bg-yellow-500' },
    { label: 'Quotations', value: '0', color: 'bg-green-500' },
    { label: 'Products', value: '0', color: 'bg-purple-500' },
  ]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const [ordersRes, pendingRes, quotesRes, productsRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('quotations').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      setStats([
        { label: 'Total Orders', value: ordersRes.count?.toString() || '0', color: 'bg-blue-500' },
        { label: 'Pending Orders', value: pendingRes.count?.toString() || '0', color: 'bg-yellow-500' },
        { label: 'Quotations', value: quotesRes.count?.toString() || '0', color: 'bg-green-500' },
        { label: 'Products', value: productsRes.count?.toString() || '0', color: 'bg-purple-500' },
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
    }

    fetchStats();
  }, []);

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-navy-900 rounded-xl p-6 border border-navy-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{stat.label}</span>
              <div className={`w-3 h-3 rounded-full ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-navy-900 rounded-xl p-6 border border-navy-800">
          <h2 className="font-semibold text-white mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center py-2 border-b border-navy-800 last:border-0">
                  <div>
                    <p className="font-medium text-sm text-white">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">KES {order.total_amount?.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'pending' ? 'bg-primary-500/20 text-primary-400' : 'bg-green-500/20 text-green-400'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-navy-900 rounded-xl p-6 border border-navy-800">
          <h2 className="font-semibold text-white mb-4">Recent Quotations</h2>
          {recentQuotations.length === 0 ? (
            <p className="text-gray-500 text-sm">No quotation requests yet</p>
          ) : (
            <div className="space-y-3">
              {recentQuotations.map((quote) => (
                <div key={quote.id} className="flex justify-between items-center py-2 border-b border-navy-800 last:border-0">
                  <div>
                    <p className="font-medium text-sm text-white">{quote.name}</p>
                    <p className="text-xs text-gray-500">{quote.project_type || 'General'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${quote.status === 'new' ? 'bg-accent-500/20 text-accent-400' : 'bg-navy-800 text-gray-400'}`}>
                    {quote.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-navy-900 rounded-xl p-6 border border-navy-800">
        <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Add Product', href: '/admin/products' },
            { label: 'View Orders', href: '/admin/orders' },
            { label: 'Add Category', href: '/admin/categories' },
            { label: 'View Quotations', href: '/admin/quotations' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="p-4 bg-navy-800 rounded-lg text-center font-medium text-gray-300 hover:bg-navy-700 hover:text-white transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
