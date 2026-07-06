import { useRoute, Link } from "wouter";
import { useGetOrder } from "@/lib/api";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES, formatDate } from "@/lib/utils";
import { CheckCircle2, Phone, MessageCircle } from "lucide-react";

export default function OrderConfirmation() {
  const [, params] = useRoute("/order-confirmation/:id");
  const id = params?.id ? Number(params.id) : 0;
  const { data: order, isLoading } = useGetOrder(id);

  if (isLoading) {
    return (
      <CustomerLayout>
        <Breadcrumbs items={[{ label: "Order Confirmation" }]} />
        <div className="container mx-auto px-6 md:px-12 py-24 max-w-2xl">
          <Skeleton className="h-12 w-12 mx-auto mb-6 rounded-sm" />
          <Skeleton className="h-8 w-64 mx-auto mb-4 rounded-sm" />
          <Skeleton className="h-4 w-full mb-2 rounded-sm" />
          <Skeleton className="h-4 w-3/4 mx-auto rounded-sm" />
        </div>
      </CustomerLayout>
    );
  }

  if (!order) {
    return (
      <CustomerLayout>
        <Breadcrumbs items={[{ label: "Order Confirmation" }]} />
        <div className="container mx-auto px-6 md:px-12 py-24 text-center">
          <h2 className="font-display text-2xl font-semibold mb-5">Order not found</h2>
          <Link href="/"><Button className="rounded-sm font-sans">Go Home</Button></Link>
        </div>
      </CustomerLayout>
    );
  }

  const whatsappMessage = encodeURIComponent(`Hi Topline, I just placed order #${String(order.id).padStart(5, "0")} for ${formatKES(order.total_amount)}. Could you confirm when we can schedule the work?`);

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Order Confirmation" }]} />
      <div className="container mx-auto px-6 md:px-12 py-16 max-w-2xl">
        <div className="text-center mb-12">
          <div className="h-16 w-16 border-2 border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-6 rounded-sm">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="h-px w-8 bg-primary/40" />
            <span className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium">Order Confirmed</span>
            <div className="h-px w-8 bg-primary/40" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-foreground mb-3">Thank You, {order.customer_name.split(" ")[0]}!</h1>
          <p className="text-muted-foreground font-light">
            Your order has been received. Our team will contact you shortly to schedule your project.
          </p>
        </div>

        <div className="bg-card border border-border rounded-sm overflow-hidden mb-6">
          <div className="bg-secondary text-secondary-foreground px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/50 font-sans mb-0.5">Order Reference</p>
              <p className="font-display text-xl font-semibold">#{String(order.id).padStart(5, "0")}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/50 font-sans mb-0.5">Placed On</p>
              <p className="text-sm font-sans font-light">{formatDate(order.created_at)}</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {'items' in order && order.items && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans mb-3">Order Items</p>
                <div className="space-y-2">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-light">{item.product_name} <span className="text-muted-foreground/60">x{item.quantity}</span></span>
                      <span className="font-display font-semibold">{formatKES(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-border" />

            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Total Amount</span>
              <span className="font-display text-2xl font-semibold text-primary">{formatKES(order.total_amount)}</span>
            </div>

            {order.notes && (
              <>
                <div className="h-px bg-border" />
                <div className="text-sm font-light">
                  <p><span className="text-muted-foreground">Notes: </span><span className="text-foreground">{order.notes}</span></p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-l-2 border-primary/40 bg-primary/5 rounded-sm rounded-l-none px-6 py-5 mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-2">What Happens Next</p>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Our team will call you at <span className="font-semibold text-foreground">{order.customer_phone}</span> within 24 hours to confirm details, conduct a site assessment, and schedule your project.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Phone className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-sans font-medium">0720 859 737 / 0755 293 372</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={`https://wa.me/254720859737?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button className="w-full rounded-sm font-sans uppercase tracking-widest text-xs h-11 bg-[#25D366] hover:bg-[#22c55e] text-white">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Us
            </Button>
          </a>
          <Link href="/shop" className="flex-1">
            <Button variant="outline" className="w-full rounded-sm font-sans uppercase tracking-widest text-xs h-11">
              Continue Shopping
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full rounded-sm font-sans uppercase tracking-widest text-xs h-11">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}
