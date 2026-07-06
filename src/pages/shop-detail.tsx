import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useGetProduct, useListProducts } from "@/lib/api";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/utils";
import { ShieldCheck, ArrowLeft, Plus, Minus, Clock, Package } from "lucide-react";

const RECENTLY_VIEWED_KEY = "topline_recently_viewed";
const MAX_RECENTLY_VIEWED = 6;

function trackRecentlyViewed(id: number) {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const ids: number[] = raw ? JSON.parse(raw) : [];
    const filtered = ids.filter((v) => v !== id);
    const updated = [id, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch {}
}

function getRecentlyViewedIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ShopDetail() {
  const [, params] = useRoute("/shop/:id");
  const id = params?.id ? Number(params.id) : 0;
  const [qty, setQty] = useState(1);
  const { data: product, isLoading } = useGetProduct(id);
  const { addToCart } = useCart();
  const [recentProducts, setRecentProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!product) return;
    const pid = Number(product.id);
    trackRecentlyViewed(pid);
    const ids = getRecentlyViewedIds().filter((v) => v !== pid);
    if (ids.length === 0) {
      setRecentProducts([]);
      return;
    }
    const slice = ids.slice(0, 4);
    supabase
      .from("products")
      .select("*, categories!left(name)")
      .in("id", slice)
      .then(({ data }) => {
        if (!data) { setRecentProducts([]); return; }
        const mapped = data.map((p: any) => ({
          ...p,
          category_name: p.categories?.name || null,
        }));
        const sorted = slice
          .map((sid) => mapped.find((p: any) => Number(p.id) === sid))
          .filter(Boolean);
        setRecentProducts(sorted);
      })
      .catch(() => setRecentProducts([]));
  }, [product?.id]);

  const { data: related, isLoading: relatedLoading } = useListProducts(
    product?.category_id ? { categoryId: Number(product.category_id) } : undefined
  );
  const relatedProducts = (related || [])
    .filter((rp) => Number(rp.id) !== Number(product?.id))
    .slice(0, 4);

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
      <Breadcrumbs items={[{ label: "Shop", href: "/shop" }, { label: product?.name || "Product Detail" }]} />
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

            {product.category_id && (
              <>
                {relatedLoading ? (
                  <div className="mt-10">
                    <h3 className="font-display text-xl font-semibold mb-6">Related Products</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-sm" />)}
                    </div>
                  </div>
                ) : relatedProducts.length > 0 ? (
                  <div className="mt-10">
                    <h3 className="font-display text-xl font-semibold mb-6">Related Products</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {relatedProducts.map((rp) => (
                        <div key={rp.id} className="group bg-card border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 rounded-sm overflow-hidden flex flex-col">
                          <div className="h-32 bg-muted overflow-hidden">
                            {rp.image_url ? (
                              <img src={rp.image_url} alt={rp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShieldCheck className="h-8 w-8 text-primary/20" />
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex flex-col flex-1">
                            {rp.category_name && (
                              <p className="text-[10px] text-primary uppercase tracking-[0.15em] font-sans font-medium mb-1">{rp.category_name}</p>
                            )}
                            <h3 className="font-display text-sm font-semibold leading-tight mb-2">{rp.name}</h3>
                            <div className="pt-3 border-t border-border mt-auto">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-display font-semibold text-foreground text-sm">{formatKES(rp.price)}</span>
                                {rp.unit && <span className="text-[10px] text-muted-foreground font-sans">/ {rp.unit}</span>}
                              </div>
                              <Button
                                size="sm"
                                className="w-full text-[11px] rounded-sm h-8 font-sans"
                                disabled={!rp.in_stock}
                                onClick={() => addToCart({ id: rp.id, name: rp.name, price: rp.price, unit: rp.unit ?? null, imageUrl: rp.image_url ?? null }, 1)}
                              >
                                {rp.in_stock ? "Add to Cart" : "Out of Stock"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-10 p-5 bg-muted/60 rounded-sm border border-dashed border-primary/30 text-center">
                    <Package className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-sans">No related products found.</p>
                  </div>
                )}
              </>
            )}

            <div className="mt-10 p-5 bg-muted/60 rounded-sm border-l-2 border-primary/40">
              <p className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-2">Please Note</p>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                After placing your order, our team will contact you to discuss project specifics, conduct a site assessment, and finalise scheduling. Pricing shown is the base rate and may vary based on project scope and complexity.
              </p>
            </div>
          </div>
        </div>

        {recentProducts.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <h2 className="font-display text-2xl font-semibold mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Recently Viewed
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {recentProducts.map((p) => (
                <Link key={p.id} href={`/shop/${p.id}`} className="group block bg-card border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 rounded-sm overflow-hidden">
                  <div className="h-36 bg-muted overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShieldCheck className="h-8 w-8 text-primary/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-display text-sm font-semibold truncate">{p.name}</h3>
                    <p className="font-display text-sm font-semibold mt-1 text-primary">{formatKES(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </CustomerLayout>
  );
}
