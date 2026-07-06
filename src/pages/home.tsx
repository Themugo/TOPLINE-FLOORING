import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useListProducts } from "@/lib/api";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/utils";
import { ArrowRight, ChevronLeft, ChevronRight, Package, Phone, Shield, Zap, Users, Star, Lightbulb, TrendingUp, MessageCircle } from "lucide-react";
import type { HomepageSection, Testimonial, Partner } from "@/lib/types";

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

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

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

  // Fetch testimonials, partners, and homepage sections
  useEffect(() => {
    if (!supabase) return;
    
    const fetchContent = async () => {
      const client = supabase;
      if (!client) return;
      
      const [testimonialsRes, partnersRes, sectionsRes] = await Promise.all([
        client.from('testimonials').select('*').eq('is_active', true).order('sort_order'),
        client.from('partners').select('*').eq('is_active', true).order('sort_order'),
        client.from('homepage_sections').select('*').order('display_order'),
      ]);

      if (testimonialsRes.data) setTestimonials(testimonialsRes.data as any);
      if (partnersRes.data) setPartners(partnersRes.data as any);
      if (sectionsRes.data) setHomepageSections(sectionsRes.data as any);
    };

    fetchContent();
  }, [supabase]);

  const goToSlide = useCallback((idx: number) => {
    setFading(true);
    setTimeout(() => {
      setSlide(idx);
      setFading(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (heroSlides.length === 0 || paused) return;
    const t = setInterval(() => goToSlide((slide + 1) % heroSlides.length), 4000);
    return () => clearInterval(t);
  }, [slide, goToSlide, heroSlides.length, paused]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEndX(e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > 75) goToSlide((slide + 1) % heroSlides.length);
    else if (touchEndX - touchStartX > 75) goToSlide((slide - 1 + heroSlides.length) % heroSlides.length);
  };

  // Check if a section should be visible based on homepage_sections config
  const isSectionVisible = (sectionType: string) => {
    const section = homepageSections.find(s => s.section_type === sectionType);
    return section ? section.is_active : true; // Default to visible if not configured
  };

  return (
    <CustomerLayout>
      {/* Hero Slider */}
      {isSectionVisible('hero') && (
        <section
          className="relative w-full overflow-hidden"
          style={{ height: "50vh", minHeight: 300, maxHeight: 500 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
        {heroSlides.length > 0 && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
              style={{ backgroundImage: `url(${heroSlides[slide].image_url})`, opacity: fading ? 0 : 1 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

            <div className="absolute inset-0 flex flex-col justify-end pb-12 md:pb-16 px-6 md:px-16">
              <div className={`transition-all duration-300 ${fading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
                <p className="text-primary text-xs sm:text-sm uppercase tracking-[0.2em] font-sans font-medium mb-2">Topline Flooring & Waterproofing</p>
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-3 max-w-3xl">
                  {heroSlides[slide].title}
                </h2>
                {heroSlides[slide].subtitle && (
                  <p className="text-white/80 text-sm sm:text-base md:text-lg font-sans font-light max-w-xl mb-6">
                    {heroSlides[slide].subtitle}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {heroSlides[slide].button_link && heroSlides[slide].button_text && (
                    <Link href={heroSlides[slide].button_link}>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-medium px-6 h-10 rounded-sm tracking-wide text-sm">
                        {heroSlides[slide].button_text} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <a href="tel:0720859737">
                    <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 font-sans font-medium px-5 h-10 rounded-sm tracking-wide backdrop-blur-sm text-sm">
                      <Phone className="mr-2 h-4 w-4 text-primary" />
                      0720 859 737
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={() => goToSlide((slide - 1 + heroSlides.length) % heroSlides.length)}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-primary text-white flex items-center justify-center transition-all backdrop-blur-sm md:flex hidden"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => goToSlide((slide + 1) % heroSlides.length)}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-primary text-white flex items-center justify-center transition-all backdrop-blur-sm md:flex hidden"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? "w-6 bg-primary" : "w-1.5 bg-white/40 hover:bg-white/60"}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </section>
      )}

      {/* Services Section */}
      {isSectionVisible('services') && (
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary uppercase tracking-widest mb-3">
              Our Services
            </h2>
            <p className="text-muted-foreground text-sm md:text-base font-sans max-w-2xl mx-auto">
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
              <h2 className="font-display text-2xl md:text-3xl font-bold text-primary uppercase tracking-widest mb-4">
                {aboutTitle}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed font-sans max-w-xl mx-auto">
                {aboutText}
              </p>
            </div>

            <ValuesRow values={VALUES_2} banner="VALUES" />
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

      {/* Partners */}
      {isSectionVisible('partners') && partners.length > 0 && (
        <section className="py-16 md:py-24 bg-muted">
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
              {partners.map(partner => (
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
