import type { Product, ProductVariant } from '@/lib/types';

export function getActiveProductVariants(product: Product): ProductVariant[] {
  return (product.variants || [])
    .filter((variant) => variant.is_active)
    .sort((a, b) => a.display_order - b.display_order);
}

export function getDefaultProductVariant(product: Product): ProductVariant | undefined {
  const variants = getActiveProductVariants(product);
  return variants.find((variant) => variant.is_default) || variants[0];
}

export function getProductUnitPrice(product: Product, variant?: ProductVariant): number {
  if (variant) {
    return variant.sale_price ?? product.price + (variant.price_adjustment || 0);
  }
  return product.sale_price ?? product.price;
}

export function getProductAvailableStock(product: Product, variant?: ProductVariant): number {
  return variant ? variant.stock_quantity : product.stock_quantity;
}

export function isProductPurchasable(product: Product, variant?: ProductVariant): boolean {
  if (!product.is_active) return false;
  if (variant) return variant.is_active && variant.stock_quantity > 0;
  if (getActiveProductVariants(product).length > 0) return false;
  return product.in_stock && product.stock_quantity > 0;
}
