import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { InitializationScreen } from "@/components/InitializationScreen";
import { isConfigured } from "@/lib/supabase";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ShopDetail from "@/pages/shop-detail";
import Cart from "@/pages/cart";
import OrderConfirmation from "@/pages/order-confirmation";
import CheckoutSuccess from "@/pages/checkout-success";
import Contact from "@/pages/contact";
import Quotation from "@/pages/quotation";
import Services from "@/pages/services";
import Portfolio from "@/pages/portfolio";
import About from "@/pages/about";
import Industries from "@/pages/industries";
import FAQ from "@/pages/faq";
import TrackOrder from "@/pages/track-order";
import AdminLogin from "@/pages/admin/login";
import Dashboard from "@/pages/admin/dashboard";
import AdminOrders from "@/pages/admin/orders";
import AdminProducts from "@/pages/admin/products";
import AdminCategories from "@/pages/admin/categories";
import AdminCustomers from "@/pages/admin/customers";
import AdminHeroSlides from "@/pages/admin/hero-slides";
import AdminTestimonials from "@/pages/admin/testimonials";
import AdminPartners from "@/pages/admin/partners";
import AdminQuotations from "@/pages/admin/quotations";
import AdminSettings from "@/pages/admin/settings";
import AdminCoupons from "@/pages/admin/coupons";
import AdminDeliveryZones from "@/pages/admin/delivery-zones";
import AdminHomepageBuilder from "@/pages/admin/homepage-builder";
import AdminInventory from "@/pages/admin/inventory";
import AdminMediaLibrary from "@/pages/admin/media-library";
import AdminProjects from "@/pages/admin/projects";
import AdminPromotions from "@/pages/admin/promotions";
import AdminReports from "@/pages/admin/reports";
import AdminSeo from "@/pages/admin/seo";
import AdminSiteSettings from "@/pages/admin/site-settings";
import AdminTheme from "@/pages/admin/theme";
import AdminNavigation from "@/pages/admin/navigation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/shop/:id" component={ShopDetail} />
      <Route path="/services" component={Services} />
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
      <Route path="/admin">
        {() => (
          <AdminAuthGuard>
            <Dashboard />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/orders">
        {() => (
          <AdminAuthGuard>
            <AdminOrders />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/products">
        {() => (
          <AdminAuthGuard>
            <AdminProducts />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/categories">
        {() => (
          <AdminAuthGuard>
            <AdminCategories />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/customers">
        {() => (
          <AdminAuthGuard>
            <AdminCustomers />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/hero-slides">
        {() => (
          <AdminAuthGuard>
            <AdminHeroSlides />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/testimonials">
        {() => (
          <AdminAuthGuard>
            <AdminTestimonials />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/partners">
        {() => (
          <AdminAuthGuard>
            <AdminPartners />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/quotations">
        {() => (
          <AdminAuthGuard>
            <AdminQuotations />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/coupons">
        {() => (
          <AdminAuthGuard>
            <AdminCoupons />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/delivery-zones">
        {() => (
          <AdminAuthGuard>
            <AdminDeliveryZones />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/homepage-builder">
        {() => (
          <AdminAuthGuard>
            <AdminHomepageBuilder />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/inventory">
        {() => (
          <AdminAuthGuard>
            <AdminInventory />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/media-library">
        {() => (
          <AdminAuthGuard>
            <AdminMediaLibrary />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/projects">
        {() => (
          <AdminAuthGuard>
            <AdminProjects />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/promotions">
        {() => (
          <AdminAuthGuard>
            <AdminPromotions />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/reports">
        {() => (
          <AdminAuthGuard>
            <AdminReports />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/seo">
        {() => (
          <AdminAuthGuard>
            <AdminSeo />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/site-settings">
        {() => (
          <AdminAuthGuard>
            <AdminSiteSettings />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/theme">
        {() => (
          <AdminAuthGuard>
            <AdminTheme />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/navigation">
        {() => (
          <AdminAuthGuard>
            <AdminNavigation />
          </AdminAuthGuard>
        )}
      </Route>
      <Route path="/admin/settings">
        {() => (
          <AdminAuthGuard>
            <AdminSettings />
          </AdminAuthGuard>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
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
