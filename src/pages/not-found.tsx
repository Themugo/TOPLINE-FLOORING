import { Link } from 'wouter';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { ArrowLeft } from 'lucide-react';
import { useSeoMeta } from '@/hooks/use-seo';

export default function NotFound() {
  useSeoMeta('not-found', null, {
    title: '404 Page Not Found',
    description: 'The requested page could not be found.',
    noIndex: true,
    noFollow: true,
  });

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
        <nav aria-label="Helpful pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {[
            { href: '/services', label: 'Services' },
            { href: '/shop', label: 'Materials Shop' },
            { href: '/quotation', label: 'Get a Quote' },
            { href: '/contact', label: 'Contact' },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center rounded-full border border-gray-200 px-4 text-sm font-medium text-navy-700 hover:border-primary-600 hover:text-primary-600">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </CustomerLayout>
  );
}
