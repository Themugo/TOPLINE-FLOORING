import { Link } from 'wouter';
import { ArrowRight, CheckCircle, Loader2, Wrench } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';
import { useSeoMeta } from '@/hooks/use-seo';
import { useServices } from '@/hooks/use-data';

export default function Services() {
  useSeoMeta('services');
  const { services, loading } = useServices();

  const defaultFeatures: Record<string, string[]> = {
    'industrial-flooring': [
      'Epoxy flooring systems',
      'Polyurethane coatings',
      'Anti-static flooring',
      'Chemical-resistant surfaces',
      'Heavy-duty load capacity',
    ],
    'waterproofing': [
      'Roof waterproofing',
      'Basement waterproofing',
      'Bathroom and wet areas',
      'Water tank lining',
      'Foundation protection',
    ],
    'commercial-flooring': [
      'Office and retail floors',
      'Healthcare facilities',
      'Educational institutions',
      'Hospitality spaces',
      'Decorative epoxy systems',
    ],
    'residential-solutions': [
      'Garage epoxy flooring',
      'Bathroom waterproofing',
      'Balcony and terrace coating',
      'Driveway sealing',
      'Pool deck waterproofing',
    ],
  };

  return (
    <CustomerLayout>
      {/* Hero */}
      <section className="bg-gray-50 border-b border-gray-200 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="section-label">What We Do</span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-primary-600 mb-4 mt-2">
            Our Services
          </h1>
          <p className="text-navy-600 text-lg max-w-2xl mx-auto">
            Professional flooring and waterproofing solutions for industrial, commercial,
            and residential projects across Kenya and East Africa.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-display text-xl font-semibold text-navy-900 mb-2">No Services Available</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Our services are currently being updated. Please check back soon or contact us for more information.
              </p>
              <Link href="/contact" className="btn-primary inline-flex items-center gap-2 mt-6">
                Contact Us
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-16 lg:space-y-24">
              {services.map((service, index) => (
                <div
                  key={service.id}
                  className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                    index % 2 === 1 ? '' : ''
                  }`}
                >
                  <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                    <img
                      src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                      alt={service.name}
                      className="w-full rounded-2xl shadow-lg"
                    />
                  </div>
                  <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                    <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy-900 mb-4">
                      {service.name}
                    </h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {service.short_description || service.description}
                    </p>
                    <ul className="space-y-3 mb-6">
                      {(service.features || defaultFeatures[service.slug] || []).map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/quotation"
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      Request Quote
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Process */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-navy-900 mb-4">
              Our Process
            </h2>
            <p className="text-gray-600">
              From initial consultation to project completion, we ensure quality at every step.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Consultation',
                description: 'We assess your needs, inspect the site, and understand your requirements.',
              },
              {
                step: '02',
                title: 'Quotation',
                description: 'Receive a detailed quote with materials, timeline, and pricing.',
              },
              {
                step: '03',
                title: 'Execution',
                description: 'Our certified team executes the project with precision and care.',
              },
              {
                step: '04',
                title: 'Handover',
                description: 'Final inspection, documentation, and warranty handover.',
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-display font-bold text-primary-200 mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-navy-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-navy-900 mb-4">
            Ready to Transform Your Space?
          </h2>
          <p className="text-navy-500 text-lg mb-8 max-w-2xl mx-auto">
            Get in touch for a free consultation. Our experts are ready to help you
            choose the right solution for your project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/quotation" className="btn-primary">
              Get Free Quote
            </Link>
            <Link href="/contact" className="btn bg-white border border-gray-200 text-navy-700 hover:bg-gray-100">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
