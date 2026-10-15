import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight, CheckCircle2, ChevronRight, FileCheck2, HardHat,
  Layers3, Search, ShieldCheck, Sparkles, Wrench, X,
} from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';
import { serviceTone, TONE_HEX, TONE_LABEL } from '@/lib/service-tone';
import { useSeoMeta } from '@/hooks/use-seo';
import { useServices } from '@/hooks/use-data';
import { useImagePreloader } from '@/hooks/use-image-preloader';

/** Stable URL fallback for databases where the existing slug migration is not yet deployed. */
const serviceRouteSlug = (service: { slug?: string | null; name: string }) => {
  const stored = service.slug?.trim();
  if (stored) return stored;
  return service.name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

/** Display grouping only. The canonical service record remains the source of truth. */
const serviceCategory = (name: string) => {
  const value = name.toLowerCase();
  if (/waterproof|roof|tank|basement|balcony|gutter|leak|membrane/.test(value)) return 'Waterproofing';
  if (/level|grind|polish|concrete|screed|surface|preparation/.test(value)) return 'Surface preparation';
  return 'Flooring systems';
};

/** Editorial fallback only; do not overwrite or imply that this is database-authored copy. */
const serviceIntro = (name: string) => {
  const value = name.toLowerCase();
  if (/waterproof|roof|tank|basement|balcony|gutter|leak|membrane/.test(value)) return 'Discuss the exposure, substrate and site conditions with our team so the scope can be assessed before work begins.';
  if (/level|grind|polish|concrete|screed|surface|preparation/.test(value)) return 'Review the existing substrate and preparation requirements before selecting a suitable finish for the space.';
  if (/epoxy|pu|polyurethane/.test(value)) return 'Explore a seamless flooring option with the system and finish selected around the needs of your space.';
  return 'Share your project requirements with our team to discuss the appropriate scope, preparation and next steps.';
};

const processSteps = [
  { step: '01', title: 'Understand the site', description: 'Discuss the location, intended use, visible issues and priorities for the work.', icon: FileCheck2 },
  { step: '02', title: 'Define the scope', description: 'Review the proposed service, preparation needs, materials and work sequence.', icon: Wrench },
  { step: '03', title: 'Prepare & apply', description: 'Plan substrate preparation and application around the agreed project scope.', icon: Layers3 },
  { step: '04', title: 'Review the work', description: 'Review the completed scope and clarify relevant care and handover information.', icon: CheckCircle2 },
];

export default function Services() {
  useSeoMeta('services', null, { breadcrumbs: [{ label: 'Services' }] });
  const { services, loading, error, refetch } = useServices({ activeOnly: true });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All services');

  // Prefer catalogue-managed imagery. The fallback is a visual placeholder, never represented as a Topline project.
  const heroService = useMemo(() => services.find(service => Boolean(service.image_url?.trim())) || services[0], [services]);
  const heroImage = withFallback(heroService?.image_url, getServicePlaceholder(heroService?.slug || heroService?.name || 'flooring waterproofing'));

  useImagePreloader(useMemo(
    () => [heroImage, ...services.map(service => withFallback(service.image_url, getServicePlaceholder(service.slug || service.name)))],
    [heroImage, services],
  ));

  const categories = useMemo(() => [
    'All services',
    ...['Waterproofing', 'Flooring systems', 'Surface preparation'].filter(item => services.some(service => serviceCategory(service.name) === item)),
  ], [services]);

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return services.filter(service => {
      const matchesCategory = category === 'All services' || serviceCategory(service.name) === category;
      const searchable = `${service.name} ${service.short_description || ''} ${service.description || ''} ${(service.features || []).join(' ')}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [services, query, category]);

  return (
    <CustomerLayout>
      <div className="bg-[#F3F2EE]">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Services' }]} />
        </div>

        {/* Compact, image-led hero: the service is the product; materials support the work. */}
        <section className="relative isolate overflow-hidden bg-[#0A2548] text-white">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(200,242,106,.10),transparent_34%),linear-gradient(120deg,#0A2548_0%,#183B58_100%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-11 lg:grid-cols-[1.05fr_.95fr] lg:gap-12 lg:px-8 lg:py-14">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C8F26A]/30 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.17em] text-[#C8F26A] sm:text-[11px]">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Flooring · Waterproofing · Surface systems
              </div>
              <h1 className="font-display text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-[3.25rem]">
                Skilled work.<br /><span className="text-[#C8F26A]">Surfaces built for purpose.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">
                Find a flooring or waterproofing service, review the scope, and tell us about your site. We help you plan the work and identify materials that may be required for the project.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/quotation" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C8F26A] px-5 py-3 text-sm font-bold text-[#0C2D57] shadow-lg shadow-black/10 transition hover:bg-[#DDF79F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A2548]">
                  Request a project quote <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <a href="#service-catalogue" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Browse services <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-200">
                <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#C8F26A]" /> Scope-led recommendations</span>
                <span className="inline-flex items-center gap-2"><HardHat aria-hidden="true" className="h-4 w-4 text-[#C8F26A]" /> Site-specific planning</span>
              </div>
            </div>

            <div className="relative min-w-0">
              <div className="absolute -inset-3 rounded-[1.6rem] border border-white/10" aria-hidden="true" />
              <div className="relative aspect-[5/3] overflow-hidden rounded-2xl border border-white/15 bg-[#213F57] shadow-2xl shadow-black/25 sm:aspect-[16/9] lg:aspect-[5/4]">
                <img
                  src={heroImage}
                  alt={heroService ? `${heroService.name} service image` : 'Flooring and waterproofing service illustration'}
                  loading="eager"
                  className="h-full w-full object-cover"
                  onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = getServicePlaceholder(heroService?.slug || heroService?.name || 'flooring waterproofing'); }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0A2548]/85 via-[#0A2548]/10 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/15 bg-[#0A2548]/80 p-4 backdrop-blur-md sm:inset-x-5 sm:bottom-5">
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#C8F26A]">Start with your project</p>
                  <p className="mt-1 font-display text-lg font-semibold text-white sm:text-xl">The right scope starts on site.</p>
                  <p className="mt-1 text-xs leading-5 text-slate-200">Tell us what needs to be done, where, and what the surface must withstand.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="service-catalogue" className="scroll-mt-24 py-10 sm:py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#566F0D] sm:text-xs">Our capabilities</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#0C2D57] sm:text-4xl">Find the right service</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Explore the services currently listed by our team. Review the available details and request a quotation for your project.</p>
              </div>
              {!loading && !error && services.length > 0 && <p className="text-sm font-medium text-slate-500" aria-live="polite">Showing {filteredServices.length} of {services.length} services</p>}
            </div>

            {!loading && !error && services.length > 0 && <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter services by category">
                {categories.map(item => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2 ${category === item ? 'border-[#0C2D57] bg-[#0C2D57] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>{item}</button>)}
              </div>
              <div className="relative w-full lg:max-w-xs">
                <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} type="search" aria-label="Search services" placeholder="Search services…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-[#0C2D57] outline-none transition placeholder:text-slate-400 focus:border-[#0E6B78] focus:ring-2 focus:ring-[#0E6B78]/20" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear service search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X aria-hidden="true" className="h-4 w-4" /></button>}
              </div>
            </div>}

            {loading ? <div aria-label="Loading services" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(item => <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="aspect-[5/3] animate-pulse bg-slate-100" /><div className="space-y-3 p-5"><div className="h-3 w-24 animate-pulse rounded bg-slate-100" /><div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" /><div className="h-12 animate-pulse rounded bg-slate-100" /></div></div>)}</div>
              : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center sm:p-12"><p className="font-display text-xl font-semibold text-[#0C2D57]">We couldn’t load the service catalogue</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Your catalogue has not been replaced. Please retry, or contact our team while we check the connection.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => void refetch()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0C2D57] px-5 py-3 text-sm font-semibold text-white hover:bg-[#123766]">Try again</button><Link href="/contact" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-[#0C2D57] hover:bg-slate-50">Contact our team <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div></div>
              : services.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2F5] text-[#0E6B78]"><Wrench aria-hidden="true" className="h-6 w-6" /></div><h3 className="mt-4 font-display text-xl font-semibold text-[#0C2D57]">Service information is being updated</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">No active services were returned by the catalogue. Contact our team to discuss your flooring or waterproofing requirements.</p><Link href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0C2D57] px-5 py-3 text-sm font-semibold text-white hover:bg-[#123766]">Contact the team <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>
              : filteredServices.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><p className="font-semibold text-[#0C2D57]">No services match that search</p><p className="mt-2 text-sm text-slate-500">Try another term or clear your filters.</p><button type="button" onClick={() => { setQuery(''); setCategory('All services'); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0C2D57] hover:bg-slate-50">Clear filters <X aria-hidden="true" className="h-4 w-4" /></button></div>
              : <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">{filteredServices.map(service => {
                const features = (service.features || []).filter(feature => typeof feature === 'string' && feature.trim()).slice(0, 3);
                const image = withFallback(service.image_url, getServicePlaceholder(service.slug || service.name));
                const routeSlug = serviceRouteSlug(service);
                const tone = serviceTone(service.name, service.slug, service.short_description);
                const detailHref = routeSlug ? `/service/${encodeURIComponent(routeSlug)}` : null;
                return <article key={service.id} style={{ borderTopColor: TONE_HEX[tone] }} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-t-4 border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(20,44,70,.035)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(20,44,70,.10)]">
                  <div className="relative overflow-hidden bg-[#E8EDF1]">
                    {detailHref ? <Link href={detailHref} aria-label={`View ${service.name} service details`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E6B78]"><div className="aspect-[5/3] overflow-hidden"><img src={image} alt={service.name} loading="lazy" className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = getServicePlaceholder(service.slug || service.name); }} /></div></Link> : <div className="aspect-[5/3] overflow-hidden"><img src={image} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = getServicePlaceholder(service.name); }} /></div>}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A2548]/65 via-transparent to-transparent" />
                    <span className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/25 bg-[#0A2548]/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-white backdrop-blur-sm">{serviceCategory(service.name)}</span>
                    {detailHref && <span aria-hidden="true" className="pointer-events-none absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-sm transition group-hover:bg-white group-hover:text-[#0C2D57]"><ArrowRight className="h-4 w-4" /></span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-slate-600"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE_HEX[tone] }} />{tone === 'general' ? 'Service offering' : TONE_LABEL[tone]}</p>
                    <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-[#0C2D57] sm:text-[1.35rem]">{service.name}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{service.short_description || service.description || serviceIntro(service.name)}</p>
                    {features.length > 0 && <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">{features.map((feature, index) => <li key={`${service.id}-feature-${index}`} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0E6B78]" /><span>{feature}</span></li>)}</ul>}
                    <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
                      {detailHref && <Link href={detailHref} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0C2D57] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#123766] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2">View service <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>}
                      <Link href="/quotation" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-[#0C2D57] transition hover:border-[#C8F26A] hover:bg-[#FAF8F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2">Request quote</Link>
                    </div>
                  </div>
                </article>;
              })}</div>}
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white py-11 sm:py-14 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#566F0D] sm:text-xs">A clear process</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#0C2D57] sm:text-4xl">From assessment to handover</h2><p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">A straightforward process helps align the work, materials and preparation with your site's requirements.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{processSteps.map(item => { const Icon = item.icon; return <div key={item.step} className="relative rounded-2xl border border-slate-200 bg-[#FAFBFC] p-5 sm:p-6"><div className="flex items-center justify-between"><span className="font-display text-3xl font-semibold tracking-tight text-[#B8A780]">{item.step}</span><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F4] text-[#34536E]"><Icon aria-hidden="true" className="h-5 w-5" /></span></div><h3 className="mt-5 font-display text-lg font-semibold text-[#0C2D57]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p></div>; })}</div>
          </div>
        </section>

        <section className="bg-[#0A2548] py-11 text-white sm:py-14 lg:py-16">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C8F26A] sm:text-xs">Let's plan your project</p><h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Not sure which service is right for your site?</h2><p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Tell us what needs to be done, where the site is, and what the surface needs to withstand. Our team can help you plan the next step.</p></div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:shrink-0"><Link href="/quotation" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C8F26A] px-6 py-3 text-sm font-bold text-[#0C2D57] transition hover:bg-[#DDF79F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A2548]">Request a quote <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link><Link href="/contact" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Talk to our team</Link></div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}
