import { useLocation, Link } from 'wouter';
import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, PhoneCall } from 'lucide-react';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';
import { useSeoMeta } from '@/hooks/use-seo';
import { useSiteSettings } from '@/hooks/use-data';

function slugifyServiceName(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

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
  // Routing is location-based (see App.tsx), so wouter route params are always empty here.
  const [location] = useLocation();
  const slug = (() => {
    const raw = location.replace(/^\/service\//, '').split(/[?#]/)[0].replace(/\/+$/, '');
    try { return decodeURIComponent(raw); } catch { return raw; }
  })();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSiteSettings();
  const companyName = settings.site_info?.name || settings.company?.name || 'Topline Flooring & Waterproofing';

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
    if (!slug) {
      setLoading(false);
      return;
    }
    void loadService();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadService = async () => {
    setLoading(true);
    setService(null);
    try {
      // Prefer the canonical slug lookup. If the existing additive migration is not
      // yet visible through PostgREST, fall back to the active catalogue for reads.
      const direct = await supabase
        .from('services')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!direct.error && direct.data) {
        setService(direct.data as Service);
        return;
      }

      const catalogue = await supabase.from('services').select('*').eq('is_active', true).order('display_order');
      if (catalogue.error) throw catalogue.error;
      const rows = (catalogue.data || []) as unknown as Array<Record<string, unknown>>;
      const match = rows.find(row => {
        const rowSlug = typeof row.slug === 'string' && row.slug.trim()
          ? row.slug.trim()
          : slugifyServiceName(String(row.name || ''));
        return rowSlug === slug;
      });
      if (match) setService(match as unknown as Service);
    } catch {
      // Stop loading cleanly if schema deployment or connectivity is incomplete.
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F8FA]">
          <div role="status" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm"><Loader2 className="h-5 w-5 animate-spin text-[#607D98]" />Loading service details…</div>
        </div>
      </CustomerLayout>
    );
  }

  if (!service) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F8FA] px-4 py-12">
          <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <h1 className="mb-2 font-display text-2xl font-semibold text-[#142C46]">Service details unavailable</h1>
            <p className="mb-6 text-sm leading-6 text-slate-600">This service may have been updated or is no longer listed. Browse our current services or contact the team for assistance.</p>
            <Link href="/services" className="inline-flex items-center gap-2 rounded-xl bg-[#142C46] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#203F60]">
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
      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-[#10283F] py-12 text-white sm:py-14 lg:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <span className="mb-4 inline-flex items-center rounded-full border border-[#D8C9A7]/30 bg-white/[0.06] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#E7D9B9]">
                Technical Specification
              </span>
              <h1 className="mb-4 font-display text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
                {service.name}
              </h1>
              <p className="mb-8 max-w-2xl text-base leading-7 text-slate-200 lg:text-lg">
                {service.short_description || service.description}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/quotation" className="inline-flex items-center gap-2 rounded-xl bg-[#D8C9A7] px-6 py-3 text-sm font-bold text-[#142C46] shadow-sm transition hover:bg-[#E7DCC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <span>Get Quotation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <PhoneCall className="w-4 h-4 text-[#D8C9A7]" />
                  <span>Request Site Visit</span>
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-[#0B2034] shadow-2xl shadow-black/20">
                <img
                  src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                  alt={service.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getServicePlaceholder(service.slug || service.name);
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-xl border border-white/15 bg-[#10283F]/85 px-4 py-3 text-xs font-semibold text-white backdrop-blur-md">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#D8C9A7]" />
                    Technical service information
                  </span>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description Detail */}
      {service.description && (
        <section className="bg-white py-12 sm:py-14 lg:py-16">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8A7956]">Service overview</p><h2 className="mb-5 mt-2 border-b border-slate-100 pb-4 font-display text-2xl font-semibold tracking-tight text-[#142C46]">Scope & technical details</h2>
            <div className="prose prose-navy max-w-none whitespace-normal text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              <p className="whitespace-pre-line">{service.description}</p>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {service.features && service.features.length > 0 && (
        <section className="border-t border-slate-200/80 bg-[#F6F8FA] py-12 sm:py-14 lg:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8A7956]">At a glance</p><h2 className="mb-6 mt-2 font-display text-2xl font-semibold tracking-tight text-[#142C46]">Key system attributes</h2>
            <div className="grid sm:grid-cols-2 gap-3.5">
              {service.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_3px_12px_rgba(20,44,70,.03)]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-navy-900 font-medium text-sm sm:text-base">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-[#10283F] py-14 text-white sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#D8C9A7]">Next step</p><h2 className="mb-3 mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Ready to begin your project?</h2>
          <p className="text-navy-100/90 text-base mb-8 max-w-xl mx-auto">
            Tell us about your site and requirements so we can discuss the scope and quotation for your {service.name.toLowerCase()} project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/quotation" className="w-full rounded-xl bg-[#D8C9A7] px-8 py-3 text-sm font-bold text-[#142C46] shadow-md transition hover:bg-[#E7DCC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto">
              Request Project Quotation
            </Link>
            <Link href="/services" className="w-full rounded-xl border border-white/20 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto">
              View All Services
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}

