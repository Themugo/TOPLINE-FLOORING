import { Link } from 'wouter';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export default function Services() {
  const services = [
    {
      title: 'Industrial Flooring',
      description: 'High-performance flooring systems designed for factories, warehouses, and manufacturing facilities. Our industrial solutions handle heavy loads, chemical exposure, and constant traffic.',
      features: [
        'Epoxy flooring systems',
        'Polyurethane coatings',
        'Anti-static flooring',
        'Chemical-resistant surfaces',
        'Heavy-duty load capacity',
      ],
      image: 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Waterproofing Systems',
      description: 'Complete waterproofing solutions for new construction and remedial work. We protect structures from water damage, leaks, and moisture intrusion.',
      features: [
        'Roof waterproofing',
        'Basement waterproofing',
        'Bathroom and wet areas',
        'Water tank lining',
        'Foundation protection',
      ],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Commercial Flooring',
      description: 'Durable, attractive flooring solutions for offices, retail spaces, hospitals, and educational institutions. Combine aesthetics with performance.',
      features: [
        'Office and retail floors',
        'Healthcare facilities',
        'Educational institutions',
        'Hospitality spaces',
        'Decorative epoxy systems',
      ],
      image: 'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Concrete Solutions',
      description: 'Protective treatments and repair systems for concrete surfaces. Extend the life of your concrete structures.',
      features: [
        'Concrete sealers',
        'Surface hardeners',
        'Crack repair',
        'Joint sealing',
        'Surface preparation',
      ],
      image: 'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?auto=format&fit=crop&w=800&q=80',
    },
  ];

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Services" }]} />
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
            Our Services
          </h1>
          <p className="text-primary-100 text-lg max-w-2xl mx-auto">
            Professional flooring and waterproofing solutions for industrial, commercial,
            and residential projects across Kenya and East Africa.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16 lg:space-y-24">
            {services.map((service, index) => (
              <div
                key={service.title}
                className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full rounded-2xl shadow-lg"
                  />
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <h2 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                    {service.title}
                  </h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  <ul className="space-y-3 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
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
        </div>
      </section>

      {/* Process */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
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
                <div className="text-6xl font-display font-bold text-primary-100 mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-primary-700 to-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Space?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Get in touch for a free consultation. Our experts are ready to help you
            choose the right solution for your project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/quotation" className="btn-accent">
              Get Free Quote
            </Link>
            <Link href="/contact" className="btn bg-white text-primary-700 hover:bg-primary-50">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
