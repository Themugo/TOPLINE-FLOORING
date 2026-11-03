import { Link } from 'wouter';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { useSiteSettings, useServices, useNavigationMenus } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';
import { useBrand } from '@/hooks/use-brand';
import { NavAnchor } from '@/components/layout/NavAnchor';
import { BrandLockup } from '@/components/layout/BrandLockup';

const DEFAULTS = {
  name: 'Topline Flooring & Waterproofing',
  description:
    'Professional flooring and waterproofing solutions for commercial, industrial, and residential projects.',
  phone: '',
  email: '',
  address: '',
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { settings } = useSiteSettings();
  const { services } = useServices();
  const { menus: footerMenus } = useNavigationMenus('footer');

  const siteName = settings.site_info?.name || DEFAULTS.name;
  const brand = useBrand();
  const description = settings.site_info?.description || DEFAULTS.description;

  const phone = settings.contact?.phone || DEFAULTS.phone;
  const email = settings.contact?.email || DEFAULTS.email;
  const address = settings.contact?.address || DEFAULTS.address;

  const weekdays = settings.business_hours?.weekdays;
  const saturday = settings.business_hours?.saturday;
  const sunday = settings.business_hours?.sunday;

  const social = settings.social_links || {};
  const socialLinks = [
    { key: 'facebook', url: social.facebook, Icon: Facebook },
    { key: 'instagram', url: social.instagram, Icon: Instagram },
    { key: 'linkedin', url: social.linkedin, Icon: Linkedin },
    { key: 'twitter', url: social.twitter, Icon: Twitter },
  ].filter((s) => !!s.url);

  const copyright =
    settings.footer?.copyright ||
    `© ${currentYear} ${siteName}. All rights reserved.`;
  const showSocial = settings.footer?.show_social !== false;

  return (
    <footer className="bg-white text-navy-700 border-t border-gray-200 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <Link
              href="/"
              aria-label={`${brand.siteName} home`}
              className="group flex items-center gap-2.5 sm:gap-3 mb-6 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2"
            >
              <BrandLockup variant="footer" />
            </Link>
            <p className="text-sm text-navy-500 leading-relaxed">{description}</p>
          </div>

          <div>
            <h3 className="font-semibold text-primary-600 mb-3">Quick Links</h3>
            <nav aria-label="Footer quick links">
              <ul className="grid grid-cols-2 gap-x-4 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2">
                {(footerMenus.length > 0 ? footerMenus : [
                  { href: '/', label: 'Home', open_in_new_tab: false },
                  { href: '/about', label: 'About Us', open_in_new_tab: false },
                  { href: '/services', label: 'Services', open_in_new_tab: false },
                  { href: '/portfolio', label: 'Portfolio', open_in_new_tab: false },
                  { href: '/shop', label: 'Materials Shop', open_in_new_tab: false },
                  { href: '/industries', label: 'Industries', open_in_new_tab: false },
                  { href: '/market', label: 'Partners', open_in_new_tab: false },
                  { href: '/faq', label: 'FAQs', open_in_new_tab: false },
                  { href: '/contact', label: 'Contact Us', open_in_new_tab: false },
                  { href: '/quotation', label: 'Get a Quote', open_in_new_tab: false },
                  { href: '/track-order', label: 'Track an Order', open_in_new_tab: false },
                  { href: '/portal', label: 'My Account', open_in_new_tab: false },
                ]).map((link) => (
                  <li key={`${link.href}-${link.label}`}>
                    <NavAnchor
                      href={link.href}
                      newTab={link.open_in_new_tab}
                      className="flex min-h-10 items-center text-sm text-navy-600 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] rounded-md"
                    >
                      {link.label}
                    </NavAnchor>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            <h3 className="font-semibold text-primary-600 mb-3">Our Services</h3>
            <nav aria-label="Footer services">
              <ul>
                {services.slice(0, 6).map((service) => (
                  <li key={service.id}>
                    <Link
                      href={service.slug ? `/service/${service.slug}` : '/services'}
                      className="flex min-h-10 items-center text-sm text-navy-600 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] rounded-md"
                    >
                      {service.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/services" className="flex min-h-10 items-center gap-1 text-sm font-semibold text-[#0C2D57] hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] rounded-md">
                    View all services <span aria-hidden="true">→</span>
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-primary-600 mb-4">Contact Info</h3>
            <div className="space-y-4">
              {phone && (
                <a
                  href={telHref(phone)}
                  className="flex min-h-10 items-start gap-3 py-1 text-sm text-navy-600 hover:text-primary-600 transition-colors"
                >
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{phone}</span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex min-h-10 items-start gap-3 py-1 text-sm text-navy-600 hover:text-primary-600 transition-colors"
                >
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{email}</span>
                </a>
              )}
              {address && (
                <div className="flex items-start gap-3 text-sm text-navy-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{address}</span>
                </div>
              )}
              <div className="text-sm text-navy-500">
                {weekdays ? (
                  <p>Mon - Fri: {weekdays.open} - {weekdays.close}</p>
                ) : (
                  <p>Mon - Fri: 8:00 AM - 5:00 PM</p>
                )}
                {saturday ? (
                  <p>Sat: {saturday.open} - {saturday.close}</p>
                ) : (
                  <p>Sat: 9:00 AM - 1:00 PM</p>
                )}
                {sunday && sunday !== 'Closed' && <p>Sun: {sunday}</p>}
              </div>
            </div>

            {showSocial && socialLinks.length > 0 && (
              <div className="flex items-center gap-4 mt-6">
                {socialLinks.map(({ key, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-navy-600 hover:bg-primary-500 hover:text-white transition-colors"
                    aria-label={`Visit our ${key} page`}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar - solid brand gold, matching the site's footer strip */}
      <div className="bg-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-sm text-white font-medium">{copyright}</p>
            <Link href="/admin/login" className="inline-flex min-h-10 items-center text-xs text-white/80 hover:text-white transition-colors">
              Staff sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
