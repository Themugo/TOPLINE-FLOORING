import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Phone, ArrowRight } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-data";
import { telHref } from "@/lib/utils";

type Slide = {
  id: string | number;
  title: string;
  subtitle?: string | null;
  image_url: string;
  button_text?: string | null;
  button_link?: string | null;
};

interface HeroSliderProps {
  slides: Slide[];
  overlayOpacity?: number;
  autoPlayInterval?: number;
}

export default function HeroSlider({
  slides,
  overlayOpacity = 60,
  autoPlayInterval = 4000,
}: HeroSliderProps) {
  const { settings } = useSiteSettings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_SWIPE = 50;

  const goToSlide = useCallback((idx: number) => {
    setCurrentSlide(idx);
  }, []);

  const goToPrev = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  }, [currentSlide, slides.length, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length);
  }, [currentSlide, slides.length, goToSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext]);

  useEffect(() => {
    if (slides.length === 0 || isInteracting) return;
    const t = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(t);
  }, [currentSlide, slides.length, isInteracting, goToNext, autoPlayInterval]);

  const clearInteractionTimer = () => {
    if (interactionTimer.current) {
      clearTimeout(interactionTimer.current);
      interactionTimer.current = null;
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    setIsInteracting(true);
    clearInteractionTimer();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > MIN_SWIPE) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    clearInteractionTimer();
    interactionTimer.current = setTimeout(() => {
      setIsInteracting(false);
    }, 3000);
  }, [goToNext, goToPrev]);

  const handleMouseEnter = useCallback(() => {
    setIsInteracting(true);
    clearInteractionTimer();
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsInteracting(false);
    clearInteractionTimer();
  }, []);

  useEffect(() => {
    return () => {
      clearInteractionTimer();
    };
  }, []);

  if (slides.length === 0) return null;

  return (
    <section
      className="relative w-full overflow-hidden min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] lg:min-h-[80vh] max-h-[900px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero slideshow"
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${s.image_url})`,
            opacity: i === currentSlide ? 1 : 0,
            zIndex: i === currentSlide ? 1 : 0,
            transition: "opacity 600ms ease-in-out, transform 600ms ease-in-out",
          }}
        />
      ))}

      <div
        className="absolute inset-0 z-10"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,${(overlayOpacity / 100) * 0.5}) 50%, rgba(0,0,0,${(overlayOpacity / 100) * 0.3}) 100%)`,
        }}
      />

      <div className="absolute inset-0 z-20 flex flex-col justify-center lg:justify-end pb-12 sm:pb-16 md:pb-20 lg:pb-24 px-4 sm:px-8 md:px-16">
        <div className="max-w-4xl transition-all duration-500 ease-in-out">
          <p className="text-primary text-xs sm:text-sm uppercase tracking-[0.25em] font-sans font-medium mb-2 sm:mb-3 drop-shadow-sm">
            {settings?.company_name || 'Topline Flooring & Waterproofing'}
          </p>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold text-white leading-tight mb-2 sm:mb-3 max-w-4xl drop-shadow-lg">
            {slides[currentSlide].title}
          </h1>
          {slides[currentSlide].subtitle && (
            <p className="text-white/80 text-xs sm:text-sm md:text-base lg:text-lg font-sans font-light max-w-2xl mb-4 sm:mb-6 drop-shadow">
              {slides[currentSlide].subtitle}
            </p>
          )}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {slides[currentSlide].button_link && slides[currentSlide].button_text && (
              <Link href={slides[currentSlide].button_link!}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-medium px-5 sm:px-7 h-10 sm:h-11 rounded-sm tracking-wide text-xs sm:text-sm shadow-lg">
                  {slides[currentSlide].button_text} <ArrowRight className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </Link>
            )}
            <a href={telHref(settings?.phone || '+254 720 859 737')}>
              <Button
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 font-sans font-medium px-4 sm:px-6 h-10 sm:h-11 rounded-sm tracking-wide backdrop-blur-sm text-xs sm:text-sm shadow-lg"
              >
                <Phone className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                {settings?.phone || '0720 859 737'}
              </Button>
            </a>
          </div>
        </div>
      </div>

      <button
        onClick={goToPrev}
        className="absolute left-3 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/30 hover:bg-primary text-white flex items-center justify-center transition-all backdrop-blur-sm z-30 hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-3 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/30 hover:bg-primary text-white flex items-center justify-center transition-all backdrop-blur-sm z-30 hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`rounded-full transition-all duration-300 ${
              i === currentSlide
                ? "w-6 h-1.5 sm:w-8 sm:h-2 bg-primary"
                : "w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
