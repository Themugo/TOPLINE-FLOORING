import { useEffect } from "react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle, Phone } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export default function CheckoutSuccess() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const whatsappMessage = encodeURIComponent(
    `Hi Topline, I just completed checkout. Could you confirm and schedule the project?`,
  );

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Order Complete" }]} />
      <div className="container mx-auto px-6 md:px-12 py-16 max-w-2xl">
        <div className="text-center mb-12">
          <div className="h-16 w-16 border-2 border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-6 rounded-sm">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="h-px w-8 bg-primary/40" />
            <span className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium">Success</span>
            <div className="h-px w-8 bg-primary/40" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-foreground mb-3">Thank You!</h1>
          <p className="text-muted-foreground font-light">
            Your request has been received. Our team will be in touch to schedule your project.
          </p>
        </div>

        <div className="border-l-2 border-primary/40 bg-primary/5 rounded-sm rounded-l-none px-6 py-5 mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-2">What Happens Next</p>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Our team will call you within 24 hours to confirm details, conduct a site assessment, and schedule your project.
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
