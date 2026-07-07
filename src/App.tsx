import { CartProvider } from '@/hooks/use-cart';
import { AdminAuthGuard, AdminPublicRoute } from '@/components/admin/AdminGuard';
import { ToastContainer } from '@/components/ui/toast';
import { useLocation } from 'wouter';

// Pages
import Home from '@/pages/home';
import Shop from '@/pages/shop';
import ShopDetail from '@/pages/shop-detail';
import Cart from '@/pages/cart';
import OrderConfirmation from '@/pages/order-confirmation';
import Contact from '@/pages/contact';
import Quotation from '@/pages/quotation';
import Services from '@/pages/services';
import Portfolio from '@/pages/portfolio';
import NotFound from '@/pages/not-found';

// Admin Pages
import AdminLogin from '@/pages/admin/login';
import { DashboardPage } from '@/pages/admin/dashboard';
import AdminOrders from '@/pages/admin/orders';
import AdminProducts from '@/pages/admin/products';
import AdminCategories from '@/pages/admin/categories';
import AdminCustomers from '@/pages/admin/customers';
import AdminQuotations from '@/pages/admin/quotations';
import AdminHeroSlides from '@/pages/admin/hero-slides';
import AdminTestimonials from '@/pages/admin/testimonials';
import AdminPartners from '@/pages/admin/partners';
import AdminSettings from '@/pages/admin/settings';
import AdminSiteSettings from '@/pages/admin/site-settings';
import AdminTheme from '@/pages/admin/theme';
import AdminHomepageBuilder from '@/pages/admin/homepage-builder';
import AdminDeliveryZones from '@/pages/admin/delivery-zones';
import AdminProjects from '@/pages/admin/projects';
import AdminPromotions from '@/pages/admin/promotions';
import AdminInventory from '@/pages/admin/inventory';
import AdminMediaLibrary from '@/pages/admin/media-library';
import AdminReports from '@/pages/admin/reports';
import AdminSeo from '@/pages/admin/seo';
import AdminCoupons from '@/pages/admin/coupons';

function Router() {
  const [location] = useLocation();

  // Admin routes
  if (location === '/admin/login') {
    return (
      <AdminPublicRoute>
        <AdminLogin />
      </AdminPublicRoute>
    );
  }

  if (location === '/admin' || location === '/admin/') {
    return (
      <AdminAuthGuard>
        <DashboardPage />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/orders') {
    return (
      <AdminAuthGuard>
        <AdminOrders />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/products') {
    return (
      <AdminAuthGuard>
        <AdminProducts />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/categories') {
    return (
      <AdminAuthGuard>
        <AdminCategories />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/customers') {
    return (
      <AdminAuthGuard>
        <AdminCustomers />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/quotations') {
    return (
      <AdminAuthGuard>
        <AdminQuotations />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/hero-slides') {
    return (
      <AdminAuthGuard>
        <AdminHeroSlides />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/testimonials') {
    return (
      <AdminAuthGuard>
        <AdminTestimonials />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/partners') {
    return (
      <AdminAuthGuard>
        <AdminPartners />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/settings') {
    return (
      <AdminAuthGuard>
        <AdminSettings />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/site-settings') {
    return (
      <AdminAuthGuard>
        <AdminSiteSettings />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/theme') {
    return (
      <AdminAuthGuard>
        <AdminTheme />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/homepage') {
    return (
      <AdminAuthGuard>
        <AdminHomepageBuilder />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/delivery-zones') {
    return (
      <AdminAuthGuard>
        <AdminDeliveryZones />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/projects') {
    return (
      <AdminAuthGuard>
        <AdminProjects />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/promotions') {
    return (
      <AdminAuthGuard>
        <AdminPromotions />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/inventory') {
    return (
      <AdminAuthGuard>
        <AdminInventory />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/media-library') {
    return (
      <AdminAuthGuard>
        <AdminMediaLibrary />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/reports') {
    return (
      <AdminAuthGuard>
        <AdminReports />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/seo') {
    return (
      <AdminAuthGuard>
        <AdminSeo />
      </AdminAuthGuard>
    );
  }

  if (location === '/admin/coupons') {
    return (
      <AdminAuthGuard>
        <AdminCoupons />
      </AdminAuthGuard>
    );
  }

  // Customer routes
  if (location === '/' || location === '') {
    return <Home />;
  }

  if (location === '/shop') {
    return <Shop />;
  }

  if (location === '/contact') {
    return <Contact />;
  }

  if (location === '/quotation') {
    return <Quotation />;
  }

  if (location === '/services') {
    return <Services />;
  }

  if (location === '/portfolio') {
    return <Portfolio />;
  }

  if (location === '/cart') {
    return <Cart />;
  }

  if (location.startsWith('/product/')) {
    return <ShopDetail />;
  }

  if (location.startsWith('/order-confirmation/')) {
    return <OrderConfirmation />;
  }

  return <NotFound />;
}

function App() {
  return (
    <CartProvider>
      <Router />
      <ToastContainer />
    </CartProvider>
  );
}

export default App;
