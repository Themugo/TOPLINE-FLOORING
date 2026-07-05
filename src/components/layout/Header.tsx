import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, ShoppingCart, Phone } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { totalItems } = useCart();

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy-950/95 backdrop-blur-sm border-b border-navy-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-display font-bold text-lg">T</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg text-white leading-tight">
                TOPLINE
              </h1>
              <p className="text-xs text-primary-400 tracking-wide">FLOORING & WATERPROOFING</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.href)
                    ? 'text-primary-400 bg-navy-900'
                    : 'text-gray-300 hover:text-white hover:bg-navy-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="tel:+254700123456"
              className="hidden md:flex items-center gap-2 text-sm text-gray-300 hover:text-primary-400 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>+254 700 123 456</span>
            </a>

            <Link
              href="/cart"
              className="relative p-2 text-gray-300 hover:text-white transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-navy-900 border-t border-navy-800">
          <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.href)
                    ? 'text-primary-400 bg-navy-800'
                    : 'text-gray-300 hover:text-white hover:bg-navy-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-navy-800">
              <a
                href="tel:+254700123456"
                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300"
              >
                <Phone className="w-4 h-4" />
                <span>+254 700 123 456</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
