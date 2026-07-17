import { CartProvider } from '@/hooks/use-cart';
import { AdminAuthGuard, AdminPublicRoute } from '@/components/admin/AdminGuard';
import { ToastContainer } from '@/components/ui/toast';
import { ThemeApplier } from '@/components/ThemeApplier';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLocation } from 'wouter';
import { lazy, Suspense, useEffect } from 'react';

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

// Lazy-loaded pages
const About = lazy(() => import('@/pages/about'));
const FAQ = lazy(() => import('@/pages/faq'));
const ServiceDetail = lazy(() => import('@/pages/service-detail'));
const Compare = lazy(() => import('@/pages/compare'));
const TrackOrder = lazy(() => import('@/pages/track-order'));
const CheckoutSuccess = lazy(() => import('@/pages/checkout-success'));
const Industries = lazy(() => import('@/pages/industries'));
const Market = lazy(() => import('@/pages/market'));

// Admin Pages (lazy-loaded)
const AdminLogin = lazy(() => import('@/pages/admin/login'));
const DashboardPage = lazy(() => import('@/pages/admin/dashboard').then(m => ({ default: m.DashboardPage })));
const AdminOrders = lazy(() => import('@/pages/admin/orders'));
const AdminProducts = lazy(() => import('@/pages/admin/products'));
const AdminCategories = lazy(() => import('@/pages/admin/categories'));
const AdminCustomers = lazy(() => import('@/pages/admin/customers'));
const AdminQuotations = lazy(() => import('@/pages/admin/quotations'));
const AdminHeroSlides = lazy(() => import('@/pages/admin/hero-slides'));
const AdminTestimonials = lazy(() => import('@/pages/admin/testimonials'));
const AdminPartners = lazy(() => import('@/pages/admin/partners'));
const AdminSettings = lazy(() => import('@/pages/admin/settings'));
const AdminSiteSettings = lazy(() => import('@/pages/admin/site-settings'));
const AdminTheme = lazy(() => import('@/pages/admin/theme'));
const AdminHomepageBuilder = lazy(() => import('@/pages/admin/homepage-builder'));
const AdminDeliveryZones = lazy(() => import('@/pages/admin/delivery-zones'));
const AdminProjects = lazy(() => import('@/pages/admin/projects'));
const AdminPromotions = lazy(() => import('@/pages/admin/promotions'));
const AdminInventory = lazy(() => import('@/pages/admin/inventory'));
const AdminMediaLibrary = lazy(() => import('@/pages/admin/media-library'));
const AdminReports = lazy(() => import('@/pages/admin/reports'));
const AdminSeo = lazy(() => import('@/pages/admin/seo'));
const AdminCoupons = lazy(() => import('@/pages/admin/coupons'));
const AdminCRM = lazy(() => import('@/pages/admin/crm'));
const AdminServices = lazy(() => import('@/pages/admin/services'));
const AdminInvoices = lazy(() => import('@/pages/admin/invoices'));
const AdminSuppliers = lazy(() => import('@/pages/admin/suppliers'));
const AdminProductBrands = lazy(() => import('@/pages/admin/product-brands'));
const AdminProductImages = lazy(() => import('@/pages/admin/product-images'));
const AdminProductSpecs = lazy(() => import('@/pages/admin/product-specifications'));
const AdminProductVariants = lazy(() => import('@/pages/admin/product-variants'));
const AdminProductDocs = lazy(() => import('@/pages/admin/product-documents'));
const AdminNavigation = lazy(() => import('@/pages/admin/navigation'));
const AdminBackups = lazy(() => import('@/pages/admin/backups'));
const AdminAuditLogs = lazy(() => import('@/pages/admin/audit-logs'));
const AdminLeads = lazy(() => import('@/pages/admin/leads'));

function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" role="status" aria-label="Loading">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    </div>
  );
}

function PublicLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Admin login (public route)
  if (location === '/admin/login') {
    return (
      <AdminPublicRoute>
        <Suspense fallback={<AdminLoading />}>
          <AdminLogin />
        </Suspense>
      </AdminPublicRoute>
    );
  }

  // Admin routes (protected)
  if (location === '/admin' || location === '/admin/') {
    return (
      <AdminAuthGuard>
        <Suspense fallback={<AdminLoading />}>
          <DashboardPage />
        </Suspense>
      </AdminAuthGuard>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminRoutes: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
    '/admin/orders': AdminOrders,
    '/admin/crm': AdminCRM,
    '/admin/services': AdminServices,
    '/admin/invoices': AdminInvoices,
    '/admin/suppliers': AdminSuppliers,
    '/admin/products': AdminProducts,
    '/admin/categories': AdminCategories,
    '/admin/customers': AdminCustomers,
    '/admin/quotations': AdminQuotations,
    '/admin/hero-slides': AdminHeroSlides,
    '/admin/testimonials': AdminTestimonials,
    '/admin/partners': AdminPartners,
    '/admin/settings': AdminSettings,
    '/admin/site-settings': AdminSiteSettings,
    '/admin/theme': AdminTheme,
    '/admin/homepage': AdminHomepageBuilder,
    '/admin/delivery-zones': AdminDeliveryZones,
    '/admin/projects': AdminProjects,
    '/admin/promotions': AdminPromotions,
    '/admin/inventory': AdminInventory,
    '/admin/media-library': AdminMediaLibrary,
    '/admin/reports': AdminReports,
    '/admin/seo': AdminSeo,
    '/admin/coupons': AdminCoupons,
    '/admin/product-brands': AdminProductBrands,
    '/admin/product-images': AdminProductImages,
    '/admin/product-specifications': AdminProductSpecs,
    '/admin/product-variants': AdminProductVariants,
    '/admin/product-documents': AdminProductDocs,
    '/admin/navigation': AdminNavigation,
    '/admin/backups': AdminBackups,
    '/admin/audit-logs': AdminAuditLogs,
    '/admin/leads': AdminLeads,
  };

  const AdminComponent = adminRoutes[location as keyof typeof adminRoutes];
  if (AdminComponent) {
    return (
      <AdminAuthGuard>
        <Suspense fallback={<AdminLoading />}>
          <AdminComponent />
        </Suspense>
      </AdminAuthGuard>
    );
  }

  // Catch any /admin/* that doesn't match
  if (location.startsWith('/admin')) {
    return <NotFound />;
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

  if (location === '/compare') {
    return (
      <Suspense fallback={<PublicLoading />}>
        <Compare />
      </Suspense>
    );
  }

  if (location === '/track-order') {
    return (
      <Suspense fallback={<PublicLoading />}>
        <TrackOrder />
      </Suspense>
    );
  }

  if (location === '/checkout-success') {
    return (
      <Suspense fallback={<PublicLoading />}>
        <CheckoutSuccess />
      </Suspense>
    );
  }

  if (location === '/industries') {
    return (
      <Suspense fallback={<PublicLoading />}>
        <Industries />
      </Suspense>
    );
  }

  if (location === '/market') {
    return (
      <Suspense fallback={<PublicLoading />}>
        <Market />
      </Suspense>
    );
  }

  if (location === '/about') {
    return (
      <Suspense fallback={<PublicLoading />}>
        <About />
      </Suspense>
    );
  }

  if (location === '/faq') {
    return (
      <Suspense fallback={<PublicLoading />}>
        <FAQ />
      </Suspense>
    );
  }

  if (location.startsWith('/service/')) {
    return (
      <Suspense fallback={<PublicLoading />}>
        <ServiceDetail />
      </Suspense>
    );
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
      <ErrorBoundary>
        <ThemeApplier />
        <Router />
        <ToastContainer />
      </ErrorBoundary>
    </CartProvider>
  );
}

export default App;
