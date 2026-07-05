import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ShopDetail from "@/pages/shop-detail";
import Cart from "@/pages/cart";
import OrderConfirmation from "@/pages/order-confirmation";
import CheckoutSuccess from "@/pages/checkout-success";
import Contact from "@/pages/contact";
import Quotation from "@/pages/quotation";
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
      <Route path="/cart" component={Cart} />
      <Route path="/order-confirmation/:id" component={OrderConfirmation} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/contact" component={Contact} />
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
