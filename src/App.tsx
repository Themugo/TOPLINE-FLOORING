import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { InitializationScreen } from "@/components/InitializationScreen";
import { isConfigured } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

const Shop = lazy(() => import("@/pages/shop"));
const ShopDetail = lazy(() => import("@/pages/shop-detail"));
const Cart = lazy(() => import("@/pages/cart"));
const OrderConfirmation = lazy(() => import("@/pages/order-confirmation"));
const CheckoutSuccess = lazy(() => import("@/pages/checkout-success"));
const Contact = lazy(() => import("@/pages/contact"));
const Quotation = lazy(() => import("@/pages/quotation"));
const Services = lazy(() => import("@/pages/services"));
const ServiceDetail = lazy(() => import("@/pages/service-detail"));
const Portfolio = lazy(() => import("@/pages/portfolio"));
const About = lazy(() => import("@/pages/about"));
const Industries = lazy(() => import("@/pages/industries"));
const FAQ = lazy(() => import("@/pages/faq"));
const TrackOrder = lazy(() => import("@/pages/track-order"));
const Market = lazy(() => import("@/pages/market"));
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const Dashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminOrders = lazy(() => import("@/pages/admin/orders"));
const AdminProducts = lazy(() => import("@/pages/admin/products"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminCustomers = lazy(() => import("@/pages/admin/customers"));
const AdminHeroSlides = lazy(() => import("@/pages/admin/hero-slides"));
const AdminTestimonials = lazy(() => import("@/pages/admin/testimonials"));
const AdminPartners = lazy(() => import("@/pages/admin/partners"));
const AdminQuotations = lazy(() => import("@/pages/admin/quotations"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminCoupons = lazy(() => import("@/pages/admin/coupons"));
const AdminDeliveryZones = lazy(() => import("@/pages/admin/delivery-zones"));
const AdminHomepageBuilder = lazy(() => import("@/pages/admin/homepage-builder"));
const AdminInventory = lazy(() => import("@/pages/admin/inventory"));
const AdminMediaLibrary = lazy(() => import("@/pages/admin/media-library"));
const AdminProjects = lazy(() => import("@/pages/admin/projects"));
const AdminPromotions = lazy(() => import("@/pages/admin/promotions"));
const AdminReports = lazy(() => import("@/pages/admin/reports"));
const AdminSeo = lazy(() => import("@/pages/admin/seo"));
const AdminSiteSettings = lazy(() => import("@/pages/admin/site-settings"));
const AdminTheme = lazy(() => import("@/pages/admin/theme"));
const AdminNavigation = lazy(() => import("@/pages/admin/navigation"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/audit-logs"));
const AdminBackups = lazy(() => import("@/pages/admin/backups"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const adminRouteConfigs = [
  { path: "/admin", Component: Dashboard },
  { path: "/admin/orders", Component: AdminOrders },
  { path: "/admin/products", Component: AdminProducts },
  { path: "/admin/categories", Component: AdminCategories },
  { path: "/admin/customers", Component: AdminCustomers },
  { path: "/admin/hero-slides", Component: AdminHeroSlides },
  { path: "/admin/testimonials", Component: AdminTestimonials },
  { path: "/admin/partners", Component: AdminPartners },
  { path: "/admin/quotations", Component: AdminQuotations },
  { path: "/admin/coupons", Component: AdminCoupons },
  { path: "/admin/delivery-zones", Component: AdminDeliveryZones },
  { path: "/admin/homepage-builder", Component: AdminHomepageBuilder },
  { path: "/admin/inventory", Component: AdminInventory },
  { path: "/admin/media-library", Component: AdminMediaLibrary },
  { path: "/admin/projects", Component: AdminProjects },
  { path: "/admin/promotions", Component: AdminPromotions },
  { path: "/admin/reports", Component: AdminReports },
  { path: "/admin/seo", Component: AdminSeo },
  { path: "/admin/site-settings", Component: AdminSiteSettings },
  { path: "/admin/theme", Component: AdminTheme },
  { path: "/admin/navigation", Component: AdminNavigation },
  { path: "/admin/settings", Component: AdminSettings },
  { path: "/admin/audit-logs", Component: AdminAuditLogs },
  { path: "/admin/backups", Component: AdminBackups },
  { path: "/admin/gallery", Component: AdminProjects },
];

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/shop/:id" component={ShopDetail} />
        <Route path="/market" component={Market} />
        <Route path="/services" component={Services} />
        <Route path="/services/:slug" component={ServiceDetail} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/cart" component={Cart} />
        <Route path="/order-confirmation/:id" component={OrderConfirmation} />
        <Route path="/checkout/success" component={CheckoutSuccess} />
        <Route path="/contact" component={Contact} />
        <Route path="/about" component={About} />
        <Route path="/industries" component={Industries} />
        <Route path="/faq" component={FAQ} />
        <Route path="/track-order" component={TrackOrder} />
        <Route path="/quotation" component={Quotation} />
        <Route path="/admin/login" component={AdminLogin} />
        {adminRouteConfigs.map(({ path, Component }) => (
          <Route key={path} path={path}>
            {() => (
              <AdminAuthGuard>
                <Component />
              </AdminAuthGuard>
            )}
          </Route>
        ))}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  if (!isConfigured) {
    return <InitializationScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
