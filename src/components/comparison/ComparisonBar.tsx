import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Scale, X, ArrowRight } from 'lucide-react';
import { useProductComparison } from '@/hooks/use-data';

export function ComparisonBar() {
  const { comparison, loading, clearComparison } = useProductComparison();
  const [isVisible, setIsVisible] = useState(false);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const count = comparison?.product_ids?.length || 0;
    setProductCount(count);
    setIsVisible(count > 0);
  }, [comparison?.product_ids]);

  if (!isVisible || loading) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-5 md:left-5 md:w-[min(34rem,calc(100vw-9rem))] md:rounded-2xl md:border bg-white border-t border-gray-200 shadow-lg z-40">
      <div role="region" aria-label="Product comparison" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 md:px-5 md:py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-navy-900">
              <Scale className="w-5 h-5" />
              <span className="font-semibold">{productCount} product{productCount !== 1 ? 's' : ''} to compare</span>
            </div>
            <p className="text-sm text-gray-500 hidden sm:block">
              Compare up to 4 products side-by-side
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                clearComparison();
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex min-h-10 items-center gap-1 px-1"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
            <Link
              href="/compare"
              className="btn-primary flex items-center gap-2"
            >
              Compare Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
