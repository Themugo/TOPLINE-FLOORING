import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, ShoppingCart, Phone, Mail, MapPin, LogIn, Facebook, Instagram, Linkedin, UserRound, ClipboardCheck, ChevronDown } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useSiteSettings, useNavigationMenus } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { settings } = useSiteSettings();
  const { menus } = useNavigationMenus('header');

  const siteName = settings.site_info?.name || 'Topline Flooring & Waterproofing';
  const [firstWord, ...restWords] = siteName.split(' ');
  const tagline = settings.site_info?.tagline || 'FLOORING & WATERPROOFING';
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
    <header className="fixed top-0 left-0 right-0 z-50 shadow-[0_8px_28px_rgba(20,44,70,.09)]">
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="flex items-center justify-between min-h-16 lg:min-h-20 gap-3">
            <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-3 rounded-xl py-1 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5F6B7A]" aria-label={`${siteName} home`}>
              <div className="flex h-11 w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-xl border border-[#B4E33D]/45 bg-[#0C2D57] shadow-[0_4px_12px_rgba(20,44,70,.16)]">
                <span className="font-display text-xl font-bold tracking-tight text-[#F7F6F3]">{firstWord.charAt(0).toUpperCase()}</span>
              </div>
              <div className="hidden min-w-0 sm:block">
                <span className="block max-w-[200px] xl:max-w-[245px] truncate font-display text-[15px] lg:text-[16px] font-bold leading-tight tracking-[-0.02em] text-[#0C2D57]">
                  {firstWord}{restWords.length > 0 ? ` ${restWords.join(' ')}` : ''}
                </span>
                <span className="mt-1 block max-w-[200px] xl:max-w-[245px] whitespace-normal text-[9px] lg:text-[10px] font-semibold leading-[1.35] tracking-[0.11em] text-[#5F6B7A]">{tagline}</span>
              </div>
            </Link>

            <nav className="hidden lg:flex min-w-0 items-center gap-0.5" aria-label="Main navigation">
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

            <div className="flex items-center gap-2 lg:gap-3">
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
                className="relative p-2 text-slate-600 hover:text-[#0C2D57] transition-colors"
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
                className="hidden md:flex items-center gap-2 px-3 xl:px-4 py-2.5 text-[12px] xl:text-[13px] font-semibold rounded-lg bg-[#0C2D57] text-white hover:bg-[#123766] transition-colors shadow-sm active:scale-[0.98] whitespace-nowrap"
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
                className="lg:hidden shrink-0 rounded-lg p-2 text-[#0C2D57] hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5F6B7A]"
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

      {mobileMenuOpen && (
        <div id="mobile-menu" className="lg:hidden bg-white border-t border-gray-200 max-h-[calc(100dvh-4rem)] overflow-y-auto shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.href)
                    ? 'text-[#0C2D57] bg-[#F7F6F3] border-l-2 border-[#B4E33D]'
                    : 'text-slate-700 hover:text-[#0C2D57] hover:bg-[#F7F6F3]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-gray-200 space-y-1">
              <Link href="/portal" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-primary-700 bg-primary-50 rounded-xl">
                <UserRound className="w-4 h-4" />
                <span>My Customer Account</span>
              </Link>
              <Link href="/track-order" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-navy-700">
                <ClipboardCheck className="w-4 h-4" />
                <span>Track an Order</span>
              </Link>
              {phone && (
                <a
                  href={telHref(phone)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-navy-700"
                >
                  <Phone className="w-4 h-4" />
                  <span>{phone}</span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-navy-700"
                >
                  <Mail className="w-4 h-4" />
                  <span>{email}</span>
                </a>
              )}
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary-600"
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
