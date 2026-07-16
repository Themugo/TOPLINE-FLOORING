import { useState, useEffect } from 'react';
import { ShoppingCart, Heart, Share2, MessageCircle, Plus, Minus, Check } from 'lucide-react';
import type { Product, ProductVariant } from '@/lib/types';
import { formatKES } from '@/lib/utils';

interface StickyPurchasePanelProps {
  product: Product;
  variants?: ProductVariant[];
  onAddToCart: (variant?: ProductVariant) => void;
  onAddToWishlist: () => void;
  onRequestQuote: () => void;
}

export function StickyPurchasePanel({ 
  product, 
  variants = [], 
  onAddToCart, 
  onAddToWishlist,
  onRequestQuote 
}: StickyPurchasePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    variants.find(v => v.is_default) || variants[0]
  );
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentPrice = selectedVariant?.sale_price || selectedVariant 
    ? product.price + (selectedVariant.price_adjustment || 0)
    : product.sale_price || product.price;

  const originalPrice = selectedVariant 
    ? product.price + (selectedVariant.price_adjustment || 0)
    : product.price;

  const isOnSale = currentPrice !== originalPrice;
  const inStock = selectedVariant 
    ? selectedVariant.stock_quantity > 0
    : product.stock_quantity > 0;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart(selectedVariant);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description || product.description || '',
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className={`space-y-6 ${isSticky ? 'sticky top-4' : ''}`}>
      {/* Price */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          {isOnSale && (
            <span className="text-lg text-gray-500 line-through">
              {formatKES(originalPrice)}
            </span>
          )}
          <span className="font-display text-3xl lg:text-4xl font-bold text-navy-900">
            {formatKES(currentPrice)}
          </span>
          {product.unit && (
            <span className="text-gray-500 text-sm">/ {product.unit}</span>
          )}
        </div>
        
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {product.is_new_arrival && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              New Arrival
            </span>
          )}
          {product.is_best_seller && (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
              Best Seller
            </span>
          )}
          {product.is_clearance && (
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              Clearance
            </span>
          )}
          {isOnSale && (
            <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              Sale
            </span>
          )}
        </div>
      </div>

      {/* Variant Selection */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Select Option</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                disabled={!variant.is_active || variant.stock_quantity === 0}
                className={`px-4 py-2 text-sm border rounded-lg transition-colors ${
                  selectedVariant?.id === variant.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                } ${!variant.is_active || variant.stock_quantity === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {variant.variant_name}
                {variant.stock_quantity === 0 && ' (Out of Stock)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        {inStock ? (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">In Stock</span>
          </div>
        ) : (
          <span className="text-sm text-red-600 font-medium">Out of Stock</span>
        )}
        {selectedVariant?.stock_quantity !== undefined && selectedVariant.stock_quantity <= selectedVariant.low_stock_threshold && (
          <span className="text-xs text-orange-600">Only {selectedVariant.stock_quantity} left</span>
        )}
      </div>

      {/* Quantity */}
      {inStock && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Quantity</span>
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              className="px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-5 py-2 text-sm font-semibold min-w-[3rem] text-center">
              {quantity}
            </span>
            <button
              className="px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {inStock ? (
          <button
            onClick={handleAddToCart}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Add to Cart
          </button>
        ) : (
          <button
            onClick={onRequestQuote}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Request Quote
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAddToWishlist}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            <Heart className="w-5 h-5" />
            Wishlist
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
        <p className="text-sm font-medium text-navy-900">Delivery Information</p>
        <p className="text-xs text-gray-600">
          Free delivery on orders over KES 50,000 within Nairobi. Estimated delivery: 3-5 business days.
        </p>
      </div>

      {/* Installation Option */}
      <button
        onClick={onRequestQuote}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-navy-100 hover:bg-navy-200 text-navy-900 rounded-lg transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        Request Installation Quote
      </button>
    </div>
  );
}
