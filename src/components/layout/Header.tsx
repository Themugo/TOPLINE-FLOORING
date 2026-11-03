import { useEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { Link, useLocation } from 'wouter';
import { Menu, X, ShoppingCart, Phone, Mail, MapPin, LogIn, Facebook, Instagram, Linkedin, UserRound, ChevronDown, Home, Layers, Building2, Package, PackageSearch, Headset, ReceiptText, ChevronRight, Search, Info, Factory, Handshake, HelpCircle } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useSiteSettings, useNavigationMenus } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';
import { useBrand } from '@/hooks/use-brand';
import { BrandLockup } from '@/components/layout/BrandLockup';
import { NavAnchor } from '@/components/layout/NavAnchor';
import { isRouteActive } from '@/lib/nav-active';

const getMobileNavIcon = (href: string) => {
  if (href === '/') return Home;
  if (href.startsWith('/services')) return Layers;
  if (href.startsWith('/portfolio')) return Building2;
  if (href.startsWith('/shop')) return Package;
  if (href.startsWith('/track-order')) return PackageSearch;
  if (href.startsWith('/contact')) return Headset;
  if (href.startsWith('/quotation')) return ReceiptText;
  if (href.startsWith('/portal')) return UserRound;
  if (href.startsWith('/about')) return Info;
  if (href.startsWith('/industries')) return Factory;
  if (href.startsWith('/market')) return Handshake;
  if (href.startsWith('/faq')) return HelpCircle;
  return ChevronRight;
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [location, setLocation] = useLocation();
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const menuToggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location]);

  useEffect(() => {
    if (!mobileMenuOpen && !moreMenuOpen && !mobileSearchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setMoreMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen, moreMenuOpen, mobileSearchOpen]);
  useBodyScrollLock(mobileMenuOpen);
  // Keyboard and screen-reader users land on the first menu item when the menu opens, and return to the toggle when it closes.
  const menuWasOpen = useRef(false);
  useEffect(() => {
    if (mobileMenuOpen) {
      menuWasOpen.current = true;
      mobileNavRef.current?.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true });
    } else if (menuWasOpen.current) {
      menuWasOpen.current = false;
      menuToggleRef.current?.focus({ preventScroll: true });
    }
  }, [mobileMenuOpen]);
  const { totalItems } = useCart();
  const { settings } = useSiteSettings();
  const { menus } = useNavigationMenus('header');
  const { menus: mobileMenus } = useNavigationMenus('mobile');

  // Brand identity (logo, wordmark, descriptor, slogan) comes from Admin > Site Settings via useBrand, shared with the footer and admin.
  const brand = useBrand();
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
    { href: '/about', label: 'About', open_in_new_tab: false },
    { href: '/track-order', label: 'Track Order', open_in_new_tab: false },
    { href: '/contact', label: 'Contact', open_in_new_tab: false },
    { href: '/quotation', label: 'Get Quote', open_in_new_tab: false },
  ]).filter((link) => link.href && link.label);

  // The quotation CTA, customer account and order tracking have dedicated, always-visible places in the mobile menu,
  // so they are not repeated in the main list.
  const menuLinks = (mobileMenus.length > 0 ? mobileMenus.filter((l) => l.href && l.label) : navLinks).filter((link) => !['/quotation', '/portal', '/track-order', '/admin/login'].includes(link.href));

  // Pages that are not in the editable menu but must still be reachable. They appear under More (desktop) and
  // Company (phone) unless the editor already placed them in a menu.
  const COMPANY_PAGES = [
    { href: '/about', label: 'About Us' },
    { href: '/industries', label: 'Industries' },
    { href: '/market', label: 'Partners' },
    { href: '/faq', label: 'FAQs' },
  ];
  const isActive = (href: string) => isRouteActive(href, location);
  const mobileCompanyPages = COMPANY_PAGES.filter((page) => !menuLinks.some((link) => link.href === page.href));

  // Keep the desktop navigation focused on the main customer journeys. Secondary
  // destinations remain available under More and in the complete mobile menu.
  const primaryOrder = ['/', '/services', '/portfolio', '/shop'];
  const primaryLinks = primaryOrder
    .map((href) => navLinks.find((link) => link.href === href))
    .filter((link): link is (typeof navLinks)[number] => Boolean(link));
  const knownHrefs = new Set([...navLinks, ...mobileMenus].map((link) => link.href));
  const extraCompanyPages = COMPANY_PAGES.filter((page) => !knownHrefs.has(page.href));
  const secondaryLinks = [
    ...navLinks.filter((link) =>
      !primaryOrder.includes(link.href) && link.href !== '/quotation' && link.href !== '/portal' && link.href !== '/admin/login'
    ),
    ...extraCompanyPages.map((page) => ({ ...page, open_in_new_tab: false })),
  ];

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
              aria-label={`${brand.siteName} home`}
            >
              <BrandLockup variant="header" />
            </Link>

            <nav className="hidden lg:flex min-w-0 items-center gap-1" aria-label="Main navigation">
              {primaryLinks.map((link) => (
                <NavAnchor
                  key={link.href}
                  href={link.href}
                  newTab={link.open_in_new_tab}
                  aria-current={isActive(link.href) ? 'page' : undefined}
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
                </NavAnchor>
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
                          <NavAnchor key={link.href} href={link.href}
                  newTab={link.open_in_new_tab} role="menuitem" onClick={() => setMoreMenuOpen(false)} className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive(link.href) ? 'bg-slate-50 font-semibold text-[#0C2D57]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0C2D57]'}`}>
                            {link.label}
                          </NavAnchor>
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
                className="inline-flex h-11 w-10 sm:w-11 items-center justify-center rounded-xl text-[#0C2D57] hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]"
                aria-label={mobileSearchOpen ? 'Close product search' : 'Search products'}
                aria-expanded={mobileSearchOpen}
                onClick={() => { setMobileSearchOpen((open) => !open); setMobileMenuOpen(false); }}
              ><Search className="h-5 w-5" aria-hidden="true" /></button>
              {phone && <a href={telHref(phone)} className="lg:hidden inline-flex h-11 w-10 sm:w-11 items-center justify-center rounded-xl text-[#0C2D57] hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]" aria-label="Call Topline"><Phone className="h-5 w-5" aria-hidden="true" /></a>}
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
                <span className="hidden sm:inline text-xs font-semibold">Cart</span>
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
                ref={menuToggleRef}
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
          className="border-t border-[#E3DFD8] bg-white p-3 shadow-lg"
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
            <input id="topline-mobile-product-search" autoFocus type="search" value={mobileSearchQuery} onChange={(event) => setMobileSearchQuery(event.target.value)} placeholder="Search flooring, tiles, waterproofing…" className="min-w-0 flex-1 rounded-xl border border-[#D8DDE4] bg-[#F7F6F3] px-4 py-3 text-sm text-[#0C2D57] outline-none focus:border-[#0E6B78] focus:ring-2 focus:ring-[#0E6B78]/20" />
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0C2D57] px-4 text-sm font-bold text-white"><Search className="h-4 w-4" />Search</button>
          </div>
        </form>
      )}

      {mobileMenuOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 -z-10 cursor-default bg-[#0C2D57]/40 lg:hidden"
        />
      )}

      {mobileMenuOpen && (
        <div id="mobile-menu" className="topline-mobile-menu topline-menu-enter flex flex-col lg:hidden border-t border-[#E3DFD8] bg-[#F7F6F3] shadow-[0_18px_42px_rgba(12,45,87,.16)] max-h-[calc(100dvh-4rem)]">
          <nav ref={mobileNavRef} className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-5 sm:px-6" aria-label="Mobile navigation">
            <p className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#566F0D]">Explore Topline</p>
            <ul className="space-y-1">
              {menuLinks.map((link) => {
                const active = isActive(link.href);
                const Icon = getMobileNavIcon(link.href);
                return (
                  <li key={link.href}>
                    <NavAnchor
                      href={link.href}
                  newTab={link.open_in_new_tab}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive(link.href) ? 'page' : undefined}
                      className={`group relative flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F6F3] ${
                        active ? 'bg-white text-[#0C2D57] shadow-[0_2px_10px_rgba(12,45,87,.08)]' : 'text-[#334155] hover:bg-white/70 hover:text-[#0C2D57] active:bg-white'
                      }`}
                    >
                      {active && <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-[#B4E33D]" />}
                      <span className="flex min-w-0 items-center gap-3.5">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[#B4E33D]/30 text-[#0C2D57]' : 'bg-white text-[#0E6B78] ring-1 ring-inset ring-[#0C2D57]/10 group-hover:bg-[#EAF1F0]'}`}>
                          <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                        </span>
                        <span className="truncate">{link.label}</span>
                      </span>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${active ? 'text-[#566F0D]' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#0C2D57]'}`} aria-hidden="true" />
                    </NavAnchor>
                  </li>
                );
              })}
            </ul>

            {mobileCompanyPages.length > 0 && (
              <>
                <p className="mb-2 mt-6 px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Company</p>
                <ul className="grid grid-cols-2 gap-2">
                  {mobileCompanyPages.map((page) => {
                    const Icon = getMobileNavIcon(page.href);
                    return (
                      <li key={page.href}>
                        <Link href={page.href} onClick={() => setMobileMenuOpen(false)} aria-current={isActive(page.href) ? 'page' : undefined} className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] ${isActive(page.href) ? 'border-[#B4E33D] bg-white text-[#0C2D57]' : 'border-[#0C2D57]/10 bg-white/60 text-[#334155] hover:bg-white hover:text-[#0C2D57]'}`}>
                          <Icon className="h-[18px] w-[18px] shrink-0 text-[#0E6B78]" aria-hidden="true" />
                          <span className="truncate">{page.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <p className="mb-2 mt-6 px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Your orders</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/portal" onClick={() => setMobileMenuOpen(false)} className="flex min-h-[4.5rem] flex-col justify-center gap-1.5 rounded-xl border border-[#0C2D57]/10 bg-white px-3.5 py-3 text-[#0C2D57] shadow-[0_1px_2px_rgba(12,45,87,.05)] transition-colors hover:border-[#0E6B78]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]">
                <UserRound className="h-5 w-5 text-[#0E6B78]" aria-hidden="true" />
                <span className="text-sm font-bold leading-tight">My Account</span>
              </Link>
              <Link href="/track-order" onClick={() => setMobileMenuOpen(false)} className="flex min-h-[4.5rem] flex-col justify-center gap-1.5 rounded-xl border border-[#0C2D57]/10 bg-white px-3.5 py-3 text-[#0C2D57] shadow-[0_1px_2px_rgba(12,45,87,.05)] transition-colors hover:border-[#0E6B78]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]">
                <PackageSearch className="h-5 w-5 text-[#0E6B78]" aria-hidden="true" />
                <span className="text-sm font-bold leading-tight">Track an Order</span>
              </Link>
            </div>

            {(phone || email) && (
              <>
                <p className="mb-2 mt-6 px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Talk to us</p>
                <div className="overflow-hidden rounded-xl border border-[#0C2D57]/10 bg-white">
                  {phone && (
                    <a href={telHref(phone)} className="flex min-h-12 items-center gap-3 px-3.5 py-3 text-sm font-semibold text-[#0C2D57] transition-colors hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E6B78]">
                      <Phone className="h-[18px] w-[18px] shrink-0 text-[#0E6B78]" aria-hidden="true" />
                      <span className="min-w-0 truncate">{phone}</span>
                    </a>
                  )}
                  {phone && email && <div className="mx-3.5 h-px bg-[#0C2D57]/10" />}
                  {email && (
                    <a href={`mailto:${email}`} className="flex min-h-12 items-center gap-3 px-3.5 py-3 text-sm font-semibold text-[#0C2D57] transition-colors hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E6B78]">
                      <Mail className="h-[18px] w-[18px] shrink-0 text-[#0E6B78]" aria-hidden="true" />
                      <span className="min-w-0 truncate">{email}</span>
                    </a>
                  )}
                </div>
              </>
            )}

            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-6 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-slate-500 hover:text-[#0C2D57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Staff sign in</span>
            </Link>
          </nav>

          {/* The primary action stays pinned, so it is reachable without scrolling the menu. */}
          <div className="shrink-0 border-t border-[#D8D4CC] bg-[#F7F6F3] px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
            <Link
              href="/quotation"
              onClick={() => setMobileMenuOpen(false)}
              className="mx-auto flex min-h-12 w-full max-w-7xl items-center justify-between rounded-xl bg-[#0C2D57] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(12,45,87,.18)] transition-colors hover:bg-[#123766] active:bg-[#0A2447] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4E33D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F6F3]"
            >
              <span className="flex items-center gap-2.5"><ReceiptText className="h-5 w-5 text-[#B4E33D]" aria-hidden="true" />Request a quotation</span>
              <ChevronRight className="h-5 w-5 text-[#B4E33D]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
