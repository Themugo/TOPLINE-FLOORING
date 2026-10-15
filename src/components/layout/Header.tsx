import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, ShoppingCart, Phone, Mail, MapPin, LogIn, Facebook, Instagram, Linkedin, UserRound, ClipboardCheck, ChevronDown, Home, Wrench, Briefcase, ShoppingBag, MessageSquareQuote, ChevronRight, Search } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useSiteSettings, useNavigationMenus } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';

const getMobileNavIcon = (href: string) => {
  if (href === '/') return Home;
  if (href.startsWith('/services')) return Wrench;
  if (href.startsWith('/portfolio')) return Briefcase;
  if (href.startsWith('/shop')) return ShoppingBag;
  if (href.startsWith('/track-order')) return ClipboardCheck;
  if (href.startsWith('/contact')) return MessageSquareQuote;
  if (href.startsWith('/quotation')) return ClipboardCheck;
  if (href.startsWith('/portal')) return UserRound;
  return ChevronRight;
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [location, setLocation] = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!mobileMenuOpen && !moreMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen, moreMenuOpen]);
  const { totalItems } = useCart();
  const { settings } = useSiteSettings();
  const { menus } = useNavigationMenus('header');

  // Canonical brand lock: the logo wordmark and descriptor are brand assets, not CMS copy.
  // Keep the identity consistent across desktop, mobile, footer and future app surfaces.
  const tagline = 'FLOORING & WATERPROOFING';
  const brandPromise = 'Professional Solutions for Lasting Spaces';
  const phone = settings.contact?.phone || '';
  const email = settings.contact?.email || '';
  const address = settings.contact?.address || '';

  const social = settings.social_links || {};
  const socialLinks = [
    { key: 'facebook', url: social.facebook, Icon: Facebook },
    { key: 'instagram', url: social.instagram, Icon: Instagram },
    { key: 'linkedin', url: social.linkedin, Icon: Linkedin },
  ].filter((s) => !!s.url);

  const navLinks = (menus.length > 0 ? menus : [
    { href: '/', label: 'Home', open_in_new_tab: false },
    { href: '/services', label: 'Services', open_in_new_tab: false },
    { href: '/portfolio', label: 'Portfolio', open_in_new_tab: false },
    { href: '/shop', label: 'Shop', open_in_new_tab: false },
    { href: '/track-order', label: 'Track Order', open_in_new_tab: false },
    { href: '/contact', label: 'Contact', open_in_new_tab: false },
    { href: '/quotation', label: 'Get Quote', open_in_new_tab: false },
  ]).filter((link) => link.href && link.label);

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  // Keep the desktop navigation focused on the main customer journeys. Secondary
  // destinations remain available under More and in the complete mobile menu.
  const primaryOrder = ['/', '/services', '/portfolio', '/shop'];
  const primaryLinks = primaryOrder
    .map((href) => navLinks.find((link) => link.href === href))
    .filter((link): link is (typeof navLinks)[number] => Boolean(link));
  const secondaryLinks = navLinks.filter((link) =>
    !primaryOrder.includes(link.href) && link.href !== '/quotation' && link.href !== '/portal' && link.href !== '/admin/login'
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 shadow-[0_8px_28px_rgba(12,45,87,.09)]">
      {/* Top utility bar - contact info + social, desktop only */}
      <div className="hidden lg:block bg-[#0C2D57] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 xl:px-8">
          <div className="flex items-center justify-between h-9 text-xs">
            <div className="flex items-center gap-5 text-navy-100">
              {address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#B4E33D]" />
                  {address}
                </span>
              )}
              {phone && (
                <a href={telHref(phone)} className="flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-[#B4E33D]" />
                  {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-[#B4E33D]" />
                  {email}
                </a>
              )}
            </div>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map(({ key, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-200 hover:text-[#B4E33D] transition-colors"
                    aria-label={`Visit our ${key} page`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 xl:px-8">
          <div className="flex items-center justify-between min-h-16 lg:min-h-20 gap-2 sm:gap-3">
            <Link
              href="/"
              className="group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3 rounded-xl py-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2"
              aria-label="Topline Flooring and Waterproofing home"
            >
              <img
                src="/topline-brand-mark.svg"
                alt=""
                aria-hidden="true"
                className="h-9 w-9 sm:h-12 sm:w-[3.35rem] lg:h-[3.35rem] lg:w-[3.75rem] shrink-0 object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                width="72"
                height="64"
              />
              <span className="min-w-0 flex flex-col justify-center">
                <span className="block font-display text-[19px] sm:text-[21px] lg:text-[23px] font-extrabold leading-[0.98] tracking-[-0.045em] text-[#0C2D57]">Topline</span>
                <span className="mt-1 block whitespace-nowrap text-[7px] sm:text-[9px] lg:text-[10px] font-extrabold leading-tight tracking-[0.005em] sm:tracking-[0.045em] text-[#0C2D57]">{tagline}</span>
                <span className="mt-1 hidden lg:block whitespace-nowrap text-[9px] font-medium leading-tight tracking-[0.13em] text-slate-500">{brandPromise}</span>
                <span className="mt-1 hidden sm:block lg:hidden text-[8px] font-semibold leading-tight tracking-[0.06em] text-slate-500">Professional solutions for lasting spaces</span>
              </span>
            </Link>

            <nav className="hidden lg:flex min-w-0 items-center gap-1" aria-label="Main navigation">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative whitespace-nowrap px-2.5 xl:px-3 py-2.5 text-[12px] xl:text-[13px] font-semibold rounded-xl transition-colors ${
                    isActive(link.href)
                      ? 'text-[#0C2D57]'
                      : 'text-slate-600 hover:text-[#0C2D57] hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute left-4 right-4 -bottom-0.5 h-0.5 bg-[#B4E33D] rounded-full" />
                  )}
                </Link>
              ))}
              {secondaryLinks.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen((open) => !open)}
                    aria-expanded={moreMenuOpen}
                    aria-haspopup="menu"
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${secondaryLinks.some((link) => isActive(link.href)) ? 'text-[#0C2D57]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0C2D57]'}`}
                  >
                    More <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {moreMenuOpen && (
                    <>
                      <button type="button" aria-label="Close navigation menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setMoreMenuOpen(false)} />
                      <div role="menu" className="absolute right-0 top-full z-50 mt-2 min-w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                        {secondaryLinks.map((link) => (
                          <Link key={link.href} href={link.href} role="menuitem" onClick={() => setMoreMenuOpen(false)} className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive(link.href) ? 'bg-slate-50 font-semibold text-[#0C2D57]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0C2D57]'}`}>
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
              <button
                type="button"
                className="lg:hidden inline-flex h-10 w-9 sm:w-10 items-center justify-center rounded-xl text-[#0C2D57] hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]"
                aria-label={mobileSearchOpen ? 'Close product search' : 'Search products'}
                aria-expanded={mobileSearchOpen}
                onClick={() => { setMobileSearchOpen((open) => !open); setMobileMenuOpen(false); }}
              ><Search className="h-5 w-5" aria-hidden="true" /></button>
              {phone && <a href={telHref(phone)} className="lg:hidden inline-flex h-10 w-9 sm:w-10 items-center justify-center rounded-xl text-[#0C2D57] hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]" aria-label="Call Topline"><Phone className="h-5 w-5" aria-hidden="true" /></a>}
              <Link
                href="/portal"
                className="hidden sm:flex items-center gap-2 px-2.5 py-2 text-[13px] font-semibold text-slate-600 hover:text-[#0C2D57] hover:bg-slate-50 rounded-lg transition-colors"
                aria-label="Customer account"
              >
                <UserRound className="w-4 h-4" />
                <span>My Account</span>
              </Link>

              <Link
                href="/cart"
                className="relative rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-[#F7F6F3] hover:text-[#0C2D57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]"
                aria-label={`Shopping cart${totalItems > 0 ? `, ${totalItems} items` : ''}`}
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0C2D57] text-white text-xs font-medium rounded-full flex items-center justify-center" aria-hidden="true">
                    {totalItems}
                  </span>
                )}
              </Link>

              <Link
                href="/quotation"
                className="hidden md:flex items-center gap-2 px-4 xl:px-5 py-3 text-[12px] xl:text-[13px] font-bold rounded-xl bg-[#0C2D57] text-white hover:bg-[#123766] transition-all shadow-[0_5px_14px_rgba(12,45,87,.18)] hover:shadow-[0_8px_20px_rgba(12,45,87,.22)] active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4E33D] focus-visible:ring-offset-2"
              >
                Request Quotation
              </Link>

              <Link
                href="/admin/login"
                className="hidden xl:flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0C2D57] transition-colors"
                title="Admin Login"
              >
                <LogIn className="w-4 h-4" />
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden shrink-0 rounded-xl border border-slate-200/80 bg-white p-2.5 text-[#0C2D57] shadow-sm hover:border-[#B4E33D]/70 hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <form
          className="lg:hidden border-t border-[#E3DFD8] bg-white p-3 shadow-lg"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const query = mobileSearchQuery.trim();
            setMobileSearchOpen(false);
            if (query) setLocation(`/shop?search=${encodeURIComponent(query)}`);
            else setLocation('/shop');
          }}
        >
          <label htmlFor="topline-mobile-product-search" className="sr-only">Search flooring and waterproofing products</label>
          <div className="mx-auto flex max-w-3xl gap-2">
            <input id="topline-mobile-product-search" type="search" value={mobileSearchQuery} onChange={(event) => setMobileSearchQuery(event.target.value)} placeholder="Search flooring, tiles, waterproofing…" className="min-w-0 flex-1 rounded-xl border border-[#D8DDE4] bg-[#F7F6F3] px-4 py-3 text-sm text-[#0C2D57] outline-none focus:border-[#0E6B78] focus:ring-2 focus:ring-[#0E6B78]/20" />
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0C2D57] px-4 text-sm font-bold text-white"><Search className="h-4 w-4" />Search</button>
          </div>
        </form>
      )}

      {mobileMenuOpen && (
        <div id="mobile-menu" className="topline-mobile-menu lg:hidden border-t border-[#E3DFD8] bg-[#F7F6F3] shadow-[0_18px_42px_rgba(12,45,87,.16)] max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
          <nav className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6 sm:py-5" aria-label="Mobile navigation">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#566F0D]">Explore Topline</span>
              <span className="rounded-full bg-[#B4E33D]/20 px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#0C2D57]">FLOORING · WATERPROOFING</span>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`group flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F6F3] ${
                  isActive(link.href)
                    ? 'border-[#B4E33D] bg-white text-[#0C2D57] shadow-[0_3px_12px_rgba(12,45,87,.07)]'
                    : 'border-transparent bg-transparent text-[#334155] hover:border-[#E3DFD8] hover:bg-white hover:text-[#0C2D57]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive(link.href) ? 'bg-[#B4E33D]/25 text-[#0C2D57]' : 'bg-white text-[#0E6B78] ring-1 ring-inset ring-[#0E6B78]/10 group-hover:bg-[#EAF1F0]'}`}>
                    {(() => { const Icon = getMobileNavIcon(link.href); return <Icon className="h-[18px] w-[18px]" aria-hidden="true" />; })()}
                  </span>
                  <span className="truncate">{link.label}</span>
                </span>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive(link.href) ? 'text-[#566F0D]' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#0C2D57]'}`} aria-hidden="true" />
              </Link>
            ))}
            <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#D8D4CC] pt-4 sm:grid-cols-2">
              <Link href="/portal" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-[#0E6B78]/15 bg-[#0E6B78]/5 px-4 py-3.5 text-sm font-bold text-[#0C2D57] transition-colors hover:bg-[#0E6B78]/10">
                <UserRound className="w-4 h-4" />
                <span>My Customer Account</span>
              </Link>
              <Link href="/track-order" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-[#0C2D57] transition-colors hover:bg-[#F7F6F3]">
                <ClipboardCheck className="w-4 h-4" />
                <span>Track an Order</span>
              </Link>
              {phone && (
                <a
                  href={telHref(phone)}
                  className="flex items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-[#0C2D57] transition-colors hover:bg-[#F7F6F3]"
                >
                  <Phone className="w-4 h-4" />
                  <span>{phone}</span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-[#0C2D57] transition-colors hover:bg-[#F7F6F3]"
                >
                  <Mail className="w-4 h-4" />
                  <span>{email}</span>
                </a>
              )}
              <Link
                href="/quotation"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-12 items-center justify-between rounded-xl bg-[#0C2D57] px-5 py-4 text-sm font-bold text-white shadow-[0_6px_16px_rgba(12,45,87,.18)] transition-all hover:bg-[#123766] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4E33D] focus-visible:ring-offset-2 sm:col-span-2"
              >
                <span>Request a quotation</span>
                <span aria-hidden="true" className="text-lg">→</span>
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-[#0C2D57] transition-colors hover:bg-[#F7F6F3]"
              >
                <LogIn className="w-4 h-4" />
                <span>Admin Login</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
