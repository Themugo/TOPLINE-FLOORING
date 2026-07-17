import { useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, Phone, Mail, MessageCircle, CheckCircle2, Clock, Truck, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useSiteSettings } from "@/hooks/use-data";
import { supabase } from "@/lib/supabase";
import { telHref } from "@/lib/utils";

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-5 w-5 text-yellow-500" />,
  processing: <Package className="h-5 w-5 text-blue-500" />,
  shipped: <Truck className="h-5 w-5 text-purple-500" />,
  delivered: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  cancelled: <XCircle className="h-5 w-5 text-red-500" />,
};

interface OrderResult {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  delivery_address: string | null;
  created_at: string;
  items?: { product_name: string; quantity: number; unit_price: number }[];
}

export default function TrackOrder() {
  const { settings } = useSiteSettings();
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let query = supabase
        .from("orders")
        .select("id, order_number, status, payment_status, total_amount, delivery_address, created_at");

      if (orderId.trim()) {
        query = query.ilike("order_number", orderId.trim());
      } else if (phone.trim()) {
        query = query.eq("customer_phone", phone.trim());
      } else {
        setError("Please enter an order number or phone number.");
        setLoading(false);
        return;
      }

      const { data, error: err } = await query.limit(5);
      if (err) throw err;

      if (!data || data.length === 0) {
        setError("No orders found matching your details. Please check and try again.");
      } else if (data.length === 1) {
        const order = data[0];
        const { data: items } = await supabase
          .from("order_items")
          .select("product_name, quantity, unit_price")
          .eq("order_id", order.id);
        setResult({ ...order, items: items || [] });
      } else {
        setResult(data[0]);
      }
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Track Order" }]} />

      <section className="bg-secondary text-secondary-foreground py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <p className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium mb-3">Tracking</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Track Your Order</h1>
          <p className="text-secondary-foreground/60 text-sm md:text-base max-w-2xl mx-auto font-light">
            Enter your order details to check the status
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12 max-w-lg">
          {!result ? (
            <form onSubmit={handleTrack} className="bg-muted/30 border border-border rounded-sm p-8">
              <div className="space-y-5">
                <div>
                  <Label htmlFor="orderId" className="text-xs uppercase tracking-widest font-sans">Order Number</Label>
                  <Input
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. ORD-001"
                    className="mt-1.5 rounded-sm h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs uppercase tracking-widest font-sans">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0720 000 000"
                    className="mt-1.5 rounded-sm h-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter either your order number or phone number used at checkout.</p>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full rounded-sm h-10" disabled={loading}>
                  <Search className="mr-2 h-4 w-4" /> {loading ? "Searching..." : "Track Order"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="bg-muted/30 border border-border rounded-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                {statusIcons[result.status] || <Package className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Order {result.order_number || result.id.slice(0, 8)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Placed on {new Date(result.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{result.status.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-medium capitalize">{result.payment_status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">KES {result.total_amount.toLocaleString()}</span>
                </div>
                {result.delivery_address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium text-right max-w-[60%]">{result.delivery_address}</span>
                  </div>
                )}
              </div>

              {result.items && result.items.length > 0 && (
                <div className="border-t pt-4 mb-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Items</p>
                  {result.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span>KES {(item.unit_price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 items-center border-t pt-6">
                <p className="text-xs text-muted-foreground">Need help? Contact us:</p>
                <a href={telHref(settings?.phone || '+254 720 859 737')} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Phone className="h-4 w-4" /> {settings?.phone || '0720 859 737'}
                </a>
                <a href={`mailto:${settings?.email || 'info@toplineflooring.co.ke'}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="h-4 w-4" /> Send Email
                </a>
                <a href={settings?.social_links?.whatsapp || 'https://wa.me/254720859737'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <Button variant="outline" className="mt-3 rounded-sm" onClick={() => { setResult(null); setError(null); }}>
                  Track Another Order
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>If you need immediate assistance, please contact our support team.</p>
            <Link href="/quotation" className="text-primary hover:underline mt-1 inline-block">Request a Quotation</Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
