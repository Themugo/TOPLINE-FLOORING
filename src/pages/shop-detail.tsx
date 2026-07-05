import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetProduct } from "@/lib/api";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/utils";
import { ShieldCheck, ArrowLeft, Plus, Minus } from "lucide-react";

export default function ShopDetail() {
  const [, params] = useRoute("/shop/:id");
  const id = params?.id ? Number(params.id) : 0;
  const [qty, setQty] = useState(1);
  const { data: product, isLoading } = useGetProduct(id);
  const { addToCart } = useCart();

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="container mx-auto px-6 md:px-12 py-14">
          <Skeleton className="h-5 w-28 mb-10 rounded-sm" />
          <div className="grid md:grid-cols-2 gap-16">
            <Skeleton className="h-96 rounded-sm" />
            <div className="space-y-5">
              <Skeleton className="h-9 w-3/4 rounded-sm" />
              <Skeleton className="h-5 w-1/3 rounded-sm" />
              <Skeleton className="h-24 w-full rounded-sm" />
              <Skeleton className="h-11 w-48 rounded-sm" />
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!product) {
    return (
      <CustomerLayout>
        <div className="container mx-auto px-6 md:px-12 py-28 text-center">
          <h2 className="font-display text-2xl font-semibold mb-5">Service not found</h2>
          <Link href="/shop"><Button className="rounded-sm font-sans">Back to Shop</Button></Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="container mx-auto px-6 md:px-12 py-14">
        <Link href="/shop" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-12 transition-colors font-sans uppercase tracking-widest">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Services
        </Link>

        <div className="grid md:grid-cols-2 gap-16 lg:gap-24">
          <div className="h-80 md:h-full min-h-[22rem] bg-muted rounded-sm flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 border border-primary/20 bg-primary/8 flex items-center justify-center rounded-sm">
                  <ShieldCheck className="h-10 w-10 text-primary/30" />
                </div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest">No image available</p>
              </div>
            )}
          </div>

          <div className="py-2">
            {product.category_name && (
              <p className="text-[11px] text-primary uppercase tracking-[0.2em] font-sans font-medium mb-4">{product.category_name}</p>
            )}
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-tight">{product.name}</h1>

            <div className="flex items-baseline gap-3 mb-8">
              <span className="font-display text-3xl font-semibold text-foreground">{formatKES(product.price)}</span>
              {product.unit && <span className="text-muted-foreground font-sans text-sm">/ {product.unit}</span>}
              {!product.in_stock && (
                <span className="text-[10px] uppercase tracking-widest font-sans text-muted-foreground border border-border px-2 py-0.5 rounded-sm">Out of Stock</span>
              )}
            </div>

            <div className="h-px bg-border mb-8" />

            {product.description && (
              <p className="text-muted-foreground leading-relaxed mb-10 font-light">{product.description}</p>
            )}

            {product.in_stock && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-sans uppercase tracking-widest text-muted-foreground">Quantity</span>
                  <div className="flex items-center border border-border rounded-sm">
                    <button
                      className="px-3 py-2 hover:bg-muted transition-colors"
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-5 py-2 text-sm font-display font-semibold min-w-[3rem] text-center">{qty}</span>
                    <button
                      className="px-3 py-2 hover:bg-muted transition-colors"
                      onClick={() => setQty(q => q + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="px-12 rounded-sm font-sans uppercase tracking-widest text-xs h-12"
                  onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, unit: product.unit ?? null, imageUrl: product.image_url ?? null }, qty)}
                >
                  Add to Cart
                </Button>
              </div>
            )}

            <div className="mt-10 p-5 bg-muted/60 rounded-sm border-l-2 border-primary/40">
              <p className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-2">Please Note</p>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                After placing your order, our team will contact you to discuss project specifics, conduct a site assessment, and finalise scheduling. Pricing shown is the base rate and may vary based on project scope and complexity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
