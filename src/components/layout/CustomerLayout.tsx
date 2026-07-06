import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, Menu, X, Phone, MessageCircle, Search, FileText, LogIn, MoreHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useCmsContent } from "@/hooks/use-cms-content";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Our Services" },
  { href: "/contact", label: "Contact Us" },
  { href: "/quotation", label: "Request Quotation" },
];

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const { content: footerContent } = useCmsContent("footer");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

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

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  const footerCompanyDesc = footerContent.company?.description || "Building Trust and Protection, One Surface at a Time. Professional flooring and waterproofing solutions for industrial, commercial, and residential projects across Kenya and East Africa.";
  const footerContact = footerContent.contact || { address: "Nairobi, Kenya", phone: "0720 859 737 / 0755 293 372", email: "toplineflooringandwaterproofin@gmail.com" };
  
  let footerLinks = [
    { label: "About Us", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Shop", href: "/shop" },
    { label: "Projects", href: "/portfolio" },
    { label: "Industries", href: "/industries" },
    { label: "FAQs", href: "/faq" },
    { label: "Request Quote", href: "/quotation" },
    { label: "Contact", href: "/contact" },
  ];
  
  if (footerContent.links?.quick_links) {
    try {
      const parsed = typeof footerContent.links.quick_links === 'string' 
        ? JSON.parse(footerContent.links.quick_links) 
        : footerContent.links.quick_links;
      if (Array.isArray(parsed)) {
        footerLinks = parsed;
      }
    } catch (e) {
      // Use default links if parsing fails
    }
  }
  
  const footerCredit = footerContent.copyright?.credit || "Web Design by frameworkstech.site";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      {/* Top bar */}
      <div className="hidden md:block bg-secondary text-secondary-foreground/60 text-xs py-2 border-b border-white/5">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <span className="font-medium tracking-wide">Professional Flooring & Waterproofing Marketplace</span>
          <div className="flex items-center gap-4">
            <a href="tel:0720859737" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Phone className="h-3.5 w-3.5" />
              0720 859 737
            </a>
            <a href="https://wa.me/254720859737" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center font-display font-bold text-base rounded-sm group-hover:bg-primary/90 transition-colors">
              TF
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-bold text-lg tracking-tight text-foreground block leading-none">Topline Flooring</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-sans font-medium">&amp; Waterproofing</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-sans font-semibold transition-colors tracking-wide uppercase rounded-sm",
                  isActive(link.href)
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
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

            {/* WhatsApp */}
            <a
              href="https://wa.me/254720859737"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex p-2 text-muted-foreground hover:text-[#25D366] transition-colors"
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>

            {/* Request Quote */}
            <Link
              href="/quotation"
              className="hidden md:inline-flex p-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Request a quote"
            >
              <FileText className="h-4 w-4" />
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative p-2 text-foreground hover:text-primary transition-colors" aria-label="Shopping cart">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center font-sans">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Admin Login - direct link */}
            <Link
              href="/admin/login"
              className="hidden md:inline-flex p-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Admin Login"
            >
              <LogIn className="h-4 w-4" />
            </Link>

            {/* More dropdown */}
            <div
              className="relative hidden lg:block"
              onMouseEnter={() => handleDropdownEnter("more")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                className={cn(
                  "flex items-center gap-1 p-2 text-sm font-sans font-medium transition-colors rounded-sm",
                  openDropdown === "more"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="More"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {openDropdown === "more" && (
                <div
                  className="absolute top-full right-0 mt-1 w-48 bg-background border border-border rounded-sm shadow-xl py-2 z-50"
                  onMouseEnter={() => handleDropdownEnter("more")}
                  onMouseLeave={handleDropdownLeave}
                >
                  <Link
                    href="/industries"
                    className="block px-4 py-2 text-sm font-sans transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Industries
                  </Link>
                  <Link
                    href="/faq"
                    className="block px-4 py-2 text-sm font-sans transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    FAQs
                  </Link>
                  <Link
                    href="/track-order"
                    className="block px-4 py-2 text-sm font-sans transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Track Order
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 text-foreground"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <>
        {/* Overlay */}
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
            isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={closeMobile}
        />

        {/* Drawer panel */}
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-background z-50 shadow-2xl transition-transform duration-300 flex flex-col",
            isMobileOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Close button */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
            <span className="font-display font-semibold text-sm tracking-tight">Menu</span>
            <button
              onClick={closeMobile}
              className="p-2 text-foreground hover:text-muted-foreground transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Mobile search */}
            <div className="px-4 pt-4 pb-2">
              <form onSubmit={(e) => { handleSearch(e); closeMobile(); }}>
                <div className="relative">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="h-12 text-base rounded-sm pr-12"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Search">
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>

            <nav className="flex flex-col px-4 pb-4">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "block px-4 py-4 text-lg font-sans uppercase tracking-wide font-semibold transition-colors rounded-sm",
                    isActive(link.href) ? "text-primary bg-primary/5" : "text-muted-foreground"
                  )}
                  onClick={closeMobile}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* More section */}
            <div className="px-4 pb-2">
              <div className="border-t border-border pt-4">
                <span className="block px-3 py-2 text-xs uppercase tracking-widest font-semibold text-muted-foreground/60">
                  More
                </span>
                <div className="space-y-1">
                  <Link
                    href="/admin/login"
                    className="flex items-center gap-3 px-3 py-3 text-base font-sans transition-colors text-muted-foreground hover:text-foreground rounded-sm"
                    onClick={closeMobile}
                  >
                    <LogIn className="h-5 w-5" />
                    Admin Login
                  </Link>
                  <Link
                    href="/industries"
                    className="block px-3 py-3 text-base font-sans transition-colors text-muted-foreground hover:text-foreground rounded-sm"
                    onClick={closeMobile}
                  >
                    Industries
                  </Link>
                  <Link
                    href="/faq"
                    className="block px-3 py-3 text-base font-sans transition-colors text-muted-foreground hover:text-foreground rounded-sm"
                    onClick={closeMobile}
                  >
                    FAQs
                  </Link>
                  <Link
                    href="/track-order"
                    className="block px-3 py-3 text-base font-sans transition-colors text-muted-foreground hover:text-foreground rounded-sm"
                    onClick={closeMobile}
                  >
                    Track Order
                  </Link>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="px-4 pb-6">
              <div className="border-t border-border pt-4 space-y-2">
                <a
                  href="tel:0720859737"
                  className="flex items-center gap-3 px-3 py-3 text-base text-muted-foreground hover:text-foreground transition-colors rounded-sm"
                  onClick={closeMobile}
                >
                  <Phone className="h-5 w-5" />
                  0720 859 737
                </a>
                <a
                  href="https://wa.me/254720859737"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-3 text-base text-muted-foreground hover:text-[#25D366] transition-colors rounded-sm"
                  onClick={closeMobile}
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </>

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

      {/* Footer */}
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
                {footerCompanyDesc}
              </p>
              <div className="space-y-2 text-sm text-secondary-foreground/60">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>0720 859 737 / 0755 293 372</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">📍</span>
                  <span>Nairobi, Kenya</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">📧</span>
                  <span>toplineflooringandwaterproofin@gmail.com</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-white mb-5">Quick Links</h3>
              <ul className="space-y-2 text-sm text-secondary-foreground/50 font-light">
                {footerLinks.map((link: { label: string; href: string }) => (
                  <li key={link.href}><Link href={link.href} className="hover:text-primary transition-colors">{link.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-white mb-5">Contact</h3>
              <address className="not-italic text-sm text-secondary-foreground/50 font-light space-y-2">
                <p>{footerContact.address}</p>
                <p>{footerContact.phone}</p>
                <p className="break-all">{footerContact.email}</p>
                <Link href="/contact" className="text-primary hover:underline block mt-3">Contact Page</Link>
              </address>
            </div>
          </div>

          <div className="h-px bg-white/10 mb-8" />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-secondary-foreground/40 font-sans">
            <p>&copy; {new Date().getFullYear()} Topline Flooring and Waterproofing. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/admin/login" className="hover:text-primary transition-colors">Admin</Link>
              <span className="text-secondary-foreground/30">{footerCredit}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
