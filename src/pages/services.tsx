import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight, CheckCircle2, ChevronRight, FileCheck2, HardHat,
  Layers3, Loader2, Search, ShieldCheck, Sparkles, Wrench, X,
} from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';
import { useSeoMeta } from '@/hooks/use-seo';
import { useServices } from '@/hooks/use-data';
import { useImagePreloader } from '@/hooks/use-image-preloader';

const serviceCategory = (name: string) => {
  const value = name.toLowerCase();
  if (/waterproof|roof|tank|basement|balcony|gutter|leak|membrane/.test(value)) return 'Waterproofing';
  if (/level|grind|polish|concrete|screed|surface|preparation/.test(value)) return 'Surface preparation';
  return 'Flooring systems';
};

const serviceIntro = (name: string) => {
  const value = name.toLowerCase();
  if (/waterproof|roof|tank|basement|balcony|gutter|leak|membrane/.test(value)) return 'Protect vulnerable surfaces and structures with a system selected for the site conditions and water exposure.';
  if (/level|grind|polish|concrete|screed|surface|preparation/.test(value)) return 'Prepare and refine concrete substrates to support a consistent, durable final floor finish.';
  if (/epoxy|pu|polyurethane/.test(value)) return 'Seamless protective flooring designed around the demands of the space, traffic, and maintenance routine.';
  return 'A practical, specification-led solution tailored to your site, substrate, and project requirements.';
};

export default function Services() {
  useSeoMeta('services', null, { breadcrumbs: [{ label: 'Services' }] });
  const { services, loading, error } = useServices({ activeOnly: true });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All services');

  useImagePreloader(useMemo(
    () => services.map(service => service.image_url || getServicePlaceholder(service.slug || service.name)),
    [services],
  ));

  const categories = useMemo(() => ['All services', ...Array.from(new Set(services.map(service => serviceCategory(service.name))))], [services]);
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
      <div className="bg-[#F7F8FA]">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Services' }]} />
        </div>

        <section className="relative isolate overflow-hidden bg-[#10283F] text-white">
          <div aria-hidden="true" className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 78% 15%, rgba(196,178,139,.26), transparent 30%), linear-gradient(125deg, transparent 35%, rgba(98,126,151,.22) 100%)' }} />
          <div aria-hidden="true" className="absolute -right-24 -top-28 h-96 w-96 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-12 -top-16 h-72 w-72 rounded-full border border-white/10" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D6C7A4]/30 bg-white/[0.06] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#E7D9B9]">
                <Sparkles className="h-3.5 w-3.5" /> Flooring · Waterproofing · Surface systems
              </div>
              <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.7rem]">
                Engineered surfaces.<br /><span className="text-[#D8C9A7]">Built around your project.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
                Explore flooring and waterproofing services for residential, commercial and industrial spaces. We help you identify the right scope, surface preparation and system for your site.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/quotation" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D8C9A7] px-6 py-3 text-sm font-bold text-[#142C46] shadow-lg shadow-black/10 transition hover:bg-[#E7DCC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#10283F]">
                  Request a project quote <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#service-catalogue" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Explore services <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:pl-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm sm:p-6">
                <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-[#D8C9A7]/15 text-[#E7D9B9]"><Layers3 className="h-5 w-5" /></div>
                <p className="font-display text-lg font-semibold text-white sm:text-xl">Flooring systems</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Protective and performance-led floor finishes.</p>
              </div>
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm sm:p-6 lg:mt-10">
                <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-[#D8C9A7]/15 text-[#E7D9B9]"><ShieldCheck className="h-5 w-5" /></div>
                <p className="font-display text-lg font-semibold text-white sm:text-xl">Waterproofing</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Solutions for roofs, tanks and moisture-prone areas.</p>
              </div>
              <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0B2034]/70 p-4 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E7D9B9]"><HardHat className="h-5 w-5" /></div>
                <div><p className="text-sm font-semibold text-white">Start with the site conditions</p><p className="mt-1 text-xs leading-5 text-slate-300 sm:text-sm">Share your project scope and get guidance on the next step.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="service-catalogue" className="scroll-mt-24 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-5 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8A7956]">Our capabilities</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#142C46] sm:text-4xl">Find the right service</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Browse the services currently listed by our team. Open a specification to review its details or request a quotation for your project.</p>
              </div>
              {!loading && !error && services.length > 0 && <p className="text-sm font-medium text-slate-500">{filteredServices.length} of {services.length} services</p>}
            </div>

            {!loading && !error && services.length > 0 && <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter services by category">
                {categories.map(item => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#607D98] focus-visible:ring-offset-2 ${category === item ? 'border-[#142C46] bg-[#142C46] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>{item}</button>)}
              </div>
              <div className="relative w-full lg:max-w-xs">
                <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} type="search" aria-label="Search services" placeholder="Search services…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-[#142C46] outline-none transition placeholder:text-slate-400 focus:border-[#607D98] focus:ring-2 focus:ring-[#607D98]/20" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear service search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
              </div>
            </div>}

            {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(item => <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="aspect-[5/3] animate-pulse bg-slate-100" /><div className="space-y-3 p-5"><div className="h-3 w-24 animate-pulse rounded bg-slate-100" /><div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" /><div className="h-12 animate-pulse rounded bg-slate-100" /></div></div>)}</div>
              : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center sm:p-12"><p className="font-display text-xl font-semibold text-[#142C46]">We couldn’t load the service catalogue</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Please try again shortly, or contact our team for assistance with your project.</p><Link href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#142C46] px-5 py-3 text-sm font-semibold text-white hover:bg-[#203F60]">Contact our team <ArrowRight className="h-4 w-4" /></Link></div>
              : services.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2F5] text-[#607D98]"><Wrench className="h-6 w-6" /></div><h3 className="mt-4 font-display text-xl font-semibold text-[#142C46]">Service information is being updated</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Contact our team to discuss your flooring or waterproofing requirements.</p><Link href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#142C46] px-5 py-3 text-sm font-semibold text-white hover:bg-[#203F60]">Contact the team <ArrowRight className="h-4 w-4" /></Link></div>
              : filteredServices.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><p className="font-semibold text-[#142C46]">No services match that search</p><p className="mt-2 text-sm text-slate-500">Try another term or clear your filters.</p><button type="button" onClick={() => { setQuery(''); setCategory('All services'); }} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#142C46] hover:bg-slate-50">Clear filters <X className="h-4 w-4" /></button></div>
              : <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">{filteredServices.map(service => {
                const features = (service.features || []).filter(Boolean).slice(0, 3);
                const image = withFallback(service.image_url, getServicePlaceholder(service.slug || service.name));
                return <article key={service.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(20,44,70,.035)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(20,44,70,.10)]">
                  <Link href={service.slug ? `/service/${service.slug}` : '/services'} aria-label={`View ${service.name} service details`} className="relative block overflow-hidden bg-[#E8EDF1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#607D98]">
                    <div className="aspect-[5/3] overflow-hidden"><img src={image} alt={service.name} loading="lazy" className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = getServicePlaceholder(service.slug || service.name); }} /></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10283F]/65 via-transparent to-transparent opacity-80" />
                    <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-[#10283F]/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-white backdrop-blur-sm">{serviceCategory(service.name)}</span>
                    <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-sm transition group-hover:bg-white group-hover:text-[#142C46]"><ArrowRight className="h-4 w-4" /></span>
                  </Link>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#8A7956]">Service specification</p>
                    <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-[#142C46] sm:text-[1.35rem]">{service.name}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{service.short_description || service.description || serviceIntro(service.name)}</p>
                    {features.length > 0 && <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">{features.map(feature => <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#607D98]" /><span>{feature}</span></li>)}</ul>}
                    <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
                      {service.slug && <Link href={`/service/${service.slug}`} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#142C46] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#203F60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#607D98] focus-visible:ring-offset-2">View service <ArrowRight className="h-3.5 w-3.5" /></Link>}
                      <Link href="/quotation" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-[#142C46] transition hover:border-[#D8C9A7] hover:bg-[#FAF8F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#607D98] focus-visible:ring-offset-2">Request quote</Link>
                    </div>
                  </div>
                </article>;
              })}</div>}
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8A7956]">A clear process</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#142C46] sm:text-4xl">From assessment to handover</h2><p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">A considered workflow helps align the scope, preparation and application with the requirements of your site.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
              { step: '01', title: 'Site assessment', description: 'Discuss the site, intended use, visible issues and project priorities.', icon: FileCheck2 },
              { step: '02', title: 'Scope & quotation', description: 'Review the proposed scope, system options, materials and work sequence.', icon: Wrench },
              { step: '03', title: 'Surface preparation', description: 'Prepare the substrate and address relevant surface conditions before application.', icon: Layers3 },
              { step: '04', title: 'Review & handover', description: 'Review the completed work and clarify care, maintenance and applicable warranty terms.', icon: CheckCircle2 },
            ].map(item => { const Icon = item.icon; return <div key={item.step} className="relative rounded-2xl border border-slate-200 bg-[#FAFBFC] p-5 sm:p-6"><div className="flex items-center justify-between"><span className="font-display text-3xl font-semibold tracking-tight text-[#B8A780]">{item.step}</span><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F4] text-[#34536E]"><Icon className="h-5 w-5" /></span></div><h3 className="mt-5 font-display text-lg font-semibold text-[#142C46]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p></div>; })}</div>
          </div>
        </section>

        <section className="bg-[#10283F] py-14 text-white sm:py-16 lg:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D8C9A7]">Let's plan your project</p><h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Not sure which system is right for your site?</h2><p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">Tell us what you are working on and where the challenge is. Our team can help you take the next step toward a suitable scope and quotation.</p></div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:shrink-0"><Link href="/quotation" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D8C9A7] px-6 py-3 text-sm font-bold text-[#142C46] transition hover:bg-[#E7DCC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#10283F]">Request a quote <ArrowRight className="h-4 w-4" /></Link><Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Talk to our team</Link></div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}
