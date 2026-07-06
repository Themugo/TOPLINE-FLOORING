import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useListProducts } from "@/lib/api";
import { usePageVisit } from "@/hooks/use-page-visit";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import HeroSlider from "@/components/home/HeroSlider";
import { useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/utils";
import { ArrowRight, Package, Phone, Shield, Zap, Users, Star, Lightbulb, TrendingUp, MessageCircle, Award, Clock, ThumbsUp, Wrench, HeartHandshake, BarChart3, Building2, CheckCircle2, ChevronDown } from "lucide-react";
import type { HomepageSection, Testimonial, Partner, Project, ProjectImage } from "@/lib/types";

const FALLBACK_SLIDES = [
  { id: '1', title: 'APP Bituminous Membrane Waterproofing', subtitle: 'Building Trust and Protection, One Surface at a Time', image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80', button_text: 'View Services', button_link: '/shop?type=service' },
  { id: '2', title: 'Epoxy Flooring Solutions', subtitle: 'Durable, decorative flooring for industries, warehouses and commercial spaces', image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1400&q=80', button_text: 'Learn More', button_link: '/shop?type=service' },
  { id: '3', title: 'Basement & Foundation Waterproofing', subtitle: 'Complete below-grade protection for lasting structural integrity', image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80', button_text: 'Get Quote', button_link: '/quotation' },
  { id: '4', title: 'Roof Coating & Repair', subtitle: 'Restore and protect your roof with advanced coating systems', image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80', button_text: 'Contact Us', button_link: '/contact' },
];

const SERVICE_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
];

const VALUES_1 = [
  { icon: Shield, label: "Durable", color: "bg-green-600", iconColor: "text-white" },
  { icon: Zap, label: "Cost-Effective", color: "bg-sky-500", iconColor: "text-white" },
  { icon: Users, label: "Professional", color: "bg-slate-800", iconColor: "text-white" },
];
const VALUES_2 = [
  { icon: Star, label: "Integrity", color: "bg-green-600", iconColor: "text-white" },
  { icon: Lightbulb, label: "Innovation", color: "bg-sky-500", iconColor: "text-white" },
  { icon: TrendingUp, label: "Excellence", color: "bg-slate-800", iconColor: "text-white" },
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Shield, Award, Clock, ThumbsUp, Wrench, HeartHandshake,
  BarChart3, Building2, Users, CheckCircle2, Zap, Star, Lightbulb, TrendingUp,
};

const DEFAULT_REASONS = [
  { icon: "Shield", title: "Certified Quality", description: "All our work meets rigorous industry standards for safety, durability, and performance." },
  { icon: "Award", title: "10+ Years Experience", description: "Over a decade of delivering professional flooring and waterproofing solutions across Kenya." },
  { icon: "ThumbsUp", title: "100% Satisfaction", description: "We guarantee your satisfaction with every project, big or small." },
  { icon: "Wrench", title: "Expert Craftsmanship", description: "Our skilled technicians use advanced techniques and premium materials." },
  { icon: "HeartHandshake", title: "Reliable Partnerships", description: "We build lasting relationships through trust, transparency, and results." },
  { icon: "Clock", title: "On-Time Delivery", description: "We respect your timeline and deliver every project on schedule." },
];

const DEFAULT_STATS = [
  { label: "Years Experience", value: 10, suffix: "+" },
  { label: "Projects Completed", value: 500, suffix: "+" },
  { label: "Happy Clients", value: 300, suffix: "+" },
  { label: "Partners", value: 15, suffix: "+" },
];

const DEFAULT_FAQS = [
  { question: "What types of waterproofing do you offer?", answer: "We provide a full range of waterproofing solutions including APP/SBS bituminous membranes, liquid-applied polyurethane, cementitious coatings, basement tanking, roof coatings, and injection grouting for structural cracks." },
  { question: "What flooring services are available?", answer: "Our flooring solutions include epoxy coatings, polyurethane floor systems, self-leveling screeds, industrial floor hardeners, vinyl flooring, and polished concrete for commercial and industrial applications." },
  { question: "Do you offer free quotations?", answer: "Yes, we provide free site visits and quotations for all projects. Contact us to schedule an assessment, and our team will prepare a detailed proposal tailored to your needs." },
  { question: "What areas do you serve?", answer: "We serve clients across Kenya and the East African region, including Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, and surrounding areas." },
  { question: "How long does a typical project take?", answer: "Project timelines vary based on scope and complexity. Minor waterproofing repairs can be completed in a day, while large-scale industrial flooring may take several weeks. We provide a clear timeline with every quotation." },
  { question: "Do you supply materials for DIY projects?", answer: "Yes, we stock premium waterproofing and flooring materials from trusted global brands. Visit our Materials Shop to purchase supplies for your project." },
];

export default function Home() {
  usePageVisit("/");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const { data: featuredServices, isLoading: featLoading } = useListProducts({ featured: true, productType: "service" });
  const { data: featuredMaterials, isLoading: matLoading } = useListProducts({ featured: true, productType: "material" });
  const { addToCart } = useCart();

  // Auto-generate hero slides from featured products
  const heroSlides = useMemo(() => {
    const featured = [
      ...(featuredServices || []),
      ...(featuredMaterials || []),
    ];
    if (featured.length === 0) {
      return FALLBACK_SLIDES;
    }
    return featured.slice(0, 6).map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: p.description,
      image_url: p.image_url || SERVICE_FALLBACK_IMAGES[0],
      button_text: 'Learn More',
      button_link: `/shop/${p.id}`,
    }));
  }, [featuredServices, featuredMaterials]);

  // Fetch testimonials, partners, homepage sections, and featured projects
  useEffect(() => {
    if (!supabase) return;

    const fetchContent = async () => {
      const client = supabase;
      if (!client) return;

      const [testimonialsRes, partnersRes, sectionsRes, projectsRes] = await Promise.all([
        client.from('testimonials').select('*').eq('is_active', true).order('sort_order'),
        client.from('partners').select('*').eq('is_active', true).order('sort_order'),
        client.from('homepage_sections').select('*').order('display_order'),
        client.from('projects').select('*, project_images(*)').eq('featured', true).eq('is_active', true).order('display_order'),
      ]);

      if (testimonialsRes.data) setTestimonials(testimonialsRes.data as any);
      if (partnersRes.data) setPartners(partnersRes.data as any);
      if (sectionsRes.data) setHomepageSections(sectionsRes.data as any);
      if (projectsRes.data) setProjects(projectsRes.data as any);
    };

    fetchContent();
  }, [supabase]);

  const isSectionVisible = (sectionType: string) => {
    const section = homepageSections.find(s => s.section_type === sectionType);
    return section ? section.is_active : true; // Default to visible if not configured
  };

  return (
    <CustomerLayout>
      {isSectionVisible('hero') && (() => {
        const heroSec = homepageSections.find(s => s.section_type === 'hero');
        const overlayOpacity = heroSec?.content?.overlay_opacity ?? 60;
        return (
          <HeroSlider slides={heroSlides} overlayOpacity={overlayOpacity} />
        );
      })()}

      {/* Services Section */}
      {isSectionVisible('services') && (
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary uppercase tracking-wide mb-3">
              Our Services
            </h2>
            <p className="text-muted-foreground text-base md:text-lg font-sans max-w-2xl mx-auto">
              Professional flooring and waterproofing solutions for industrial, commercial, and residential projects across Kenya and East Africa.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-primary/30" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              <div className="h-px w-12 bg-primary/30" />
            </div>
          </div>

          {featLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredServices?.slice(0, 6).map((product, idx) => (
                <div key={product.id} className="flex flex-col items-center text-center group bg-white rounded-sm border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    <img
                      src={product.image_url || SERVICE_FALLBACK_IMAGES[idx % SERVICE_FALLBACK_IMAGES.length]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="font-display text-lg text-white font-semibold">{product.name}</span>
                    </div>
                  </div>
                  <div className="p-5 w-full">
                    {product.description && (
                      <p className="text-muted-foreground text-sm font-light leading-relaxed mb-4 line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-primary">{formatKES(product.price)}<span className="text-xs text-muted-foreground ml-1">/{product.unit || 'service'}</span></span>
                      <Link href={`/shop/${product.id}`}>
                        <Button size="sm" className="rounded-sm text-xs">Learn More</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <Link href="/shop?type=service">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-sm font-sans uppercase tracking-widest text-xs h-11 px-10">
                View All Services <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* Who We Are */}
      {isSectionVisible('about') && (() => {
        const aboutSec = homepageSections.find(s => s.section_type === 'about');
        const aboutTitle = aboutSec?.title || 'Who We Are';
        const aboutText = aboutSec?.subtitle || 'For over 10 years, Topline Flooring and Waterproofing has been the trusted partner for professional flooring and waterproofing solutions across Kenya and East Africa. We deliver durable, cost-effective services that enhance the lifespan and performance of every structure.';
        return (
        <section className="py-16 md:py-24 bg-muted">
          <div className="container mx-auto px-6 md:px-12 max-w-4xl">
            <ValuesRow values={VALUES_1} banner="DELIVERY" />

            <div className="text-center mt-12 mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-primary uppercase tracking-wide mb-4">
                {aboutTitle}
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed font-sans max-w-xl mx-auto">
                {aboutText}
              </p>
            </div>

            <ValuesRow values={VALUES_2} banner="VALUES" />
          </div>
        </section>
        );
      })()}

      {/* Why Choose Us */}
      {isSectionVisible('why-choose-us') && (() => {
        const sec = homepageSections.find(s => s.section_type === 'why-choose-us');
        const title = sec?.title || 'Why Choose Us';
        const subtitle = sec?.subtitle || 'What sets Topline Flooring & Waterproofing apart from the rest';
        const reasons = (sec?.content?.reasons || DEFAULT_REASONS) as { icon: string; title: string; description: string }[];
        return (
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary uppercase tracking-wide mb-3">
                {title}
              </h2>
              <p className="text-muted-foreground text-base md:text-lg font-sans max-w-2xl mx-auto">
                {subtitle}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-primary/30" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                <div className="h-px w-12 bg-primary/30" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {reasons.map((reason, i) => {
                const IconComp = ICON_MAP[reason.icon] || Shield;
                return (
                  <div key={i} className="flex gap-4 p-6 rounded-sm border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <IconComp className="h-6 w-6 text-primary group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground mb-1">{reason.title}</h3>
                      <p className="text-sm text-muted-foreground font-light leading-relaxed">{reason.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        );
      })()}

      {/* Statistics */}
      {isSectionVisible('statistics') && (() => {
        const sec = homepageSections.find(s => s.section_type === 'statistics');
        const title = sec?.title || 'By the Numbers';
        const subtitle = sec?.subtitle || 'Our track record speaks for itself';
        const stats = (sec?.content?.stats || DEFAULT_STATS) as { label: string; value: number; suffix: string }[];
        return (
        <section className="py-16 md:py-24 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M80 0L0 0 0 80' fill='none' stroke='white' stroke-width='0.6'/%3E%3C/svg%3E\")" }} />
          <div className="relative container mx-auto px-6 md:px-12">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground uppercase tracking-wide mb-3">
                {title}
              </h2>
              <p className="text-primary-foreground/70 text-base md:text-lg font-sans max-w-2xl mx-auto">
                {subtitle}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-white/30" />
                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                <div className="h-px w-12 bg-white/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 max-w-4xl mx-auto">
              {stats.map((stat, i) => {
                const statIcons = [Award, BarChart3, Users, Building2];
                const StatIcon = statIcons[i] || BarChart3;
                return (
                  <div key={i} className="text-center">
                    <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                      <StatIcon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-1">
                      {stat.value}{stat.suffix}
                    </div>
                    <p className="text-primary-foreground/80 text-sm font-sans font-light uppercase tracking-wider">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        );
      })()}

      {/* Materials Section */}
      {isSectionVisible('products') && (
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary uppercase tracking-widest mb-3">
              Materials Shop
            </h2>
            <p className="text-muted-foreground text-sm md:text-base font-sans max-w-2xl mx-auto">
              Premium waterproofing and flooring materials sourced from trusted global brands. Delivered to your project site across Kenya.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-primary/30" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              <div className="h-px w-12 bg-primary/30" />
            </div>
          </div>

          {matLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-sm" />)}
            </div>
          ) : featuredMaterials && featuredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredMaterials.slice(0, 8).map((product, idx) => (
                <div key={product.id} className="group bg-card border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 rounded-sm overflow-hidden flex flex-col">
                  <div className="h-40 bg-muted flex items-center justify-center relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <img
                        src={`https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=60&sig=${idx}`}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 text-[9px] uppercase tracking-widest font-sans border rounded-sm bg-amber-50 text-amber-700 border-amber-200">
                      Material
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    {product.category_name && (
                      <p className="text-[10px] text-primary uppercase tracking-[0.15em] font-sans font-medium mb-1">{product.category_name}</p>
                    )}
                    <h3 className="font-display text-sm font-semibold text-foreground leading-tight mb-2">{product.name}</h3>
                    <div className="pt-3 border-t border-border mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-semibold text-foreground text-sm">{formatKES(product.price)}</span>
                        {product.unit && <span className="text-[10px] text-muted-foreground font-sans">/ {product.unit}</span>}
                      </div>
                      <Button
                        size="sm"
                        className="w-full text-[11px] rounded-sm h-8 font-sans"
                        disabled={!product.in_stock}
                        onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, unit: product.unit ?? null, imageUrl: product.image_url ?? null }, 1)}
                      >
                        {product.in_stock ? "Add to Cart" : "Out of Stock"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-primary/30 bg-primary/5 rounded-sm p-12 text-center">
              <Package className="h-10 w-10 text-primary/40 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Materials coming soon</h3>
              <p className="text-sm text-muted-foreground font-light mb-6">Contact us to enquire about specific materials.</p>
              <a href="https://wa.me/254720859737" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-sm font-sans uppercase tracking-widest text-xs h-10 px-8">Enquire via WhatsApp</Button>
              </a>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link href="/shop?type=material">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-sm font-sans uppercase tracking-widest text-xs h-11 px-10">
                View All Materials <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* Featured Projects */}
      {isSectionVisible('featured-projects') && projects.length > 0 && (
      <section className="py-16 md:py-24 bg-muted">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary uppercase tracking-widest mb-3">
              Featured Projects
            </h2>
            <p className="text-muted-foreground text-sm md:text-base font-sans max-w-2xl mx-auto">
              See the transformation for yourself. Browse our before-and-after project gallery.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-primary/30" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              <div className="h-px w-12 bg-primary/30" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project) => {
              const beforeImage = (project.images || []).find(img => img.image_type === 'before');
              const afterImage = (project.images || []).find(img => img.image_type === 'after');
              const hasBoth = beforeImage && afterImage;
              return (
                <Link key={project.id} href={`/projects/${project.slug}`} className="group block">
                  <div className="rounded-sm overflow-hidden border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 bg-white">
                    <div className="relative">
                      {hasBoth ? (
                        <div className="grid grid-cols-2 gap-0">
                          <div className="relative overflow-hidden">
                            <img src={beforeImage!.image_url} alt="Before" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[9px] uppercase tracking-widest font-sans font-medium bg-black/60 text-white rounded-sm">Before</span>
                          </div>
                          <div className="relative overflow-hidden">
                            <img src={afterImage!.image_url} alt="After" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[9px] uppercase tracking-widest font-sans font-medium bg-primary text-white rounded-sm">After</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-48 bg-muted flex items-center justify-center overflow-hidden">
                          {afterImage ? (
                            <img src={afterImage.image_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : beforeImage ? (
                            <img src={beforeImage.image_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Wrench className="h-6 w-6 text-primary/40" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{project.title}</h3>
                      {project.location && (
                        <p className="text-xs text-muted-foreground font-sans mt-1">{project.location}</p>
                      )}
                      {project.description && (
                        <p className="text-sm text-muted-foreground font-light mt-2 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link href="/projects">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-sm font-sans uppercase tracking-widest text-xs h-11 px-10">
                View All Projects <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* Partners */}
      {isSectionVisible('partners') && partners.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary uppercase tracking-widest mb-3">
                Our Certified Partners
              </h2>
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-primary/30" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                <div className="h-px w-12 bg-primary/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...partners].sort((a, b) => (a.featured === b.featured ? 0 : a.featured ? -1 : 1)).map(partner => (
                <div
                  key={partner.id}
                  className="flex flex-col items-center justify-center p-6 rounded-sm border-2 h-24 font-sans font-bold text-xl tracking-wider transition-transform hover:scale-105"
                  style={{ background: partner.background_color || '#fff', color: partner.text_color || '#000', borderColor: partner.border_color || '#ccc' }}
                >
                  <span className="text-lg font-black tracking-widest">{partner.name}</span>
                  {partner.tagline && <span className="text-[8px] font-normal mt-0.5 opacity-70 uppercase tracking-wide text-center">{partner.tagline}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {isSectionVisible('testimonials') && testimonials.length > 0 && (
        <section className="py-20 md:py-28 bg-secondary text-secondary-foreground relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center mb-12">
              <p className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium mb-2">Testimonials</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white">What Our Clients Say</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((t, idx) => (
                <div key={t.id} className="bg-white/5 border border-white/10 rounded-sm p-6">
                  <div className={`flex gap-1 mb-4 ${idx === testimonials.length - 1 ? 'justify-center' : ''}`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < (t.rating || 5) ? 'text-primary fill-primary' : 'text-white/20'}`} />
                    ))}
                  </div>
                  <blockquote className="text-white/90 text-sm leading-relaxed mb-4 font-light">"{t.content}"</blockquote>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display font-semibold">{t.name.charAt(0)}</div>
                    <div>
                      <p className="text-white font-sans font-medium text-sm">{t.name}</p>
                      {t.role && <p className="text-white/50 text-xs font-light">{t.role}{t.company ? `, ${t.company}` : ''}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {isSectionVisible('faq') && (() => {
        const sec = homepageSections.find(s => s.section_type === 'faq');
        const title = sec?.title || 'Frequently Asked Questions';
        const subtitle = sec?.subtitle || 'Got questions? We have answers.';
        const faqs = (sec?.content?.faqs || DEFAULT_FAQS) as { question: string; answer: string }[];
        return (
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-6 md:px-12 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary uppercase tracking-widest mb-3">
                {title}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base font-sans max-w-xl mx-auto">
                {subtitle}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-primary/30" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                <div className="h-px w-12 bg-primary/30" />
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <FaqItem key={i} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        </section>
        );
      })()}

      {/* CTA */}
      {isSectionVisible('cta') && (() => {
        const ctaSec = homepageSections.find(s => s.section_type === 'cta');
        const ctaTitle = ctaSec?.title || 'Ready to Start Your Project?';
        const ctaSub = ctaSec?.subtitle || 'Get in touch with our team for a free consultation and quotation. We transform spaces with professional flooring and waterproofing solutions.';
        const ctaBtnText = ctaSec?.content?.cta_text || 'Request a Quote';
        const ctaBtnLink = ctaSec?.content?.cta_link || '/quotation';
        return (
        <section className="py-20 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M80 0L0 0 0 80' fill='none' stroke='white' stroke-width='0.6'/%3E%3C/svg%3E\")" }} />
          <div className="relative container mx-auto px-6 md:px-12 text-center">
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary-foreground mb-5">{ctaTitle}</h2>
            <p className="text-primary-foreground/80 mb-10 max-w-lg mx-auto font-light text-base leading-relaxed font-sans">
              {ctaSub}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={ctaBtnLink}>
                <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-sans font-medium px-12 h-12 rounded-sm tracking-wide">
                  {ctaBtnText} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-sans font-medium px-10 h-12 rounded-sm tracking-wide">
                  Contact Us
                </Button>
              </Link>
              <a href="https://wa.me/254720859737" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-[#25D366] hover:border-[#25D366] font-sans font-medium px-10 h-12 rounded-sm tracking-wide">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </section>
        );
      })()}
    </CustomerLayout>
  );
}

function ValuesRow({ values, banner }: { values: typeof VALUES_1; banner: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-0 w-full max-w-md">
        {values.map((v, i) => (
          <div key={v.label} className="flex items-center flex-1">
            {i > 0 && (
              <div className="flex-1 flex items-center gap-0.5 px-1">
                <div className="flex-1 border-t border-dashed border-gray-400" />
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                <div className="flex-1 border-t border-dashed border-gray-400" />
              </div>
            )}
            <div className="flex flex-col items-center">
              <div className={`h-14 w-14 rounded-full flex flex-col items-center justify-center shadow-md ${v.color}`}>
                <v.icon className={`h-5 w-5 ${v.iconColor}`} />
              </div>
              <span className={`mt-2 text-[10px] font-sans font-bold uppercase tracking-widest text-center ${v.color === "bg-green-600" ? "text-green-700" : v.color === "bg-sky-500" ? "text-sky-600" : "text-slate-700"}`}>
                {v.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 relative flex items-center justify-center">
        <div className="bg-secondary text-white font-sans font-bold text-sm uppercase tracking-[0.25em] px-10 py-2.5 rounded-sm flex items-center gap-3">
          <span className="text-primary">*</span>
          {banner}
          <span className="text-primary">*</span>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-card hover:bg-muted/50 transition-colors"
      >
        <span className="font-display font-medium text-foreground text-sm pr-4">{question}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-5 pb-4 text-sm text-muted-foreground font-light leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}
