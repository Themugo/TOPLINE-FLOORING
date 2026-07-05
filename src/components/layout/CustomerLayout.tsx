import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, Menu, X, Phone, MessageCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Services & Materials" },
    { href: "/quotation", label: "Get a Quote" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      {/* Top bar */}
      <div className="hidden md:block bg-secondary text-secondary-foreground/60 text-xs py-2 border-b border-white/5">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <span className="font-light tracking-wide">Professional Flooring & Waterproofing Solutions</span>
          <div className="flex items-center gap-4">
            <a href="tel:0720859737" className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Phone className="h-3 w-3" />
              0720 859 737
            </a>
            <a href="https://wa.me/254720859737" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-primary text-primary-foreground h-9 w-9 flex items-center justify-center font-display font-bold text-sm rounded-sm group-hover:bg-primary/90 transition-colors">
              TF
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-semibold text-lg tracking-tight text-foreground block leading-none">Topline Flooring</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-sans">&amp; Waterproofing</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-sans font-medium transition-colors tracking-wide uppercase text-[11px]",
                  location === link.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/cart" className="relative p-2 text-foreground hover:text-primary transition-colors" aria-label="Shopping cart">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center font-sans">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="flex flex-col py-4 px-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-sans uppercase tracking-widest font-medium transition-colors",
                    location === link.href ? "text-primary" : "text-muted-foreground"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/254720859737?text=Hello%20Topline%2C%20I%27d%20like%20to%20enquire%20about%20your%20flooring%20and%20waterproofing%20services."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:bg-[#22c55e] hover:scale-105 transition-all"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      <footer className="bg-secondary text-secondary-foreground mt-auto">
        <div className="container mx-auto px-6 md:px-12 pt-16 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-primary text-primary-foreground h-9 w-9 flex items-center justify-center font-display font-bold text-sm rounded-sm">
                  TF
                </div>
                <div>
                  <span className="font-display font-semibold text-base text-white block leading-none">Topline Flooring</span>
                  <span className="text-[10px] text-secondary-foreground/50 uppercase tracking-[0.15em] font-sans">&amp; Waterproofing</span>
                </div>
              </div>
              <p className="text-secondary-foreground/50 text-sm max-w-md leading-relaxed font-light mb-4">
                Building Trust and Protection, One Surface at a Time. Professional flooring and waterproofing solutions for industrial, commercial, and residential projects across Kenya and East Africa.
              </p>
              <div className="flex items-center gap-3 text-sm text-secondary-foreground/60">
                <Phone className="h-4 w-4 text-primary" />
                <span>0720 859 737 / 0755 293 372</span>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-white mb-5">Services</h3>
              <ul className="space-y-2 text-sm text-secondary-foreground/50 font-light">
                <li><Link href="/shop?type=service" className="hover:text-primary transition-colors">APP Waterproofing</Link></li>
                <li><Link href="/shop?type=service" className="hover:text-primary transition-colors">Epoxy Flooring</Link></li>
                <li><Link href="/shop?type=service" className="hover:text-primary transition-colors">Concrete Repair</Link></li>
                <li><Link href="/shop?type=service" className="hover:text-primary transition-colors">Roof Coating</Link></li>
                <li><Link href="/quotation" className="hover:text-primary transition-colors">Request Quote</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-white mb-5">Contact</h3>
              <address className="not-italic text-sm text-secondary-foreground/50 font-light space-y-2">
                <p>Nairobi, Kenya</p>
                <p>0720 859 737 / 0755 293 372</p>
                <p className="break-all">toplineflooringandwaterproofin@gmail.com</p>
                <Link href="/contact" className="text-primary hover:underline block mt-3">Contact Page</Link>
              </address>
            </div>
          </div>

          <div className="h-px bg-white/10 mb-8" />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-secondary-foreground/40 font-sans">
            <p>&copy; {new Date().getFullYear()} Topline Flooring and Waterproofing. All rights reserved.</p>
            <p className="text-secondary-foreground/30">Web Design by frameworkstech.site</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
