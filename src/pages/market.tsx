import { useState, useEffect } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useSeoMeta } from "@/hooks/use-seo";
import { supabase } from "@/lib/supabase";
import { Building2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from 'wouter';

interface Partner {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}



export default function Market() {
  useSeoMeta('market', null, { breadcrumbs: [{ label: "Partners" }] });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (data) setPartners(data as Partner[]);
    setLoading(false);
  };

  const getPartnerIcon = () => Building2;

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Partners" }]} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/90 to-primary py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Our Certified Partners</h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            We work with leading manufacturers and suppliers to deliver the highest quality flooring and waterproofing solutions.
          </p>
        </div>
      </section>

      {/* Partners Grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            </div>
          ) : partners.length === 0 ? (
            <div className="max-w-3xl mx-auto text-center py-12">
              <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="section-heading">Trusted systems. Professional delivery.</h2>
              <p className="section-subtitle mx-auto">
                Our team selects flooring, coating and waterproofing systems based on the demands of each project rather than relying on a fixed product list.
              </p>
              <Link href="/quotation" className="btn-primary mt-7">
                Discuss Your Project <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {partners.map((partner) => {
                const Icon = getPartnerIcon();
                return (
                  <div key={partner.id} className="group bg-card border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 rounded-sm p-8 flex flex-col items-center text-center">
                    {/* Logo/Icon */}
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      {partner.logo_url ? (
                        <img
                          src={partner.logo_url}
                          alt={partner.name}
                          loading="lazy"
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <Icon className="h-10 w-10 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="font-display font-semibold text-lg text-foreground mb-2">{partner.name}</h3>

                    {/* Description */}
                    {partner.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {partner.description}
                      </p>
                    )}

                    {/* Website Link */}
                    {partner.website && (
                      <a
                        href={partner.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 text-primary text-sm font-medium hover:underline"
                      >
                        Visit Website
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </CustomerLayout>
  );
}
