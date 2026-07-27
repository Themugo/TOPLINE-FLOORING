import { useParams, Link } from 'wouter';
import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, PhoneCall } from 'lucide-react';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';
import { useSeoMeta } from '@/hooks/use-seo';
import { useSiteSettings } from '@/hooks/use-data';

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
  const { settings } = useSiteSettings();
  const companyName = settings.site_info?.name || settings.company?.name || 'Your Flooring Company';

  useSeoMeta('service', slug, service ? {
    title: `${service.name} | ${companyName}`,
    description: service.short_description || service.description?.substring(0, 160),
    image: service.image_url,
    breadcrumbs: [
      { label: 'Services', href: '/services' },
      { label: service.name },
    ],
    serviceData: {
      name: service.name,
      description: service.short_description || service.description,
      image: service.image_url,
      providerName: companyName,
    },
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
          <div className="text-center px-4">
            <h1 className="font-display text-2xl font-bold text-navy-950 mb-2">Service Specification Not Found</h1>
            <p className="text-gray-500 mb-6 text-sm">The requested service spec is unavailable or may have been updated.</p>
            <Link href="/services" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all">
              <span>Browse All Services</span>
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

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50 border-b border-gray-200/80 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <span className="inline-block px-3.5 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-xs font-semibold uppercase tracking-wider mb-3">
                Technical Specification
              </span>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-950 tracking-tight mb-4">
                {service.name}
              </h1>
              <p className="text-gray-600 text-base lg:text-lg leading-relaxed mb-8">
                {service.short_description || service.description}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/quotation" className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all shadow-sm inline-flex items-center gap-2">
                  <span>Get Quotation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="px-6 py-3 bg-white border border-gray-200 text-navy-800 hover:bg-gray-50 rounded-xl font-bold text-sm transition-colors inline-flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-primary-500" />
                  <span>Request Site Visit</span>
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden bg-navy-950 shadow-lg aspect-[4/3]">
                <img
                  src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                  alt={service.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getServicePlaceholder(service.slug || service.name);
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-semibold bg-navy-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {companyName} Certified Application
                  </span>
                  <span className="text-primary-300">10-Yr Warranty</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description Detail */}
      {service.description && (
        <section className="py-12 lg:py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-navy-950 mb-4 pb-2 border-b border-gray-100">Scope & Engineering Overview</h2>
            <div className="prose prose-navy max-w-none text-gray-600 text-sm sm:text-base leading-relaxed">
              <p className="whitespace-pre-line">{service.description}</p>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {service.features && service.features.length > 0 && (
        <section className="py-12 lg:py-16 bg-gray-50/80 border-t border-gray-200/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-navy-950 mb-6">Key System Attributes</h2>
            <div className="grid sm:grid-cols-2 gap-3.5">
              {service.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-navy-900 font-medium text-sm sm:text-base">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-display text-3xl font-bold mb-3">Ready to Begin Your Project?</h2>
          <p className="text-navy-100/90 text-base mb-8 max-w-xl mx-auto">
            Contact us today for a free technical consultation and formal quote for your {service.name.toLowerCase()} project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/quotation" className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all">
              Request Project Quotation
            </Link>
            <Link href="/services" className="w-full sm:w-auto bg-navy-800 border border-navy-700 text-white hover:bg-navy-700 px-8 py-3 rounded-xl font-bold text-sm transition-all">
              View All Services
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}

