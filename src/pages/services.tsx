import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, Loader2, Wrench, Shield, Award, Clock, FileCheck } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';
import { useSeoMeta } from '@/hooks/use-seo';
import { useServices } from '@/hooks/use-data';
import { useImagePreloader } from '@/hooks/use-image-preloader';
import { useMemo } from 'react';

export default function Services() {
  useSeoMeta('services', null, { breadcrumbs: [{ label: 'Services' }] });
  const { services, loading } = useServices();

  useImagePreloader(
    useMemo(() => services.map(s => s.image_url || getServicePlaceholder(s.slug || s.name)), [services])
  );

  const defaultFeatures: Record<string, string[]> = {
    'industrial-epoxy-flooring': [
      'Heavy-duty chemical & impact resistance',
      'Seamless, hygienic anti-microbial finish',
      'Anti-slip texture options for wet processing',
      'High mechanical abrasion endurance',
      'Fast-curing industrial grade epoxy formulas',
    ],
    'roof-basement-waterproofing': [
      'Elastomeric liquid polyurethane membrane',
      'High thermal movement expansion tolerance',
      'Zero-permeability crystalline foundation coating',
      'UV-resistant puddle-proof roof sealing',
      '10-Year leak-free structural warranty',
    ],
    'concrete-polishing-dustproofing': [
      'Multi-stage diamond pad mechanical grinding',
      'Lithium silicate hardener densification',
      'Eliminates concrete surface dusting permanently',
      'High-gloss light reflectivity reducing energy costs',
      'Ultra low-maintenance commercial finish',
    ],
    'industrial-flooring': [
      'Epoxy flooring systems & PU screeds',
      'Polyurethane anti-microbial coatings',
      'Anti-static ESD safety flooring',
      'Chemical-resistant battery room surfaces',
      'Heavy forklifts load-bearing capacity',
    ],
    'waterproofing': [
      'Flat roof & inverted deck waterproofing',
      'Retaining wall & basement tanking',
      'Bathroom, balcony, and wet area sealing',
      'Concrete water tank potable lining',
      'Structural movement joint waterproofing',
    ],
  };

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: 'Services' }]} />
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50 border-b border-gray-200/80 py-16 lg:py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block px-3.5 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-xs font-semibold uppercase tracking-wider mb-3">
            Technical Engineering Services
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-950 tracking-tight mb-4">
            Specialized Flooring & Waterproofing
          </h1>
          <p className="text-navy-600 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Professional heavy-duty flooring applications, liquid polyurethane membranes, and diamond concrete polishing for commercial, industrial, and residential projects across East Africa.
          </p>
          
          {/* Trust Highlights */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs sm:text-sm font-semibold text-navy-800">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-500" />
              <span>Certified Installers</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary-500" />
              <span>10-Year Warranty</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" />
              <span>On-Site Site Audits</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Listing */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-sm">Loading specialized services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="font-display text-xl font-bold text-navy-950 mb-2">No Services Listed</h3>
              <p className="text-gray-500 max-w-md mx-auto text-sm mb-6">
                Our technical service offerings are being updated. Please contact our engineering department directly for immediate assistance.
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all shadow-sm">
                <span>Contact Engineering Team</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-16 lg:space-y-24">
              {services.map((service, index) => {
                const featuresList = service.features?.length
                  ? service.features
                  : defaultFeatures[service.slug] || defaultFeatures['industrial-flooring'] || [];

                return (
                  <div
                    key={service.id}
                    className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* Image Column */}
                    <div className={`lg:col-span-5 relative group overflow-hidden rounded-2xl ${
                      index % 2 === 1 ? 'lg:order-2' : ''
                    }`}>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-navy-950 rounded-2xl relative">
                        <img
                          src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                          alt={service.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = getServicePlaceholder(service.slug || service.name);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent" />
                        <span className="absolute top-4 left-4 px-3 py-1 bg-navy-950/80 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/20 shadow-xs">
                          {service.name.includes('Waterproofing') ? 'Waterproofing System' : service.name.includes('Polishing') ? 'Concrete Surface Treatment' : 'Epoxy & Flooring'}
                        </span>
                      </div>
                    </div>

                    {/* Text Column */}
                    <div className={`lg:col-span-7 flex flex-col justify-between ${
                      index % 2 === 1 ? 'lg:order-1' : ''
                    }`}>
                      <div>
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 mb-2">
                          <span className="w-2 h-2 rounded-full bg-primary-500" />
                          <span>Service Specification</span>
                        </div>
                        <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy-950 tracking-tight mb-3">
                          {service.name}
                        </h2>
                        <p className="text-gray-600 text-sm lg:text-base leading-relaxed mb-6">
                          {service.description || service.short_description}
                        </p>

                        <div className="mb-8">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 mb-3">Key Performance Features:</h4>
                          <div className="grid sm:grid-cols-2 gap-2.5">
                            {featuresList.map((feature) => (
                              <div key={feature} className="flex items-start gap-2.5 text-xs sm:text-sm text-navy-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                        <Link
                          href="/quotation"
                          className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-2xs hover:shadow-sm inline-flex items-center gap-2"
                        >
                          <span>Request Quote</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        {service.slug && (
                          <Link
                            href={`/service/${service.slug}`}
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-navy-800 rounded-xl font-bold text-xs sm:text-sm transition-colors inline-flex items-center gap-1.5"
                          >
                            <span>Technical Details</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Our Process Workflow */}
      <section className="py-16 lg:py-24 bg-gray-50/80 border-y border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-xs font-semibold uppercase tracking-wider mb-2">
              Execution Methodology
            </span>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-navy-950 tracking-tight mb-3">
              Our Certified Process
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              From site diagnostic and moisture testing to surface profiling and final application, we adhere strictly to international flooring standards.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Site Inspection & Testing',
                description: 'We conduct moisture readings, concrete strength testing, and surface contamination checks to specify exact primers.',
                icon: FileCheck,
              },
              {
                step: '02',
                title: 'Engineering Quotation',
                description: 'Clear, transparent breakdown of material specifications, layer thicknesses, work schedule, and exact pricing.',
                icon: Wrench,
              },
              {
                step: '03',
                title: 'Shot-Blasting & Application',
                description: 'Mechanical surface preparation followed by dustless application by certified applicators using Sika & Mapei products.',
                icon: Shield,
              },
              {
                step: '04',
                title: 'Quality Check & Handover',
                description: 'Comprehensive dry-film thickness audit, adhesion testing, and issuing of written 10-Year structural warranty certificate.',
                icon: Award,
              },
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <div key={item.step} className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs relative hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl font-display font-extrabold text-primary-500/20">{item.step}</span>
                      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                        <IconComp className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-navy-950 text-base mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#4593da_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            Have a Specific Flooring or Leak Problem?
          </h2>
          <p className="text-navy-100/90 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Our experienced sales engineers are ready to inspect your site, perform moisture testing, and recommend the exact chemical system for your budget.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/quotation" className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/25 transition-all">
              Request On-Site Inspection
            </Link>
            <Link href="/contact" className="w-full sm:w-auto bg-navy-800/80 hover:bg-navy-800 border border-navy-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all">
              Talk To Engineers
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}

