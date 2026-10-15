import { Link } from 'wouter';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { useSiteSettings, useServices, useNavigationMenus } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';

const DEFAULTS = {
  name: 'Topline Flooring & Waterproofing',
  tagline: 'FLOORING & WATERPROOFING',
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
  const tagline = DEFAULTS.tagline;
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
    `© ${currentYear} ${siteName} Flooring and Waterproofing | All Rights Reserved`;
  const showSocial = settings.footer?.show_social !== false;

  return (
    <footer className="bg-white text-navy-700 border-t border-gray-200 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <Link
              href="/"
              aria-label="Topline Flooring and Waterproofing home"
              className="group flex items-center gap-2.5 sm:gap-3 mb-6 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2"
            >
              <img
                src="/topline-brand-mark.svg"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 sm:h-12 sm:w-[3.35rem] shrink-0 object-contain"
                width="72"
                height="64"
              />
              <span className="min-w-0 flex flex-col justify-center">
                <span className="block font-display text-[19px] sm:text-[21px] font-extrabold leading-[0.98] tracking-[-0.045em] text-[#0C2D57]">Topline</span>
                <span className="mt-1 block whitespace-nowrap text-[7px] sm:text-[9px] font-extrabold leading-tight tracking-[0.005em] sm:tracking-[0.045em] text-[#0C2D57]">{tagline}</span>
                <span className="mt-1 hidden sm:block text-[8px] font-semibold leading-tight tracking-[0.06em] text-slate-500">Professional solutions for lasting spaces</span>
              </span>
            </Link>
            <p className="text-sm text-navy-500 leading-relaxed">{description}</p>
          </div>

          <div>
            <h3 className="font-semibold text-primary-600 mb-4">Quick Links</h3>
            <nav className="space-y-3">
              {(footerMenus.length > 0 ? footerMenus : [
                { href: '/', label: 'Home' },
                { href: '/services', label: 'Services' },
                { href: '/shop', label: 'Materials Shop' },
                { href: '/contact', label: 'Contact Us' },
                { href: '/quotation', label: 'Get a Quote' },
              ]).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-navy-600 hover:text-primary-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="font-semibold text-primary-600 mb-4">Our Services</h3>
            <nav className="space-y-3">
              {services.length > 0 ? (
                services.slice(0, 5).map((service) => (
                  <Link
                    key={service.id}
                    href="/services"
                    className="block text-sm text-navy-600 hover:text-primary-600 transition-colors"
                  >
                    {service.name}
                  </Link>
                ))
              ) : (
                [
                  'Industrial Flooring',
                  'Epoxy Coatings',
                  'Waterproofing Systems',
                  'Concrete Sealers',
                  'Joint Sealants',
                ].map((service) => (
                  <Link
                    key={service}
                    href="/services"
                    className="block text-sm text-navy-600 hover:text-primary-600 transition-colors"
                  >
                    {service}
                  </Link>
                ))
              )}
            </nav>
          </div>

          <div>
            <h3 className="font-semibold text-primary-600 mb-4">Contact Info</h3>
            <div className="space-y-4">
              {phone && (
                <a
                  href={telHref(phone)}
                  className="flex items-start gap-3 text-sm text-navy-600 hover:text-primary-600 transition-colors"
                >
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{phone}</span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-start gap-3 text-sm text-navy-600 hover:text-primary-600 transition-colors"
                >
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{email}</span>
                </a>
              )}
              {address && (
                <div className="flex items-start gap-3 text-sm text-navy-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{address}</span>
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
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-navy-600 hover:bg-primary-500 hover:text-white transition-colors"
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
            <Link href="/admin/login" className="text-sm text-white/90 hover:text-white transition-colors">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
