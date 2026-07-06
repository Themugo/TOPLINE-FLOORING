import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';

export default function Services() {
  const [services, setServices] = useState<(Product & { category_name?: string })[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
    loadHeroSlides();
  }, []);

  const loadServices = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('products')
      .select('*, categories!left(name)')
      .eq('product_type', 'service')
      .eq('is_active', true)
      .order('display_order')
      .order('name');

    if (data) {
      setServices(data.map((p: any) => ({ ...p, category_name: p.categories?.name || null })));
    }
    setLoading(false);
  };

  const loadHeroSlides = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (data) {
      setHeroSlides(data);
    }
  };

  const getServiceImage = (service: Product & { category_name?: string }, index: number) => {
    if (service.image_url) return service.image_url;
    // Use hero slide images as fallback
    if (heroSlides.length > 0) {
      return heroSlides[index % heroSlides.length].image_url;
    }
    return 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80';
  };

  const formatKES = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount);

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Services" }]} />
      <section className="bg-gradient-to-br from-primary/90 to-primary py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Our Services</h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Professional flooring and waterproofing solutions for industrial, commercial, and residential projects across Kenya and East Africa.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No services available yet.</p>
              <Link href="/contact" className="text-primary hover:underline mt-2 inline-block">Contact us for more information</Link>
            </div>
          ) : (
            <div className="space-y-16 lg:space-y-24">
              {services.map((service, index) => {
                const features = service.description?.split('\n').filter(Boolean) || [];
                return (
                  <div key={service.id} className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center`}>
                    <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                      <img
                        src={getServiceImage(service, index)}
                        alt={service.name}
                        className="w-full rounded-sm shadow-lg aspect-video object-cover"
                      />
                    </div>
                    <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                      <div className="flex items-center gap-2 mb-2">
                        {service.category_name && (
                          <span className="text-[10px] uppercase tracking-widest text-primary font-sans font-medium">
                            {service.category_name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground font-sans">{formatKES(service.price)}</span>
                      </div>
                      <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">{service.name}</h2>
                      <p className="text-muted-foreground mb-6 leading-relaxed">{service.description || 'No description available.'}</p>
                      {features.length > 0 && (
                        <ul className="space-y-2 mb-6">
                          {features.slice(0, 5).map((feature) => (
                            <li key={feature} className="flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/services/${service.slug}`}
                          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                          Learn More <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/quotation?service=${encodeURIComponent(service.name)}`}
                          className="inline-flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-muted transition-colors"
                        >
                          Request Quote
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Process */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">Our Process</h2>
            <p className="text-muted-foreground text-base">From initial consultation to project completion, we ensure quality at every step.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Consultation', description: 'We assess your needs, inspect the site, and understand your requirements.' },
              { step: '02', title: 'Quotation', description: 'Receive a detailed quote with materials, timeline, and pricing.' },
              { step: '03', title: 'Execution', description: 'Our certified team executes the project with precision and care.' },
              { step: '04', title: 'Handover', description: 'Final inspection, documentation, and warranty handover.' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-display font-bold text-primary/10 mb-4">{item.step}</div>
                <h3 className="font-semibold text-foreground text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-primary/90 to-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Ready to Transform Your Space?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
            Get in touch for a free consultation. Our experts are ready to help you choose the right solution.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/quotation" className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-sm font-medium hover:bg-primary-50 transition-colors">Get Free Quote</Link>
            <Link href="/contact" className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-sm font-medium hover:bg-white/10 transition-colors">Contact Us</Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
