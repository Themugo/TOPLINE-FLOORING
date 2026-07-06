import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, Menu, X, Phone, MessageCircle, Search, ChevronDown, FileText, LogIn } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    {
      label: "Services",
      dropdown: [
        { href: "/services", label: "All Services" },
        { href: "/shop?type=service&category=1", label: "APP Waterproofing" },
        { href: "/shop?type=service&category=2", label: "Epoxy Flooring" },
        { href: "/shop?type=service&category=3", label: "Concrete Repair" },
        { href: "/shop?type=service", label: "View All Services" },
      ],
    },
    {
      label: "Shop",
      dropdown: [
        { href: "/shop", label: "All Products" },
        { href: "/shop?type=material", label: "Materials" },
        { href: "/shop?type=service", label: "Services" },
      ],
    },
    { href: "/portfolio", label: "Projects" },
    { href: "/industries", label: "Industries" },
    { href: "/faq", label: "FAQs" },
    { href: "/quotation", label: "Get a Quote" },
    { href: "/contact", label: "Contact" },
  ];

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setOpenDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 200);
  };

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

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
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="bg-primary text-primary-foreground h-9 w-9 flex items-center justify-center font-display font-bold text-sm rounded-sm group-hover:bg-primary/90 transition-colors">
              TF
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-semibold text-lg tracking-tight text-foreground block leading-none">Topline Flooring</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-sans">&amp; Waterproofing</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) =>
              "dropdown" in link ? (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(link.label)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <button
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 text-sm font-sans font-medium transition-colors tracking-wide uppercase text-[11px] rounded-sm",
                      openDropdown === link.label || link.dropdown.some((d) => isActive(d.href))
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label} <ChevronDown className="h-3 w-3" />
                  </button>
                  {openDropdown === link.label && (
                    <div
                      className="absolute top-full left-0 mt-1 w-56 bg-background border border-border rounded-sm shadow-xl py-2 z-50"
                      onMouseEnter={() => handleDropdownEnter(link.label)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "block px-4 py-2 text-sm font-sans transition-colors",
                            isActive(item.href)
                              ? "text-primary bg-primary/5"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 text-sm font-sans font-medium transition-colors tracking-wide uppercase text-[11px] rounded-sm",
                    isActive(link.href)
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              )
            )}
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-sans font-medium transition-colors tracking-wide uppercase text-[11px] rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted ml-2"
              aria-label="Admin Login"
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              {searchOpen ? (
                <div className="flex items-center gap-1">
                  <Input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="h-8 w-48 text-xs rounded-sm"
                    onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                  />
                  <button type="submit" className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Search">
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Open search"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}
            </form>

            <Link href="/cart" className="relative p-2 text-foreground hover:text-primary transition-colors" aria-label="Shopping cart">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center font-sans">
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              className="lg:hidden p-2 text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background max-h-[80vh] overflow-y-auto">
            <nav className="flex flex-col py-4 px-6 space-y-1">
              {/* Mobile search */}
              <form onSubmit={handleSearch} className="mb-3">
                <div className="relative">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="h-9 text-sm rounded-sm pr-9"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Search">
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {navLinks.map((link) =>
                "dropdown" in link ? (
                  <div key={link.label}>
                    <span className="block px-3 py-2.5 text-sm font-sans uppercase tracking-widest font-semibold text-foreground/60">
                      {link.label}
                    </span>
                    {link.dropdown.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block pl-6 pr-3 py-2 text-sm font-sans transition-colors",
                          isActive(item.href) ? "text-primary" : "text-muted-foreground"
                        )}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "block px-3 py-2.5 text-sm font-sans uppercase tracking-widest font-medium transition-colors rounded-sm",
                      isActive(link.href) ? "text-primary bg-primary/5" : "text-muted-foreground"
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              )}

              <div className="pt-3 mt-3 border-t border-border">
                <a
                  href="tel:0720859737"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Phone className="h-4 w-4" />
                  0720 859 737
                </a>
                <a
                  href="https://wa.me/254720859737"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-[#25D366]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <Link
          href="/quotation"
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all"
          aria-label="Request a quote"
        >
          <FileText className="h-6 w-6" />
        </Link>
        <a
          href="https://wa.me/254720859737?text=Hello%20Topline%2C%20I%27d%20like%20to%20enquire%20about%20your%20flooring%20and%20waterproofing%20services."
          target="_blank"
          rel="noopener noreferrer"
          className="h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:bg-[#22c55e] hover:scale-105 transition-all"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      </div>

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
              <h3 className="font-display text-base font-semibold text-white mb-5">Quick Links</h3>
              <ul className="space-y-2 text-sm text-secondary-foreground/50 font-light">
                <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/services" className="hover:text-primary transition-colors">Services</Link></li>
                <li><Link href="/shop" className="hover:text-primary transition-colors">Shop</Link></li>
                <li><Link href="/portfolio" className="hover:text-primary transition-colors">Projects</Link></li>
                <li><Link href="/industries" className="hover:text-primary transition-colors">Industries</Link></li>
                <li><Link href="/faq" className="hover:text-primary transition-colors">FAQs</Link></li>
                <li><Link href="/quotation" className="hover:text-primary transition-colors">Request Quote</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
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
            <div className="flex items-center gap-4">
              <Link href="/admin/login" className="hover:text-primary transition-colors">Admin</Link>
              <span className="text-secondary-foreground/30">Web Design by frameworkstech.site</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
