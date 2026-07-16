import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, ShoppingCart, Phone, Mail, MapPin, LogIn, Facebook, Instagram, Linkedin } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useSiteSettings } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';

const DEFAULT_PHONE = '+254 700 123 456';
const DEFAULT_EMAIL = 'info@toplineflooring.co.ke';
const DEFAULT_ADDRESS = 'Nairobi, Kenya';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { settings } = useSiteSettings();

  const siteName = settings.site_info?.name || 'TOPLINE';
  const [firstWord, ...restWords] = siteName.split(' ');
  const tagline = settings.site_info?.tagline || 'FLOORING & WATERPROOFING';
  const phone = settings.contact?.phone || DEFAULT_PHONE;
  const email = settings.contact?.email || DEFAULT_EMAIL;
  const address = settings.contact?.address || DEFAULT_ADDRESS;

  const social = settings.social_links || {};
  const socialLinks = [
    { key: 'facebook', url: social.facebook, Icon: Facebook },
    { key: 'instagram', url: social.instagram, Icon: Instagram },
    { key: 'linkedin', url: social.linkedin, Icon: Linkedin },
  ].filter((s) => !!s.url);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/shop', label: 'Shop' },
    { href: '/contact', label: 'Contact' },
    { href: '/quotation', label: 'Get Quote' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 shadow-sm">
      {/* Top utility bar - contact info + social, desktop only */}
      <div className="hidden lg:block bg-navy-950 text-white">
        <div className="max-w-7xl mx-auto px-6 xl:px-8">
          <div className="flex items-center justify-between h-9 text-xs">
            <div className="flex items-center gap-5 text-navy-100">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary-400" />
                {address}
              </span>
              <a href={telHref(phone)} className="flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                <Phone className="w-3.5 h-3.5 text-primary-400" />
                {phone}
              </a>
              <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                <Mail className="w-3.5 h-3.5 text-primary-400" />
                {email}
              </a>
            </div>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map(({ key, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-navy-200 hover:text-primary-400 transition-colors"
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
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-navy-600 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-display font-bold text-lg">{firstWord.charAt(0)}</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display font-bold text-lg text-primary-600 leading-tight">
                  {firstWord}{restWords.length > 0 ? ` ${restWords.join(' ')}` : ''}
                </h1>
                <p className="text-[11px] text-navy-500 tracking-[0.15em]">{tagline}</p>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(link.href)
                      ? 'text-primary-600'
                      : 'text-navy-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute left-4 right-4 -bottom-0.5 h-0.5 bg-primary-500 rounded-full" />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 lg:gap-3">
              <Link
                href="/cart"
                className="relative p-2 text-navy-700 hover:text-primary-600 transition-colors"
                aria-label={`Shopping cart${totalItems > 0 ? `, ${totalItems} items` : ''}`}
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-medium rounded-full flex items-center justify-center" aria-hidden="true">
                    {totalItems}
                  </span>
                )}
              </Link>

              <Link
                href="/quotation"
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-sm hover:shadow-premium active:scale-[0.97]"
              >
                Request Quotation
              </Link>

              <Link
                href="/admin/login"
                className="hidden xl:flex items-center gap-1.5 text-sm text-navy-400 hover:text-primary-600 transition-colors"
                title="Admin Login"
              >
                <LogIn className="w-4 h-4" />
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-navy-700 hover:text-primary-600"
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
        <div id="mobile-menu" className="lg:hidden bg-white border-t border-gray-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.href)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-navy-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-gray-200 space-y-1">
              <a
                href={telHref(phone)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-navy-700"
              >
                <Phone className="w-4 h-4" />
                <span>{phone}</span>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 px-4 py-3 text-sm text-navy-700"
              >
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </a>
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
