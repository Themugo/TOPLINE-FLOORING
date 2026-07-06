import { useParams, Link } from 'wouter';
import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle, ImageIcon, Package, Building2 } from 'lucide-react';
import type { Product, Project } from '@/lib/types';

export default function ServiceDetail() {
  const { slug } = useParams();
  const [service, setService] = useState<Product | null>(null);
  const [relatedMaterials, setRelatedMaterials] = useState<Product[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    loadService();
  }, [slug]);

  const loadService = async () => {
    setLoading(true);
    const { data: svc } = await supabase
      .from('products')
      .select('*, categories!left(name)')
      .eq('slug', slug)
      .eq('product_type', 'service')
      .single();

    if (svc) {
      setService({
        ...svc,
        category_name: (svc as any).categories?.name || null,
      } as Product);

      // Load related materials
      const { data: mats } = await supabase
        .from('service_materials')
        .select('material_id')
        .eq('service_id', svc.id);

      if (mats && mats.length > 0) {
        const ids = mats.map(m => m.material_id);
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .in('id', ids)
          .eq('is_active', true);
        setRelatedMaterials(products || []);
      }

      // Load related projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .or(`service_type.ilike.%${svc.name}%,category.ilike.%${svc.name}%`)
        .limit(4);
      setRelatedProjects(projects || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading service details...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!service) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Service Not Found</h1>
            <p className="text-muted-foreground mb-6">The service you're looking for doesn't exist or has been removed.</p>
            <Link href="/services" className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowRight className="h-4 w-4" /> View All Services
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const features = service.description?.split('\n').filter(Boolean) || [];

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: 'Services', href: '/services' }, { label: service.name }]} />

      {/* Hero */}
      <section className="relative h-[40vh] lg:h-[50vh] overflow-hidden">
        <img
          src={service.image_url || 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=1920&q=80'}
          alt={service.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-16">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-display text-3xl lg:text-5xl font-bold text-white mb-3 drop-shadow-lg">
              {service.name}
            </h1>
            {service.category_name && (
              <span className="inline-block bg-primary/90 text-white text-xs uppercase tracking-widest px-3 py-1 rounded-sm font-sans">
                {service.category_name}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">Overview</h2>
                <p className="text-muted-foreground leading-relaxed">{service.description || 'No description available.'}</p>
              </div>

              {features.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">Key Features & Benefits</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3 bg-muted/30 p-4 rounded-sm">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {service.gallery_urls && service.gallery_urls.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">Gallery</h2>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {service.gallery_urls.map((url, i) => (
                      <div key={i} className="aspect-video rounded-sm overflow-hidden bg-muted">
                        <img
                          src={url}
                          alt={`${service.name} gallery ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Projects */}
              {relatedProjects.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">Related Projects</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {relatedProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/portfolio?project=${p.id}`}
                        className="group block bg-card border border-border rounded-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="p-5">
                          <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                            {p.title}
                          </h3>
                          {p.location && (
                            <p className="text-xs text-muted-foreground mt-1">{p.location}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA */}
              <div className="bg-card border border-border rounded-sm p-6">
                <h3 className="font-display font-semibold text-foreground mb-2">Ready to Get Started?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Contact us for a free consultation and quotation for this service.
                </p>
                <Link
                  href={`/quotation?service=${encodeURIComponent(service.name)}`}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Request Quotation <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Related Materials */}
              {relatedMaterials.length > 0 && (
                <div className="bg-card border border-border rounded-sm p-6">
                  <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> Related Materials
                  </h3>
                  <div className="space-y-2">
                    {relatedMaterials.map((m) => (
                      <Link
                        key={m.id}
                        href={`/shop/${m.id}`}
                        className="flex items-center gap-3 p-2 rounded-sm hover:bg-muted transition-colors text-sm"
                      >
                        <span className="text-primary font-medium">{m.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Contact */}
              <div className="bg-card border border-border rounded-sm p-6">
                <h3 className="font-display font-semibold text-foreground mb-3">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Call us for immediate assistance.
                </p>
                <a
                  href="tel:0720859737"
                  className="flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                >
                  <Building2 className="h-4 w-4" /> 0720 859 737
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            Transform Your Space Today
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
            Get in touch for a free consultation. Our experts are ready to help you choose the right solution.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={`/quotation?service=${encodeURIComponent(service.name)}`}
              className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-sm font-medium hover:bg-primary-50 transition-colors"
            >
              Get Free Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-sm font-medium hover:bg-white/10 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
