import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useProduct, useProducts } from '@/hooks/use-data';
import { useCart } from '@/hooks/use-cart';
import { formatKES } from '@/lib/utils';
import { getProductPlaceholder, withFallback } from '@/lib/placeholders';
import { useSeoMeta } from '@/hooks/use-seo';

const RECENTLY_VIEWED_KEY = 'topline_recently_viewed';
const MAX_RECENTLY_VIEWED = 6;

function trackRecentlyViewed(slug: string) {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const slugs: string[] = raw ? JSON.parse(raw) : [];
    const filtered = slugs.filter((v) => v !== slug);
    const updated = [slug, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function getRecentlyViewedSlugs(): string[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ShopDetail() {
  const [location] = useLocation();
  const slug = location.replace('/product/', '');
  const [qty, setQty] = useState(1);
  const { product, loading } = useProduct(slug);
  useSeoMeta('product', slug, product ? {
    title: `${product.name} | Topline Flooring & Waterproofing`,
    description: product.description || undefined,
    image: product.image_url || undefined,
  } : undefined);
  const { addItem } = useCart();
  const [, setRecentProducts] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!product) return;
    trackRecentlyViewed(product.slug);
  }, [product?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const slugs = getRecentlyViewedSlugs().filter((s) => s !== slug);
    if (slugs.length === 0) {
      setRecentProducts([]);
      return;
    }
  }, [slug]);

  const { products: relatedProductsRaw } = useProducts(
    product?.category_id ? { categoryId: product.category_id } : undefined
  );
  const relatedProducts = (relatedProductsRaw || [])
    .filter((rp) => rp.slug !== product?.slug)
    .slice(0, 4);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-10" />
          <div className="grid md:grid-cols-2 gap-16">
            <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
            <div className="space-y-5">
              <div className="h-9 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-1/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-11 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!product) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
          <h2 className="font-display text-2xl font-semibold mb-5">Product not found</h2>
          <Link href="/shop" className="btn-primary">Back to Shop</Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Link>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
              <img
                src={withFallback(product.image_url, getProductPlaceholder(product.category?.slug || product.category?.name))}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="py-2">
              {product.category && (
                <p className="text-xs text-primary-600 uppercase tracking-wider font-medium mb-4">
                  {product.category.name}
                </p>
              )}
              <h1 className="font-display text-3xl lg:text-4xl font-bold text-navy-900 mb-6">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3 mb-8">
                <span className="font-display text-3xl font-bold text-navy-900">
                  {formatKES(product.price)}
                </span>
                {product.unit && (
                  <span className="text-gray-500 text-sm">/ {product.unit}</span>
                )}
                {!product.in_stock && (
                  <span className="text-xs uppercase tracking-wider text-gray-500 border border-gray-300 px-2 py-0.5 rounded">
                    Out of Stock
                  </span>
                )}
              </div>

              <div className="h-px bg-gray-200 mb-8" />

              {product.description && (
                <p className="text-gray-600 leading-relaxed mb-10">
                  {product.description}
                </p>
              )}

              {product.in_stock && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">Quantity</span>
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        className="px-3 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-5 py-2 text-sm font-semibold min-w-[3rem] text-center">
                        {qty}
                      </span>
                      <button
                        className="px-3 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setQty((q) => q + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      for (let i = 0; i < qty; i++) addItem(product);
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              )}

              {product.category_id && relatedProducts.length > 0 && (
                <div className="mt-10">
                  <h3 className="font-display text-xl font-bold text-navy-900 mb-6">
                    Related Products
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {relatedProducts.map((rp) => (
                      <Link
                        key={rp.id}
                        href={`/product/${rp.slug}`}
                        className="group bg-white border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden flex flex-col"
                      >
                        <div className="h-32 bg-gray-100 overflow-hidden">
                          <img
                            src={withFallback(rp.image_url, getProductPlaceholder(rp.category?.slug || rp.category?.name))}
                            alt={rp.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-3 flex flex-col flex-1">
                          {rp.category && (
                            <p className="text-xs text-primary-600 uppercase tracking-wide font-medium mb-1">
                              {rp.category.name}
                            </p>
                          )}
                          <h4 className="font-semibold text-navy-900 text-sm leading-tight mb-2">
                            {rp.name}
                          </h4>
                          <div className="pt-3 border-t border-gray-100 mt-auto">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-navy-900 text-sm">
                                {formatKES(rp.price)}
                              </span>
                              {rp.unit && (
                                <span className="text-xs text-gray-500">/ {rp.unit}</span>
                              )}
                            </div>
                            <button
                              className="w-full text-xs bg-primary-500 hover:bg-primary-600 text-white py-1.5 rounded transition-colors"
                              disabled={!rp.in_stock}
                              onClick={(e) => {
                                e.preventDefault();
                                addItem(rp);
                              }}
                            >
                              {rp.in_stock ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-10 p-5 bg-gray-50 rounded-xl border-l-2 border-primary-400">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                  Please Note
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  After placing your order, our team will contact you to discuss project
                  specifics, conduct a site assessment, and finalise scheduling. Pricing
                  shown is the base rate and may vary based on project scope and complexity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
