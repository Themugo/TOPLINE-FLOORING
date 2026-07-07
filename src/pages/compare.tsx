import { useState, useEffect } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { ProductComparison } from '@/components/comparison/ProductComparison';
import { useProductComparison } from '@/hooks/use-data';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';

export default function Compare() {
  const { comparison, loading, clearComparison, removeFromComparison } = useProductComparison();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (comparison?.product_ids?.length) {
        const { data } = await supabase
          .from('products')
          .select('*, category:categories(*), brand:product_brands(*)')
          .in('id', comparison.product_ids);
        setProducts(data || []);
      } else {
        setProducts([]);
      }
    };
    fetchProducts();
  }, [comparison?.product_ids]);

  const handleRemove = (productId: string) => {
    removeFromComparison(productId);
  };

  const handleClearAll = () => {
    clearComparison();
  };

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-gray-50 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-navy-900 mb-2">
              Product Comparison
            </h1>
            <p className="text-gray-600">
              Compare products side-by-side to make the best choice for your project.
            </p>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-64 bg-gray-200 rounded-xl" />
              <div className="h-32 bg-gray-200 rounded-xl" />
            </div>
          ) : (
            <ProductComparison
              products={products}
              onRemove={handleRemove}
              onClearAll={handleClearAll}
            />
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
