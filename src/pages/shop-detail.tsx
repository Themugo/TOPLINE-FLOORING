import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { Plus, Minus, ShoppingCart, Check, ShieldCheck, Truck, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useProduct, useProducts } from '@/hooks/use-data';
import { useCart } from '@/hooks/use-cart';
import { formatKES } from '@/lib/utils';
import { getProductPlaceholder, withFallback } from '@/lib/placeholders';
import { useSeoMeta } from '@/hooks/use-seo';
import { useImagePreloader } from '@/hooks/use-image-preloader';

const RECENTLY_VIEWED_KEY = 'recently_viewed_products';
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

export default function ShopDetail() {
  const [location] = useLocation();
  const slug = location.replace('/product/', '');
  const [qty, setQty] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const { product, loading } = useProduct(slug);

  useSeoMeta('product', slug, product ? {
    title: `${product.name} | ${product.category?.name || 'Industrial Materials'}`,
    description: product.description || product.short_description || undefined,
    image: product.image_url || undefined,
    type: 'product',
    breadcrumbs: [
      { label: 'Shop', href: '/shop' },
      { label: product.category?.name || 'Category', href: `/shop?category=${product.category?.slug || ''}` },
      { label: product.name },
    ],
    productData: {
      name: product.name,
      description: product.description || product.short_description || undefined,
      image: product.image_url || undefined,
      sku: product.sku || product.slug,
      price: product.price,
      currency: 'KES',
      inStock: product.in_stock !== false,
      category: product.category?.name,
    },
  } : undefined);

  const { addItem } = useCart();

  useEffect(() => {
    if (!product) return;
    trackRecentlyViewed(product.slug);
    setSelectedImageIndex(0);
    setQty(1);
  }, [product?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const { products: relatedProductsRaw } = useProducts(
    product?.category_id ? { categoryId: product.category_id } : undefined
  );

  const relatedProducts = useMemo(() => {
    return (relatedProductsRaw || [])
      .filter((rp) => rp.slug !== product?.slug)
      .slice(0, 4);
  }, [relatedProductsRaw, product?.slug]);

  // Gallery URLs list
  const galleryList = useMemo(() => {
    if (!product) return [];
    const mainPlaceholder = getProductPlaceholder(product.category?.slug || product.category?.name);
    const mainImg = withFallback(product.image_url, mainPlaceholder);
    const list = [mainImg];

    if (product.gallery_urls && Array.isArray(product.gallery_urls)) {
      product.gallery_urls.forEach((url) => {
        if (url && url.trim() && !list.includes(url)) {
          list.push(url);
        }
      });
    }

    // Add category placeholder if list is single item
    if (list.length === 1 && mainPlaceholder !== mainImg) {
      list.push(mainPlaceholder);
    }

    return list;
  }, [product]);

  // Preload gallery and related product images
  useImagePreloader(
    useMemo(() => {
      const urls = [...galleryList];
      relatedProducts.forEach((rp) => {
        if (rp.image_url) urls.push(rp.image_url);
        urls.push(getProductPlaceholder(rp.category?.slug || rp.category?.name));
      });
      return urls;
    }, [galleryList, relatedProducts])
  );

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addItem(product);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="h-5 w-28 bg-gray-200 rounded-lg animate-pulse mb-8" />
          <div className="grid md:grid-cols-2 gap-12">
            <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-6">
              <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-28 w-full bg-gray-200 rounded-xl animate-pulse" />
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
          <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-navy-950 mb-3">Product Not Found</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            The material or product specification you are looking for may have been updated or moved.
          </p>
          <Link href="/shop" className="btn-primary">Return to Materials Shop</Link>
        </div>
      </CustomerLayout>
    );
  }

  const mainImageSrc = galleryList[selectedImageIndex] || galleryList[0];

  return (
    <CustomerLayout>
      <Breadcrumbs items={[
        { label: 'Materials Shop', href: '/shop' },
        ...(product.category ? [{ label: product.category.name, href: `/shop?category=${product.category.slug}` }] : []),
        { label: product.name }
      ]} />
      <div className="bg-gray-50/60 min-h-screen pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

          <div className="grid md:grid-cols-2 gap-8 lg:gap-14 items-start">
            {/* Left: Gallery Column */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-navy-950 rounded-2xl overflow-hidden border border-gray-200/80 shadow-md group">
                <img
                  src={mainImageSrc}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = getProductPlaceholder(product.category?.slug || product.category?.name);
                  }}
                />
                {product.featured && (
                  <span className="absolute top-4 left-4 bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Featured Material
                  </span>
                )}
                {product.sku && (
                  <span className="absolute bottom-4 left-4 text-[10px] font-mono text-gray-200 bg-navy-950/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10">
                    SKU: {product.sku}
                  </span>
                )}
              </div>

              {/* Thumbnails strip */}
              {galleryList.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {galleryList.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 bg-navy-950 ${
                        selectedImageIndex === idx
                          ? 'border-primary-500 ring-2 ring-primary-500/20 scale-105'
                          : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Preview ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Details */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
              <div>
                {product.category && (
                  <span className="text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100 inline-block mb-3">
                    {product.category.name}
                  </span>
                )}
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-950 leading-tight mb-3">
                  {product.name}
                </h1>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Pricing & Stock Status */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-baseline justify-between gap-4">
                <div>
                  <span className="font-display text-3xl font-bold text-navy-950">
                    {formatKES(product.price)}
                  </span>
                  {product.unit && (
                    <span className="text-gray-500 text-xs font-semibold ml-1.5">
                      per {product.unit}
                    </span>
                  )}
                </div>

                <div>
                  {product.in_stock ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      In Stock ({product.stock_quantity ?? 50}+ available)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Purchase Actions */}
              {product.in_stock && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="flex items-center justify-between sm:justify-start border border-gray-200 rounded-xl bg-gray-50 p-1">
                      <span className="text-xs font-semibold text-gray-500 px-3 hidden sm:inline">Qty:</span>
                      <button
                        className="w-9 h-9 rounded-lg bg-white shadow-2xs flex items-center justify-center hover:bg-gray-100 transition-colors text-navy-950"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-5 text-sm font-bold text-navy-950 min-w-[2.5rem] text-center">
                        {qty}
                      </span>
                      <button
                        className="w-9 h-9 rounded-lg bg-white shadow-2xs flex items-center justify-center hover:bg-gray-100 transition-colors text-navy-950"
                        onClick={() => setQty((q) => q + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        added
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 active:scale-98'
                      }`}
                    >
                      {added ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>Add {qty > 1 ? `${qty} Items` : 'to Cart'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <Link
                    href="/quotation"
                    className="block text-center w-full py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-navy-800 hover:bg-gray-50 transition-colors"
                  >
                    Need Bulk Contractor Pricing or Bill of Quantities Quote?
                  </Link>
                </div>
              )}

              {/* Technical Specifications */}
              {product.specifications && product.specifications.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-display font-bold text-navy-950 text-sm mb-3 uppercase tracking-wider">
                    Technical Specifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {product.specifications.map((spec) => (
                      <div key={spec.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                        <span className="block text-gray-400 font-semibold text-[10px] uppercase mb-0.5">
                          {spec.spec_name}
                        </span>
                        <span className="font-bold text-navy-950">{spec.spec_value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logistics & Support Callout */}
              <div className="p-4 rounded-xl bg-navy-950 text-white text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-primary-300">
                  <Truck className="w-4 h-4" />
                  <span>Site Delivery & Technical Field Assistance</span>
                </div>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  Orders placed online are dispatched from our central fulfillment hub. Our technical engineers can perform on-site substrate testing and application supervision.
                </p>
                <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-400 font-medium">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Manufacturer Warranty</span>
                  </span>
                  <span>•</span>
                  <span>Batch Quality Tested</span>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-gray-200/80">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                    Complementary Materials
                  </span>
                  <h2 className="font-display text-2xl font-bold text-navy-950 mt-1">
                    Related Products
                  </h2>
                </div>
                <Link href="/shop" className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1">
                  <span>View All Shop Items</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((rp) => {
                  const rpPlaceholder = getProductPlaceholder(rp.category?.slug || rp.category?.name);
                  const rpImage = withFallback(rp.image_url, rpPlaceholder);

                  return (
                    <div
                      key={rp.id}
                      className="group bg-white rounded-2xl border border-gray-200/80 hover:border-primary-300 shadow-2xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <Link href={`/product/${rp.slug}`}>
                          <div className="relative aspect-[4/3] bg-navy-950 overflow-hidden cursor-pointer">
                            <img
                              src={rpImage}
                              alt={rp.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.src = rpPlaceholder;
                              }}
                            />
                          </div>
                        </Link>
                        <div className="p-4">
                          {rp.category && (
                            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider block mb-1">
                              {rp.category.name}
                            </span>
                          )}
                          <Link href={`/product/${rp.slug}`}>
                            <h3 className="font-display font-bold text-navy-950 text-sm group-hover:text-primary-600 transition-colors line-clamp-1 mb-2">
                              {rp.name}
                            </h3>
                          </Link>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                          <p className="font-bold text-navy-950 text-sm">{formatKES(rp.price)}</p>
                          {rp.unit && <p className="text-[10px] text-gray-500">per {rp.unit}</p>}
                        </div>
                        <button
                          className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-colors"
                          disabled={!rp.in_stock}
                          onClick={(e) => {
                            e.preventDefault();
                            addItem(rp);
                          }}
                        >
                          {rp.in_stock ? 'Add' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

