import { Link } from 'wouter';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-display font-bold text-lg">T</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white leading-tight">
                  TOPLINE
                </h2>
                <p className="text-xs text-primary-400 tracking-wide">
                  FLOORING & WATERPROOFING
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Professional flooring and waterproofing solutions for industrial, commercial,
              and residential projects across Kenya and East Africa.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <nav className="space-y-3">
              {[
                { href: '/', label: 'Home' },
                { href: '/services', label: 'Services' },
                { href: '/shop', label: 'Materials Shop' },
                { href: '/contact', label: 'Contact Us' },
                { href: '/quotation', label: 'Get a Quote' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-gray-400 hover:text-primary-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Our Services</h3>
            <nav className="space-y-3">
              {[
                'Industrial Flooring',
                'Epoxy Coatings',
                'Waterproofing Systems',
                'Concrete Sealers',
                'Joint Sealants',
              ].map((service) => (
                <Link
                  key={service}
                  href="/services"
                  className="block text-sm text-gray-400 hover:text-primary-400 transition-colors"
                >
                  {service}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Contact Info</h3>
            <div className="space-y-4">
              <a
                href="tel:+254700123456"
                className="flex items-start gap-3 text-sm text-gray-400 hover:text-primary-400 transition-colors"
              >
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>+254 700 123 456</span>
              </a>
              <a
                href="mailto:info@toplineflooring.co.ke"
                className="flex items-start gap-3 text-sm text-gray-400 hover:text-primary-400 transition-colors"
              >
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>info@toplineflooring.co.ke</span>
              </a>
              <div className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Industrial Area, Nairobi, Kenya</span>
              </div>
              <div className="text-sm text-gray-400">
                <p>Mon - Fri: 8:00 AM - 5:00 PM</p>
                <p>Sat: 9:00 AM - 1:00 PM</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-navy-900 flex items-center justify-center text-gray-400 hover:bg-primary-500 hover:text-white transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-navy-900 flex items-center justify-center text-gray-400 hover:bg-primary-500 hover:text-white transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-navy-900 flex items-center justify-center text-gray-400 hover:bg-primary-500 hover:text-white transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-navy-900">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {currentYear} Topline Flooring and Waterproofing. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/admin/login" className="hover:text-primary-400 transition-colors">
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
