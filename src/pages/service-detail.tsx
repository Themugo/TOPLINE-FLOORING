import { useParams, Link } from 'wouter';
import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';
import { useSeoMeta } from '@/hooks/use-seo';

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  image_url: string;
  icon?: string;
  features?: string[];
  display_order: number;
  is_active: boolean;
}

export default function ServiceDetail() {
  const { slug } = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useSeoMeta('service', slug, service ? {
    title: `${service.name} | Topline Flooring & Waterproofing`,
    description: service.short_description || service.description?.substring(0, 160),
    image: service.image_url,
  } : undefined);

  useEffect(() => {
    if (!slug) return;
    loadService();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadService = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!error && data) {
      setService(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  if (!service) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">Service Not Found</h1>
            <p className="text-gray-500 mb-6">The service you're looking for doesn't exist or has been removed.</p>
            <Link href="/services" className="btn-primary inline-flex items-center gap-2">
              View All Services
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <Breadcrumbs items={[
        { label: 'Services', href: '/services' },
        { label: service.name },
      ]} />

      {/* Hero */}
      <section className="bg-gray-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="section-label">Our Service</span>
              <h1 className="font-display text-3xl lg:text-5xl font-bold text-navy-900 mb-6 mt-2">
                {service.name}
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                {service.short_description || service.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/quotation" className="btn-primary inline-flex items-center justify-center gap-2">
                  Get a Quote
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="btn bg-white border border-gray-200 text-navy-700 hover:bg-gray-100 inline-flex items-center justify-center">
                  Contact Us
                </Link>
              </div>
            </div>
            <div>
              <img
                src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                alt={service.name}
                className="w-full rounded-2xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      {service.description && (
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-navy-900 mb-6">About This Service</h2>
            <div className="prose prose-lg max-w-none text-gray-600">
              <p className="whitespace-pre-line">{service.description}</p>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {service.features && service.features.length > 0 && (
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-navy-900 mb-8">Key Features</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {service.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
                  <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-100 text-lg mb-8">
            Contact us today for a free consultation and quote for your {service.name.toLowerCase()} project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/quotation" className="btn bg-white text-primary-600 hover:bg-gray-100">
              Request Quote
            </Link>
            <Link href="/services" className="btn border border-white text-white hover:bg-primary-700">
              View All Services
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
