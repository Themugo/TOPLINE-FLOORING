import { useState, useEffect } from "react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/utils";
import { ArrowRight, ShoppingCart, Star, Shield, Award, Zap } from "lucide-react";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  image_url: string;
  button_text: string;
  button_link: string;
  display_order: number;
}

const MARKET_PRODUCTS = [
  {
    id: '1',
    name: 'APP Bituminous Membrane',
    description: 'Professional waterproofing membrane for flat roofs, foundations, and basements. Heat-applied system providing excellent waterproof protection with 10+ year warranty.',
    price: 2500,
    unit: 'sqm',
    category: 'Waterproofing',
    rating: 5,
    features: ['10+ Year Warranty', 'Heat-Applied', 'UV Resistant', 'Crack-Bridging'],
    icon: Shield
  },
  {
    id: '2',
    name: 'Epoxy Flooring System',
    description: 'Complete epoxy flooring system installation including surface preparation, priming, and coating. Available in various colors and finishes for industrial and commercial spaces.',
    price: 3500,
    unit: 'sqm',
    category: 'Flooring',
    rating: 5,
    features: ['Chemical Resistant', 'Easy Clean', 'Custom Colors', 'Heavy Duty'],
    icon: Award
  },
  {
    id: '3',
    name: 'Polyurethane Coating',
    description: 'Flexible polyurethane flooring with crack-bridging properties. Ideal for areas with thermal movement and substrate cracks. UV stable and chemical resistant.',
    price: 4200,
    unit: 'sqm',
    category: 'Coatings',
    rating: 5,
    features: ['Flexible', 'UV Stable', 'Chemical Resistant', 'Weather Proof'],
    icon: Zap
  }
];

export default function Market() {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeroSlides();
  }, []);

  const loadHeroSlides = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (data) {
      setHeroSlides(data as HeroSlide[]);
    }
    setLoading(false);
  };

  const getMarketProduct = (index: number) => {
    return MARKET_PRODUCTS[index % MARKET_PRODUCTS.length];
  };

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Market" }]} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/90 to-primary py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Marketplace</h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Explore our premium flooring and waterproofing solutions. Quality products backed by expert installation services.
          </p>
        </div>
      </section>

      {/* Market Grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {heroSlides.map((slide, index) => {
                const product = getMarketProduct(index);
                const Icon = product.icon;
                return (
                  <div key={slide.id} className="group bg-card border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 rounded-sm overflow-hidden">
                    {/* Image */}
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-sm uppercase tracking-wider">
                          {product.category}
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="font-display text-xl font-bold text-white mb-1">{slide.title}</h3>
                        <p className="text-white/80 text-sm line-clamp-2">{slide.subtitle}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < product.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground ml-2">({product.rating}.0)</span>
                      </div>

                      <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                        {product.description}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.features.slice(0, 3).map((feature) => (
                          <span key={feature} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-sm">
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Price and CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div>
                          <span className="font-display font-bold text-xl text-foreground">{formatKES(product.price)}</span>
                          <span className="text-sm text-muted-foreground ml-1">/{product.unit}</span>
                        </div>
                        <Link href={slide.button_link || '/shop'}>
                          <Button size="sm" className="rounded-sm font-sans uppercase tracking-wide text-xs">
                            <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                            View
                          </Button>
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

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground mb-4">Need Custom Solutions?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Contact our experts for personalized recommendations and quotes for your specific project requirements.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/quotation">
              <Button className="rounded-sm font-sans uppercase tracking-wide text-sm h-11 px-8">
                Get Quote <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="rounded-sm font-sans uppercase tracking-wide text-sm h-11 px-8">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
