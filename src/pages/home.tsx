import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Star, ArrowRight, Phone, Mail, Megaphone } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useHeroSlides, useProducts, useTestimonials, usePartners, usePromotions, useHomepageSections, useServices } from '@/hooks/use-data';
import { formatKES } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import type { Product } from '@/lib/types';

interface HeroSlideData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  button_text?: string;
  button_link?: string;
  source_type: 'hero_slide' | 'service' | 'product';
}

export default function Home() {
  const { slides } = useHeroSlides();
  const { products } = useProducts({ featured: true, limit: 6 });
  const { testimonials } = useTestimonials();
  const { partners } = usePartners();
  const { promotions } = usePromotions('top');
  const { sections } = useHomepageSections();
  const { services } = useServices();
  const { addItem } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Get hero section config
  const heroSection = sections.find(s => s.section_type === 'hero');
  const slideInterval = heroSection?.content?.slide_interval || 6000;
  const overlayOpacity = heroSection?.content?.overlay_opacity || 70;
  const showFeaturedProducts = heroSection?.content?.show_featured_products !== false;

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

    // Add services as slides
    services.forEach(service => {
      combined.push({
        id: `service-${service.id}`,
        title: service.name,
        subtitle: 'Our Services',
        description: service.short_description || service.description,
        image_url: service.image_url,
        button_text: 'Learn More',
        button_link: '/services',
        source_type: 'service'
      });
    });

    // Add top products as slides
    products.slice(0, 3).forEach(product => {
      combined.push({
        id: `product-${product.id}`,
        title: product.name,
        subtitle: 'Featured Product',
        description: product.short_description || `Premium quality ${product.category?.name || 'materials'} from our shop`,
        image_url: product.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
        button_text: 'Shop Now',
        button_link: `/product/${product.slug}`,
        source_type: 'product'
      });
    });

    return combined;
  }, [slides, services, products]);

  useEffect(() => {
    if (allSlides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allSlides.length);
    }, slideInterval);
    return () => clearInterval(interval);
  }, [allSlides.length, slideInterval]);

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
      <section className="relative h-[55vh] md:h-[60vh] lg:h-[65vh] overflow-hidden">
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
                    className={`font-display text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-3 transition-all duration-500 delay-200 ${
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
      <section className="py-12 lg:py-16 bg-navy-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-2">
              Our Services
            </h2>
            <p className="text-gray-400">
              Professional flooring and waterproofing solutions for Kenya and East Africa.
            </p>
          </div>

          {services.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href="/services"
                  className="group relative overflow-hidden rounded-xl aspect-[4/3]"
                >
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4">
                    <h3 className="font-display text-sm lg:text-base font-bold text-white">
                      {service.name}
                    </h3>
                    <p className="text-xs text-gray-300 line-clamp-1 hidden sm:block">{service.short_description || service.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading services...</p>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy-900 mb-4">
                Who We Are
              </h2>
              <p className="text-gray-600 mb-4">
                For over 10 years, Topline Flooring and Waterproofing has been the trusted partner for professional flooring and waterproofing solutions across Kenya and East Africa. We deliver durable, cost-effective services that enhance the lifespan and performance of every structure.
              </p>
              <p className="text-gray-600 mb-6">
                Our team of certified professionals uses only the highest quality materials from globally recognized brands like Sika, Mapei, and BASF.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: '10+', label: 'Years' },
                  { value: '500+', label: 'Projects' },
                  { value: '100%', label: 'Guarantee' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="font-display text-xl lg:text-2xl font-bold text-primary-600">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=600&q=80"
                alt="Topline Flooring team"
                className="rounded-xl shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Materials Shop Section */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy-900">
                Materials Shop
              </h2>
              <p className="text-gray-600 text-sm">Premium materials from trusted brands</p>
            </div>
            <Link href="/shop" className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {products.map((product) => (
                <div key={product.id} className="card group">
                  <Link href={`/product/${product.slug}`}>
                    <div className="aspect-square overflow-hidden bg-gray-100">
                      <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80'}
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
            <div className="text-center py-8 bg-gray-50 rounded-xl border">
              <p className="text-gray-500">No featured products</p>
            </div>
          )}
        </div>
      </section>

      {/* Partners */}
      {partners.length > 0 && (
        <section className="py-8 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs text-gray-500 uppercase tracking-wide mb-4">
              Our Partners
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-10 opacity-60">
              {partners.map((partner) => (
                <div key={partner.id}>
                  {partner.logo_url ? (
                    <img src={partner.logo_url} alt={partner.name} className="h-8 object-contain" />
                  ) : (
                    <span className="font-semibold text-gray-700 text-sm">{partner.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                What Clients Say
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {testimonials.slice(0, 4).map((t) => (
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
      <section className="py-12 lg:py-16 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-3">
            Ready to Start Your Project?
          </h2>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto text-sm lg:text-base">
            Get in touch with our team for a free consultation and quotation.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/quotation" className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm shadow-lg">
              Get Free Quote
            </Link>
            <a href="tel:+254700123456" className="bg-white text-navy-900 px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-100">
              <Phone className="w-4 h-4 inline mr-2" />
              Call Now
            </a>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
