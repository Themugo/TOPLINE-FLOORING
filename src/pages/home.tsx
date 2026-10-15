import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Star, ArrowRight, Phone, Megaphone } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { RecentProjects } from '@/components/home/RecentProjects';
import { useHeroSlides, useProducts, useTestimonials, usePartners, usePromotions, useHomepageSections, useServices, useSiteSettings, useThemeSettings, useProjects } from '@/hooks/use-data';
import { useSeoMeta } from '@/hooks/use-seo';
import { formatKES, telHref } from '@/lib/utils';
import { ServiceToneBar } from '@/components/ui/ServiceToneBar';
import { getServicePlaceholder, getProductPlaceholder, withFallback, ensureRealImage, getRandomRealImage } from '@/lib/placeholders';
import { useCart } from '@/hooks/use-cart';
import { useImagePreloader } from '@/hooks/use-image-preloader';
import type { Product } from '@/lib/types';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { getActiveProductVariants, getDefaultProductVariant, getProductUnitPrice, isProductPurchasable } from '@/lib/product-commerce';

// Tailwind's JIT compiler only picks up class names it can see literally in
// source, so the trust bar's column count is looked up from this static map
// rather than interpolated directly into a class string.
const TRUST_BAR_GRID_COLS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

interface HeroSlideData {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image_url: string;
  button_text?: string | null;
  button_link?: string | null;
  source_type: 'hero_slide' | 'service' | 'product';
}

export default function Home() {
  useSeoMeta('home');
  const { slides } = useHeroSlides();
  const { sections } = useHomepageSections();
  const getSection = (type: string) => sections.find(s => s.section_type === type);
  const productsSection = getSection('products');
  const productsLimit = Number(productsSection?.content?.limit) || 6;
  const { products: featuredProducts, error: featuredProductsError } = useProducts({ featured: true, limit: productsLimit });
  // Keep the homepage useful when the catalogue is populated but no products are marked featured.
  // The query still respects active/public product rules; it does not create demo products.
  const { products: catalogueProducts, error: catalogueProductsError } = useProducts({ limit: productsLimit });
  const products = featuredProducts.length > 0 ? featuredProducts : catalogueProducts;
  const productsLoadError = featuredProductsError && catalogueProductsError ? featuredProductsError : null;
  const { projects } = useProjects({ activeOnly: true });
  const { testimonials } = useTestimonials();
  const { partners } = usePartners();
  const { promotions } = usePromotions('top');
  const { services, error: servicesLoadError } = useServices();
  const { settings } = useSiteSettings();
  const phone = settings.contact?.phone || '';
  const { theme } = useThemeSettings();
  const layoutStyle = theme?.layout_style || 'classic';
  const { addItem } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [selectedFeaturedVariants, setSelectedFeaturedVariants] = useState<Record<string, string>>({});

  // Get hero section config
  const heroSection = sections.find(s => s.section_type === 'hero');
  const slideInterval = heroSection?.content?.slide_interval || 6000;
  const overlayOpacity = heroSection?.content?.overlay_opacity || 70;

  // Generic accessor for the other admin-editable sections (services,
  // about, products, partners, testimonials, cta). Falls back to
  // sensible defaults if the section row doesn't exist yet (e.g. before
  // the seed migration has run), so the homepage never breaks.
  const isSectionVisible = (type: string) => getSection(type)?.is_active !== false;
  const sectionStyle = (type: string): React.CSSProperties => {
    const s = getSection(type);
    if (!s) return {};
    const style: React.CSSProperties = {};
    if (s.background_color) style.backgroundColor = s.background_color;
    if (s.background_image) {
      style.backgroundImage = `url(${s.background_image})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
    }
    return style;
  };

  const servicesSection = getSection('services');
  const servicesMaxItems = Number(servicesSection?.content?.max_items) || 8;
  const aboutSection = getSection('about');
  const aboutContent = aboutSection?.content || {};
  const aboutStats: { value: string; label: string }[] = Array.isArray(aboutContent.stats) ? aboutContent.stats : [];
  const partnersSection = getSection('partners');
  const partnersMaxItems = Number(partnersSection?.content?.max_items) || 10;
  const testimonialsSection = getSection('testimonials');
  const testimonialsMaxItems = Number(testimonialsSection?.content?.max_items) || 4;
  const ctaSection = getSection('cta');
  const ctaContent = ctaSection?.content || {};
  const phoneButtonText = ctaContent.phone_button_text || 'Call Technical Team';

  const trustBarSection = getSection('trust_bar');
  const trustBarItems: { value: string; label: string }[] = Array.isArray(trustBarSection?.content?.items) ? trustBarSection.content.items.filter((i: { value: string; label: string }) => i.value && i.label) : [];
  const showTrustBar = trustBarItems.length > 0 && isSectionVisible('trust_bar');

  const servicesBadgeText = servicesSection?.content?.badge_text || 'What We Offer';
  const servicesViewAllText = servicesSection?.content?.view_all_text || 'View All Services';
  const aboutBadgeText = aboutSection?.content?.badge_text || 'About Us';
  const productsBadgeText = productsSection?.content?.badge_text || 'Materials Shop';
  const productsViewAllText = productsSection?.content?.view_all_text || 'View Full Catalog';
  const addToCartText = productsSection?.content?.add_to_cart_text || 'Add to Cart';
  const testimonialsBadgeText = testimonialsSection?.content?.badge_text || 'Client Feedback';

  // Build one hero carousel from configured CMS slides plus real catalogue records.
  // Catalogue entries are capped so the hero remains curated and useful rather than
  // becoming an endless list. Existing detail routes remain the source of truth.
  const allSlides: HeroSlideData[] = useMemo(() => {
    const configuredSlides: HeroSlideData[] = slides.map((slide, idx) => ({
      id: slide.id,
      title: slide.title,
      subtitle: slide.subtitle,
      description: slide.description,
      image_url: ensureRealImage(slide.image_url, 'hero', slide.id || idx),
      button_text: slide.button_text,
      button_link: slide.button_link,
      source_type: 'hero_slide',
    }));

    // Catalogue slides are a fallback only when the administrator has not
    // configured hero slides. Use real, published catalogue media rather than
    // inventing product/service imagery or mixing every catalogue item into
    // an already-curated hero carousel.
    const productSlides: HeroSlideData[] = products
      .filter((product) => Boolean(product.image_url && product.slug))
      .slice(0, 3)
      .map((product) => ({
        id: `featured-product-${product.id}`,
        title: product.name,
        subtitle: 'FEATURED PRODUCT',
        description: product.short_description || product.description || 'View product details and available ordering options.',
        image_url: product.image_url as string,
        button_text: 'View Product',
        button_link: `/product/${product.slug}`,
        source_type: 'product',
      }));

    const serviceSlides: HeroSlideData[] = services
      .filter((service) => service.is_active !== false && Boolean(service.image_url && service.slug))
      .slice(0, 3)
      .map((service) => ({
        id: `featured-service-${service.id}`,
        title: service.name,
        subtitle: 'FEATURED SERVICE',
        description: service.short_description || service.description || 'Explore this service and discuss the right solution for your project.',
        image_url: service.image_url as string,
        button_text: 'Explore Service',
        button_link: `/service/${service.slug}`,
        source_type: 'service',
      }));

    const defaultSlide: HeroSlideData = {
      id: 'topline-homepage-default',
      title: 'Floors and waterproofing built to perform.',
      subtitle: 'FLOORING & WATERPROOFING CONTRACTOR',
      description: 'Technical flooring systems, roof and water-tank waterproofing, and installation support across Kenya.',
      image_url: getRandomRealImage('flooring', 0),
      button_text: 'Discuss Your Project',
      button_link: '/quotation',
      source_type: 'hero_slide',
    };

    if (configuredSlides.length > 0) return configuredSlides;
    const mediaBackedCatalogueSlides = [...productSlides, ...serviceSlides];
    return mediaBackedCatalogueSlides.length > 0 ? mediaBackedCatalogueSlides : [defaultSlide];
  }, [slides, products, services]);

  // Preload hero slide, service, product, project, and partner images for smooth transitions
  useImagePreloader(
    useMemo(() => {
      const urls: string[] = [];
      allSlides.forEach(s => s.image_url && urls.push(s.image_url));
      services.forEach(s => s.image_url && urls.push(s.image_url));
      products.forEach(p => p.image_url && urls.push(p.image_url));
      projects.forEach(p => p.image_url && urls.push(p.image_url));
      partners.forEach(p => p.logo_url && urls.push(p.logo_url));
      if (aboutContent?.image_url) urls.push(aboutContent.image_url);
      return urls;
    }, [allSlides, services, products, projects, partners, aboutContent?.image_url])
  );

  useEffect(() => {
    if (currentSlide >= allSlides.length) setCurrentSlide(0);
  }, [currentSlide, allSlides.length]);

  useEffect(() => {
    if (allSlides.length < 2 || isSliderPaused) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allSlides.length);
    }, Math.max(4500, Number(slideInterval) || 6000));
    return () => clearInterval(interval);
  }, [allSlides.length, slideInterval, isSliderPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || allSlides.length < 2) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 50;
    if (deltaX > SWIPE_THRESHOLD) {
      setCurrentSlide((prev) => (prev - 1 + allSlides.length) % allSlides.length);
    } else if (deltaX < -SWIPE_THRESHOLD) {
      setCurrentSlide((prev) => (prev + 1) % allSlides.length);
    }
    setTouchStartX(null);
  };

  const handleAddToCart = (product: Product, variantId?: string) => {
    const variants = getActiveProductVariants(product);
    const variant = variants.length ? variants.find((v) => v.id === variantId) || getDefaultProductVariant(product) : undefined;
    if (!isProductPurchasable(product, variant)) return;
    addItem(product, variant);
  };

  return (
    <CustomerLayout>
      {/* Top Announcement Bar */}
      {promotions.filter(p => p.position === 'top').map((promo) => (
        <div key={promo.id} className="bg-primary-500 text-white py-2 text-center text-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
            <Megaphone className="w-4 h-4" />
            <span>{promo.title}{promo.subtitle && ` - ${promo.subtitle}`}</span>
            {promo.link_url && (
              <Link href={promo.link_url} className="underline hover:no-underline ml-2">
                {promo.link_text || 'Learn More'}
              </Link>
            )}
          </div>
        </div>
      ))}

      {/* Hero Section - Full viewport slider with dark navy overlay */}
      <section
        className="topline-home-hero relative h-[30rem] min-h-[30rem] sm:h-[32rem] lg:h-[35rem] overflow-hidden bg-[#0C2D57] touch-pan-y"
        aria-roledescription="carousel"
        aria-label="Featured products, services and company highlights"
        onMouseEnter={() => setIsSliderPaused(true)}
        onMouseLeave={() => setIsSliderPaused(false)}
        onFocusCapture={() => setIsSliderPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsSliderPaused(false);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {allSlides.map((slide, index) => (
          <div
            key={slide.id}
            aria-hidden={index !== currentSlide}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="absolute inset-0 z-10 bg-gradient-to-r from-[#0C2D57]/90 via-[#0C2D57]/70 to-[#0C2D57]/15"
              style={{ opacity: Math.min(1, Math.max(0.55, overlayOpacity / 100)) }}
            />
            <img
              src={slide.image_url}
              alt={slide.title}
              className="w-full h-full object-cover object-center transition-transform duration-1000 ease-out"
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              onError={(e) => {
                e.currentTarget.src = getRandomRealImage('flooring', index);
              }}
            />
            <div className="absolute inset-0 z-20 flex items-center">
              <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
                <div className="max-w-2xl py-10">
                  {slide.source_type !== 'hero_slide' && (
                    <p className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#EEFBCF] backdrop-blur-sm">
                      {slide.source_type === 'product' ? 'Featured product' : 'Featured service'}
                    </p>
                  )}
                  {slide.subtitle && (
                    <p
                      className={`text-[#B4E33D] font-semibold mb-3 sm:mb-4 text-[11px] sm:text-sm uppercase tracking-[0.16em] sm:tracking-[0.18em] transition-all duration-500 delay-100 ${
                        index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      {slide.subtitle}
                    </p>
                  )}
                  <h1
                    className={`font-display text-[2rem] leading-[1.06] sm:text-5xl lg:text-[3.75rem] sm:leading-[1.04] font-bold tracking-tight text-white mb-4 sm:mb-5 max-w-2xl text-balance transition-all duration-500 delay-200 ${
                      index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    }`}
                  >
                    {slide.title}
                  </h1>
                  {slide.description && (
                    <p
                      className={`text-sm sm:text-lg text-slate-100 mb-5 sm:mb-7 max-w-xl leading-relaxed line-clamp-3 transition-all duration-500 delay-300 ${
                        index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      {slide.description}
                    </p>
                  )}
                  {slide.button_text && slide.button_link && (
                    <Link
                      href={slide.button_link}
                      tabIndex={index === currentSlide ? 0 : -1}
                      className={`min-h-11 inline-flex items-center justify-center gap-2 bg-[#B4E33D] hover:bg-[#c4ed5d] text-[#0C2D57] px-5 sm:px-6 py-3 rounded-lg text-sm font-bold transition-all duration-500 delay-400 shadow-sm hover:shadow-md ${
                        index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      {slide.button_text}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Navigation */}
        {allSlides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Show previous featured slide"
              onClick={() => setCurrentSlide((prev) => (prev - 1 + allSlides.length) % allSlides.length)}
              className="hidden sm:flex absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-[#0C2D57]/65 backdrop-blur text-white hover:bg-[#0E6B78] transition-colors items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Show next featured slide"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % allSlides.length)}
              className="hidden sm:flex absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-[#0C2D57]/65 backdrop-blur text-white hover:bg-[#0E6B78] transition-colors items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-[#0C2D57]/45 px-3 py-2 backdrop-blur-sm">
              {allSlides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show featured slide ${index + 1}: ${allSlides[index].title}`}
                  aria-current={index === currentSlide ? 'true' : undefined}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                    index === currentSlide ? 'w-6 bg-primary-500' : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Customer intent shortcuts: help first-time visitors choose the right journey immediately. */}
      <section className="relative z-30 bg-[#F7F6F3] px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="max-w-6xl mx-auto customer-intent-grid">
          <Link href="/shop" className="group customer-intent-card">
            <div><strong>Shop materials</strong><span>Browse products and variants</span></div><ArrowRight className="w-4 h-4 text-primary-500 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/services" className="group customer-intent-card">
            <div><strong>Find a service</strong><span>Explore flooring and waterproofing</span></div><ArrowRight className="w-4 h-4 text-primary-500 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/quotation" className="group customer-intent-card">
            <div><strong>Request a quote</strong><span>Tell us what your project needs</span></div><ArrowRight className="w-4 h-4 text-primary-500 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/track-order" className="group customer-intent-card">
            <div><strong>Track your order</strong><span>Check delivery and order progress</span></div><ArrowRight className="w-4 h-4 text-primary-500 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Trust Bar - elevated stats card overlapping the hero, admin-configurable in Homepage Builder */}
      {showTrustBar && (
        <section className="relative z-30 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto mt-2 bg-white rounded-xl shadow-sm border border-slate-200 px-6 sm:px-10 py-6 sm:py-8">
            <div className={`grid grid-cols-2 gap-6 sm:gap-4 divide-y-0 ${TRUST_BAR_GRID_COLS[Math.min(trustBarItems.length, 6)] || 'sm:grid-cols-4'}`}>
              {trustBarItems.slice(0, 6).map((item, i) => (
                <div key={i} className="text-center sm:border-l sm:first:border-l-0 border-gray-100 sm:px-4">
                  <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-navy-950">{item.value}</p>
                  <p className="text-xs sm:text-sm text-navy-500 font-medium mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services Section */}
      {isSectionVisible('services') && (
      <section className={`${servicesSection?.padding || 'py-16 lg:py-20'} bg-white`} style={sectionStyle('services')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left max-w-3xl mb-9">
            <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-xs font-semibold uppercase tracking-wider mb-2">
              {servicesBadgeText}
            </span>
            <h2 className="font-display text-2xl lg:text-4xl font-bold text-navy-950 tracking-tight mb-3">
              {servicesSection?.title || 'Our Services'}
            </h2>
            <p className="text-navy-600 text-sm lg:text-base leading-relaxed">
              {servicesSection?.subtitle || 'Professional flooring and waterproofing solutions.'}
            </p>
          </div>

          {services.length > 0 ? (
            layoutStyle === 'showcase' ? (
              <div className="flex gap-5 lg:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
                {services.slice(0, servicesMaxItems).map((service) => (
                  <Link
                    key={service.id}
                    href="/services"
                    className="group relative overflow-hidden rounded-2xl flex-shrink-0 w-64 lg:w-80 aspect-[3/4] snap-start shadow-md hover:shadow-2xl transition-all duration-300"
                  >
                    <img
                      src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                      alt={service.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <ServiceToneBar service={service} />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <span className="inline-block text-[11px] font-semibold tracking-widest uppercase text-primary-300 mb-1.5">
                        Specialized Service
                      </span>
                      <h3 className="font-display text-lg lg:text-xl font-bold text-white mb-2 leading-tight group-hover:text-primary-300 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-xs lg:text-sm text-gray-200 line-clamp-2 leading-relaxed">{service.short_description || service.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {services.slice(0, servicesMaxItems).map((service) => (
                  <Link
                    key={service.id}
                    href="/services"
                    className="group relative overflow-hidden rounded-xl aspect-[4/3] shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200"
                  >
                    <img
                      src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                      alt={service.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <ServiceToneBar service={service} />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/60 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-primary-500/90 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 shadow-md">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5">
                      <h3 className="font-display text-base lg:text-lg font-bold text-white leading-snug group-hover:text-primary-300 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-xs text-gray-200 line-clamp-1 mt-1 hidden sm:block">{service.short_description || service.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-600 text-sm">{servicesLoadError ? "We could not load services right now. Please try again or contact our team." : "Service information is being updated. Please contact our team for assistance."}</p>
            </div>
          )}

          {services.length > 0 && (
            <div className="text-center mt-10 lg:mt-12">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-bold text-sm hover:gap-3 transition-all"
              >
                <span>{servicesViewAllText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
      )}

      {/* About Section */}
      {isSectionVisible('about') && (
      <section className={`${aboutSection?.padding || 'py-16 lg:py-20'} bg-gray-50/80 border-y border-gray-200/60`} style={sectionStyle('about')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="inline-block text-[#566F0D] text-xs font-semibold uppercase tracking-[0.16em] mb-2">
                {aboutBadgeText}
              </span>
              <h2 className="font-display text-2xl lg:text-4xl font-bold text-navy-950 tracking-tight mb-4">
                {aboutSection?.title || 'Who We Are'}
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm lg:text-base mb-4">
                {aboutContent.paragraph_1 || 'Learn more about our company on our About page.'}
              </p>
              {aboutContent.paragraph_2 && (
                <p className="text-gray-600 leading-relaxed text-sm lg:text-base mb-6">
                  {aboutContent.paragraph_2}
                </p>
              )}
              {aboutStats.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2">
                  {aboutStats.map((stat) => (
                    <div key={stat.label} className="p-3.5 sm:p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs text-center">
                      <p className="font-display text-2xl lg:text-3xl font-bold text-primary-600">{stat.value}</p>
                      <p className="text-xs text-navy-600 font-medium mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-3xl blur-lg pointer-events-none" />
              <img
                src={withFallback(aboutContent.image_url, 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80')}
                alt={aboutSection?.title || 'Flooring specialists team'}
                loading="lazy"
                className="relative rounded-2xl shadow-xl w-full object-cover aspect-video border border-white"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80';
                }}
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Recent Projects Dynamic Gallery */}
      <RecentProjects />

      {/* Materials Shop Section */}
      {isSectionVisible('products') && (
      <section className={`${productsSection?.padding || 'py-16 lg:py-20'} bg-white`} style={sectionStyle('products')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-xs font-semibold uppercase tracking-wider mb-2">
                {productsBadgeText}
              </span>
              <h2 className="font-display text-2xl lg:text-4xl font-bold text-navy-950 tracking-tight">
                {productsSection?.title || 'Featured Materials'}
              </h2>
              <p className="text-gray-600 text-sm lg:text-base mt-1">{productsSection?.subtitle || 'Premium flooring chemicals and waterproofing products'}</p>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-bold text-sm group self-start sm:self-auto">
              <span>{productsViewAllText}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {products.slice(0, 8).map((product) => {
                const variants = getActiveProductVariants(product);
                const selectedVariant = variants.find((v) => v.id === selectedFeaturedVariants[product.id]) || getDefaultProductVariant(product);
                return (
                <div key={product.id} className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between">
                  <div>
                    <Link href={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-50">
                      <img
                        src={withFallback(product.image_url, getProductPlaceholder(product.category?.slug || product.category?.name))}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = getProductPlaceholder(product.category?.slug || product.category?.name);
                        }}
                      />
                      {product.featured && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-xs">
                          Featured
                        </span>
                      )}
                    </Link>
                    <div className="p-4">
                      {product.category && (
                        <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-wider mb-1">
                          {product.category.name}
                        </p>
                      )}
                      {variants.length > 0 && <ProductVariantSelector variants={variants} value={selectedVariant?.id} onChange={(id) => setSelectedFeaturedVariants((prev) => ({ ...prev, [product.id]: id }))} compact />}
                      <Link href={`/product/${product.slug}`}>
                        <h3 className="font-display font-bold text-navy-950 text-sm lg:text-base hover:text-primary-600 transition-colors line-clamp-2 leading-snug">
                          {product.name}
                        </h3>
                      </Link>
                    </div>
                  </div>
                  <div className="p-4 pt-0 border-t border-gray-100/80 mt-2 flex items-center justify-between">
                    <p className="font-bold text-navy-950 text-base">{formatKES(getProductUnitPrice(product, selectedVariant))}</p>
                    <button
                      disabled={!isProductPurchasable(product, selectedVariant)}
                      onClick={() => handleAddToCart(product, selectedVariant?.id)}
                      className="text-xs bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all shadow-2xs hover:shadow-sm"
                    >
                      {addToCartText}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-600 text-sm">{productsLoadError ? "We could not load materials right now. Please try the full catalogue or contact our team." : "No active materials are available to feature right now. Browse the full catalogue for current listings."}</p>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Partners */}
      {partners.length > 0 && isSectionVisible('partners') && (
        <section className={`${partnersSection?.padding || 'py-12 lg:py-16'} bg-gray-50/50 border-y border-gray-200/60`} style={sectionStyle('partners')}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-display text-xs lg:text-sm font-bold text-primary-600 uppercase tracking-[0.2em] mb-8">
              {partnersSection?.title || 'Our Certified Partners & Manufacturers'}
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 lg:gap-8">
              {partners.slice(0, partnersMaxItems).map((partner) => (
                <div key={partner.id} className="transition-all duration-300 hover:scale-105">
                  {partner.logo_url ? (
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-md hover:border-primary-300 transition-all">
                      <img
                        src={partner.logo_url}
                        alt={partner.name}
                        loading="lazy"
                        className="h-7 w-7 object-cover rounded-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="font-semibold text-navy-900 text-xs sm:text-sm">{partner.name}</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-navy-800 text-xs sm:text-sm px-4 py-2.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs">{partner.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && isSectionVisible('testimonials') && (
        <section className={`${testimonialsSection?.padding || 'py-16 lg:py-20'} bg-white`} style={sectionStyle('testimonials')}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-xs font-semibold uppercase tracking-wider mb-2">
                {testimonialsBadgeText}
              </span>
              <h2 className="font-display text-2xl lg:text-4xl font-bold text-navy-950 tracking-tight">
                {testimonialsSection?.title || 'What Our Clients Say'}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {testimonials.slice(0, testimonialsMaxItems).map((t) => (
                <div key={t.id} className="bg-gray-50/60 rounded-2xl p-6 border border-gray-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-navy-800 text-sm leading-relaxed italic mb-6">"{t.content}"</p>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200/60">
                    <div className="w-9 h-9 rounded-full bg-primary-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-navy-950 text-xs sm:text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}{t.company && `, ${t.company}`}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {isSectionVisible('cta') && (
      <section className={`${ctaSection?.padding || 'py-16 lg:py-20'} bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white relative overflow-hidden`} style={sectionStyle('cta')}>
        <div className="absolute inset-0 bg-[radial-gradient(#4593da_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            {ctaSection?.title || 'Ready to Elevate Your Commercial Space?'}
          </h2>
          <p className="text-navy-100/90 mb-8 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            {ctaSection?.subtitle || 'Get in touch with our certified engineers for an on-site survey and detailed project quotation.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href={ctaContent.cta_link || '/quotation'} className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/25 transition-all">
              {ctaContent.cta_text || 'Request Free Consultation'}
            </Link>
            {phone && <a href={telHref(phone)} className="w-full sm:w-auto bg-navy-800/80 hover:bg-navy-800 border border-navy-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
              <Phone className="w-4 h-4 text-primary-400" />
              <span>{phoneButtonText}</span>
            </a>}
          </div>
        </div>
      </section>
      )}
    </CustomerLayout>
  );
}
