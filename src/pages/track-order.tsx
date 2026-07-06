import { useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, Phone, Mail, MessageCircle } from "lucide-react";
import { Link } from "wouter";

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
          {!submitted ? (
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
                    required
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
                    required
                  />
                </div>
                <Button type="submit" className="w-full rounded-sm h-10">
                  <Search className="mr-2 h-4 w-4" /> Track Order
                </Button>
              </div>
            </form>
          ) : (
            <div className="bg-muted/30 border border-border rounded-sm p-8 text-center">
              <Package className="h-16 w-16 text-primary/40 mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">Order Status</h2>
              <p className="text-muted-foreground text-sm font-light mb-4">
                We are currently processing your request. For real-time updates, please contact us directly.
              </p>
              <div className="flex flex-col gap-3 items-center">
                <a href="tel:0720859737" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Phone className="h-4 w-4" /> 0720 859 737
                </a>
                <a href="mailto:toplineflooringandwaterproofin@gmail.com" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="h-4 w-4" /> Send Email
                </a>
                <a href="https://wa.me/254720859737" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <Button variant="outline" className="mt-3 rounded-sm" onClick={() => setSubmitted(false)}>
                  Try Again
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
