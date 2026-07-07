import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShieldCheck, Truck, Clock, CheckCircle } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductSpecifications } from '@/components/product/ProductSpecifications';
import { StickyPurchasePanel } from '@/components/product/StickyPurchasePanel';
import { useProduct, useProducts, useRecentlyViewed } from '@/hooks/use-data';
import { useCart } from '@/hooks/use-cart';
import { formatKES } from '@/lib/utils';
import type { ProductVariant } from '@/lib/types';

export default function ShopDetail() {
  const [location] = useLocation();
  const slug = location.replace('/product/', '');
  const { product, loading } = useProduct(slug);
  const { addItem } = useCart();
  const { trackView } = useRecentlyViewed();

  useEffect(() => {
    if (product?.id) {
      trackView(product.id);
    }
  }, [product?.id, trackView]);

  const { products: relatedProductsRaw } = useProducts(
    product?.category_id ? { categoryId: product.category_id } : undefined
  );
  const relatedProducts = (relatedProductsRaw || [])
    .filter((rp) => rp.slug !== product?.slug)
    .slice(0, 4);

  const handleAddToCart = (variant?: ProductVariant) => {
    if (!product) return;
    if (variant) {
      // Add variant to cart
      addItem(product);
    } else {
      addItem(product);
    }
  };

  const handleAddToWishlist = () => {
    // Wishlist functionality
    console.log('Add to wishlist:', product?.id);
  };

  const handleRequestQuote = () => {
    // Navigate to quotation page
    window.location.href = '/quotation';
  };

  const images = product?.images?.map(img => img.image_url) || [];
  if (product?.image_url && !images.includes(product.image_url)) {
    images.unshift(product.image_url);
  }

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
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: 'Shop', href: '/shop' },
              { label: product?.category?.name || 'Category', href: `/shop?category=${product?.category_id}` },
              { label: product?.name || 'Product' },
            ]}
          />

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mt-8">
            {/* Gallery */}
            <ProductGallery
              images={images}
              videoUrl={product?.video_url}
              videoThumbnail={product?.video_thumbnail}
              image360Url={product?.image_360_url}
              productName={product?.name || ''}
            />

            {/* Product Info */}
            <div>
              {product?.category && (
                <p className="text-xs text-primary-600 uppercase tracking-wider font-medium mb-3">
                  {product.category.name}
                </p>
              )}
              <h1 className="font-display text-3xl lg:text-4xl font-bold text-navy-900 mb-4">
                {product?.name}
              </h1>

              {product?.short_description && (
                <p className="text-gray-600 mb-6">{product.short_description}</p>
              )}

              {/* Availability & Delivery */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                {product?.stock_quantity > 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>In Stock</span>
                  </div>
                ) : (
                  <span className="text-red-600">Out of Stock</span>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck className="w-4 h-4" />
                  <span>Free delivery over KES 50,000</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>3-5 business days</span>
                </div>
              </div>

              {/* Sticky Purchase Panel */}
              {product && (
                <StickyPurchasePanel
                  product={product}
                  variants={product.variants}
                  onAddToCart={handleAddToCart}
                  onAddToWishlist={handleAddToWishlist}
                  onRequestQuote={handleRequestQuote}
                />
              )}

              {/* Specifications */}
              {product && (
                <ProductSpecifications
                  product={product}
                  specifications={product.specifications}
                  documents={product.documents}
                />
              )}
            </div>
          </div>

          {/* Related Products */}
          {product?.category_id && relatedProducts.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-2xl font-bold text-navy-900 mb-8">
                Related Products
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedProducts.map((rp) => (
                  <Link
                    key={rp.id}
                    href={`/product/${rp.slug}`}
                    className="group"
                  >
                    <div className="bg-white border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        {rp.image_url ? (
                          <img
                            src={rp.image_url}
                            alt={rp.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShieldCheck className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        {rp.category && (
                          <p className="text-xs text-primary-600 uppercase tracking-wide font-medium mb-1">
                            {rp.category.name}
                          </p>
                        )}
                        <h3 className="font-semibold text-navy-900 text-sm leading-tight mb-2 line-clamp-2">
                          {rp.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy-900">
                            {formatKES(rp.price)}
                          </span>
                          {rp.unit && (
                            <span className="text-xs text-gray-500">/ {rp.unit}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
