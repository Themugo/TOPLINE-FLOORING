import { useEffect } from 'react';
import { Link } from 'wouter';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page Not Found | Topline Flooring & Waterproofing';
    const meta = document.querySelector('meta[name="robots"]');
    if (meta) meta.setAttribute('content', 'noindex, nofollow');
  }, []);

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        <p className="font-display text-8xl md:text-9xl font-bold text-primary-200 mb-6 leading-none">
          404
        </p>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy-900 mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </CustomerLayout>
  );
}
