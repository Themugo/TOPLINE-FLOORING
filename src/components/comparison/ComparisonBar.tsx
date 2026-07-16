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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
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
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
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
