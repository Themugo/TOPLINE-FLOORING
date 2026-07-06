import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Minus, Plus, ShoppingCart, Tag } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useProduct } from '@/hooks/use-data';
import { formatKES } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';

export default function ProductDetail() {
  const [location] = useLocation();
  const slug = location.split('/product/')[1] || '';
  const { product, loading, error } = useProduct(slug);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-8"></div>
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="aspect-[4/3] bg-gray-200 rounded-xl"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (error || !product) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
            <p className="text-gray-500 mb-8">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/shop" className="btn-primary">
              Browse Products
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
              <img
                src={product.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.gallery_urls && product.gallery_urls.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {product.gallery_urls.slice(0, 4).map((url, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={url}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {product.category && (
              <Link
                href={`/shop?category=${product.category.id}`}
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-3"
              >
                <Tag className="w-3 h-3" />
                {product.category.name}
              </Link>
            )}

            <h1 className="font-display text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <p className="text-3xl font-bold text-gray-900">{formatKES(product.price)}</p>
              <p className="text-gray-500">per {product.unit}</p>
              {product.in_stock ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  In Stock
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                  Out of Stock
                </span>
              )}
            </div>

            {product.description && (
              <div className="prose prose-gray mb-8">
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-4 mb-6">
                <label className="text-sm font-medium text-gray-700">Quantity:</label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-gray-500 text-sm">
                  Total: {formatKES(product.price * quantity)}
                </span>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
            </div>

            <div className="mt-8 space-y-4 text-sm text-gray-500">
              <p>
                <strong className="text-gray-700">Delivery:</strong> We deliver across Kenya.
                Shipping costs calculated at checkout.
              </p>
              <p>
                <strong className="text-gray-700">Bulk Orders:</strong> Contact us for
                special pricing on large orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
