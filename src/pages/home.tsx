import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Star, ArrowRight, Phone, Megaphone } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useHeroSlides, useProducts, useTestimonials, usePartners, usePromotions, useHomepageSections, useServices, useSiteSettings, useThemeSettings } from '@/hooks/use-data';
import { useSeoMeta } from '@/hooks/use-seo';
import { formatKES, telHref } from '@/lib/utils';
import { getServicePlaceholder, getProductPlaceholder, withFallback } from '@/lib/placeholders';
import { useCart } from '@/hooks/use-cart';
import type { Product } from '@/lib/types';

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
  const { products } = useProducts({ featured: true, limit: productsLimit });
  const { testimonials } = useTestimonials();
  const { partners } = usePartners();
  const { promotions } = usePromotions('top');
  const { services } = useServices();
  const { settings } = useSiteSettings();
  const phone = settings.contact?.phone || '+254 700 123 456';
  const { theme } = useThemeSettings();
  const layoutStyle = theme?.layout_style || 'classic';
  const { addItem } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Get hero section config
  const heroSection = sections.find(s => s.section_type === 'hero');
  const slideInterval = heroSection?.content?.slide_interval || 6000;
  const overlayOpacity = heroSection?.content?.overlay_opacity || 70;
  const showFeaturedProducts = heroSection?.content?.show_featured_products !== false;
  const showFeaturedServices = heroSection?.content?.show_featured_services !== false;

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

  // Combine hero slides with services and featured products
  const allSlides: HeroSlideData[] = useMemo(() => {
    const combined: HeroSlideData[] = [];

    // Add dedicated hero slides first
    slides.forEach(slide => {
      combined.push({
        id: slide.id,
        title: slide.title,
        subtitle: slide.subtitle,
        description: slide.description,
        image_url: slide.image_url,
        button_text: slide.button_text,
        button_link: slide.button_link,
        source_type: 'hero_slide'
      });
    });

    // Services and featured products fill out the rest of the slider,
    // in a random order and random selection each time the page loads
    // (rather than always showing every service in the same fixed
    // order) so the hero stays fresh on repeat visits.
    const servicesPool: HeroSlideData[] = showFeaturedServices ? services.map(service => ({
      id: `service-${service.id}`,
      title: service.name,
      subtitle: 'Our Services',
      description: service.short_description || service.description,
      image_url: service.image_url,
      button_text: 'Learn More',
      button_link: '/services',
      source_type: 'service' as const,
    })) : [];

    const productsPool: HeroSlideData[] = showFeaturedProducts ? products.map(product => ({
      id: `product-${product.id}`,
      title: product.name,
      subtitle: 'Featured Product',
      description: product.short_description || `Premium quality ${product.category?.name || 'materials'} from our shop`,
      image_url: product.image_url || getProductPlaceholder(product.category?.slug || product.category?.name),
      button_text: 'Shop Now',
      button_link: `/product/${product.slug}`,
      source_type: 'product' as const,
    })) : [];

    // Fisher-Yates shuffle
    const shuffle = <T,>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const shuffledRest = shuffle([...servicesPool, ...productsPool]).slice(0, 5);
    combined.push(...shuffledRest);

    return combined;
  }, [slides, services, products, showFeaturedProducts, showFeaturedServices]);

  useEffect(() => {
    if (allSlides.length === 0 || isSliderPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allSlides.length);
    }, slideInterval);
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

  const handleAddToCart = (product: Product) => {
    addItem(product);
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
        className="relative h-[55vh] md:h-[60vh] lg:h-[65vh] overflow-hidden"
        onMouseEnter={() => setIsSliderPaused(true)}
        onMouseLeave={() => setIsSliderPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {allSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="absolute inset-0 bg-gradient-to-r from-navy-950/80 via-navy-900/70 to-navy-800/50 z-10"
              style={{ opacity: overlayOpacity / 100 }}
            />
            <img
              src={slide.image_url}
              alt={slide.title}
              className="w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
            />
            <div className="absolute inset-0 z-20 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-xl">
                  {slide.subtitle && (
                    <p
                      className={`text-primary-400 font-medium mb-2 text-sm uppercase tracking-wider transition-all duration-500 delay-100 ${
                        index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      {slide.subtitle}
                    </p>
                  )}
                  <h1
                    className={`font-display text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-3 transition-all duration-500 delay-200 ${
                      index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    }`}
                  >
                    {slide.title}
                  </h1>
                  {slide.description && (
                    <p
                      className={`text-sm lg:text-base text-gray-200 mb-5 line-clamp-2 transition-all duration-500 delay-300 ${
                        index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      {slide.description}
                    </p>
                  )}
                  {slide.button_text && slide.button_link && (
                    <Link
                      href={slide.button_link}
                      className={`inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-500 delay-400 shadow-lg hover:shadow-xl ${
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
              onClick={() => setCurrentSlide((prev) => (prev - 1 + allSlides.length) % allSlides.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/10 backdrop-blur text-white hover:bg-primary-500 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % allSlides.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/10 backdrop-blur text-white hover:bg-primary-500 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
              {allSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'w-6 bg-primary-500' : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Services Section */}
      {isSectionVisible('services') && (
      <section className={`${servicesSection?.padding || 'py-12 lg:py-16'} bg-white`} style={sectionStyle('services')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="section-label">What We Offer</span>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-primary-600 mb-2 mt-2">
              {servicesSection?.title || 'Our Services'}
            </h2>
            <p className="text-navy-500">
              {servicesSection?.subtitle || 'Professional flooring and waterproofing solutions for Kenya and East Africa.'}
            </p>
          </div>

          {services.length > 0 ? (
            layoutStyle === 'showcase' ? (
              <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
                {services.slice(0, servicesMaxItems).map((service) => (
                  <Link
                    key={service.id}
                    href="/services"
                    className="group relative overflow-hidden rounded-xl flex-shrink-0 w-64 lg:w-80 aspect-[3/4] snap-start"
                  >
                    <img
                      src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                      alt={service.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-400 mb-2">
                        Service
                      </span>
                      <h3 className="font-display text-lg font-bold text-white mb-1">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-300 line-clamp-2">{service.short_description || service.description}</p>
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
                    className="group relative overflow-hidden rounded-xl aspect-[4/3]"
                  >
                    <img
                      src={withFallback(service.image_url, getServicePlaceholder(service.slug || service.name))}
                      alt={service.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-transparent" />
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4">
                      <h3 className="font-display text-sm lg:text-base font-bold text-white">
                        {service.name}
                      </h3>
                      <p className="text-xs text-gray-300 line-clamp-1 hidden sm:block">{service.short_description || service.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No services available yet. Add services in the admin panel.</p>
            </div>
          )}

          {services.length > 0 && (
            <div className="text-center mt-8 lg:mt-10">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-primary-600 font-semibold text-sm hover:gap-3 transition-all"
              >
                View All Services
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
      )}

      {/* About Section */}
      {isSectionVisible('about') && (
      <section className={`${aboutSection?.padding || 'py-12 lg:py-16'} bg-gray-50`} style={sectionStyle('about')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <span className="section-label">About Us</span>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy-900 mb-4 mt-2">
                {aboutSection?.title || 'Who We Are'}
              </h2>
              <p className="text-gray-600 mb-4">
                {aboutContent.paragraph_1 || 'Learn more about our company on our About page.'}
              </p>
              <p className="text-gray-600 mb-6">
                {aboutContent.paragraph_2 || ''}
              </p>
              {aboutStats.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {aboutStats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="font-display text-xl lg:text-2xl font-bold text-primary-600">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              {aboutContent.image_url ? (
                <img
                  src={aboutContent.image_url}
                  alt={aboutSection?.title || 'Topline Flooring team'}
                  className="rounded-xl shadow-lg w-full"
                />
              ) : (
                <div className="rounded-xl bg-gray-200 aspect-video flex items-center justify-center text-gray-400">
                  <p className="text-sm">Set an image in the homepage builder</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Materials Shop Section */}
      {isSectionVisible('products') && (
      <section className={`${productsSection?.padding || 'py-12 lg:py-16'} bg-white`} style={sectionStyle('products')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <span className="section-label">Shop</span>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy-900 mt-2">
                {productsSection?.title || 'Materials Shop'}
              </h2>
              <p className="text-gray-600 text-sm">{productsSection?.subtitle || 'Premium materials from trusted brands'}</p>
            </div>
            <Link href="/shop" className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {products.length > 0 ? (
            layoutStyle === 'showcase' ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {products.map((product, idx) => (
                  <div key={product.id} className={`card group ${idx % 3 === 0 ? 'lg:row-span-2' : ''}`}>
                    <Link href={`/product/${product.slug}`}>
                      <div className={`overflow-hidden bg-gray-100 ${idx % 3 === 0 ? 'aspect-square lg:aspect-[1/2]' : 'aspect-square'}`}>
                        <img
                          src={withFallback(product.image_url, getProductPlaceholder(product.category?.slug || product.category?.name))}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </Link>
                    <div className="p-3 lg:p-4">
                      {product.category && (
                        <p className="text-xs text-primary-600 uppercase tracking-wide mb-1">
                          {product.category.name}
                        </p>
                      )}
                      <Link href={`/product/${product.slug}`}>
                        <h3 className="font-semibold text-navy-900 text-sm lg:text-base hover:text-primary-600 line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="flex items-center justify-between mt-3">
                        <p className="font-bold text-navy-900 text-sm">{formatKES(product.price)}</p>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="text-xs bg-primary-500 hover:bg-primary-600 text-white px-2 py-1 lg:px-3 lg:py-1.5 rounded transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {products.map((product) => (
                  <div key={product.id} className="card group">
                    <Link href={`/product/${product.slug}`}>
                      <div className="aspect-square overflow-hidden bg-gray-100">
                        <img
                          src={withFallback(product.image_url, getProductPlaceholder(product.category?.slug || product.category?.name))}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </Link>
                    <div className="p-3 lg:p-4">
                      {product.category && (
                        <p className="text-xs text-primary-600 uppercase tracking-wide mb-1">
                          {product.category.name}
                        </p>
                      )}
                      <Link href={`/product/${product.slug}`}>
                        <h3 className="font-semibold text-navy-900 text-sm lg:text-base hover:text-primary-600 line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="flex items-center justify-between mt-3">
                        <p className="font-bold text-navy-900 text-sm">{formatKES(product.price)}</p>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="text-xs bg-primary-500 hover:bg-primary-600 text-white px-2 py-1 lg:px-3 lg:py-1.5 rounded transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl border">
              <p className="text-gray-500">No featured products</p>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Partners */}
      {partners.length > 0 && isSectionVisible('partners') && (
        <section className={`${partnersSection?.padding || 'py-12 lg:py-16'} border-y border-gray-200`} style={sectionStyle('partners')}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-display text-xl lg:text-2xl font-bold text-primary-600 uppercase tracking-[0.15em] mb-8">
              {partnersSection?.title || 'Our Certified Partners'}
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
              {partners.slice(0, partnersMaxItems).map((partner) => (
                <div key={partner.id} className="grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100">
                  {partner.logo_url ? (
                    <img src={partner.logo_url} alt={partner.name} className="h-9 object-contain" />
                  ) : (
                    <span className="font-semibold text-navy-600 text-sm">{partner.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && isSectionVisible('testimonials') && (
        <section className={`${testimonialsSection?.padding || 'py-12 lg:py-16'}`} style={sectionStyle('testimonials')}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="section-label">Testimonials</span>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy-900 mb-2 mt-2">
                {testimonialsSection?.title || 'What Clients Say'}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {testimonials.slice(0, testimonialsMaxItems).map((t) => (
                <div key={t.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-accent-400 fill-accent-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">{t.content}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="font-semibold text-primary-600 text-xs">{t.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs">{t.name}</p>
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
      <section className={`${ctaSection?.padding || 'py-12 lg:py-16'} bg-gray-50`} style={sectionStyle('cta')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy-900 mb-3">
            {ctaSection?.title || 'Ready to Start Your Project?'}
          </h2>
          <p className="text-navy-500 mb-6 max-w-xl mx-auto text-sm lg:text-base">
            {ctaSection?.subtitle || 'Get in touch with our team for a free consultation and quotation.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href={ctaContent.cta_link || '/quotation'} className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm shadow-sm">
              {ctaContent.cta_text || 'Get Free Quote'}
            </Link>
            <a href={telHref(phone)} className="bg-white border border-gray-200 text-navy-700 px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-100">
              <Phone className="w-4 h-4 inline mr-2" />
              Call Now
            </a>
          </div>
        </div>
      </section>
      )}
    </CustomerLayout>
  );
}
