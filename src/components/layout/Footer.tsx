import { Link } from 'wouter';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { useSiteSettings, useServices } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';

const DEFAULTS = {
  name: 'TOPLINE',
  tagline: 'FLOORING & WATERPROOFING',
  description:
    'Professional flooring and waterproofing solutions for industrial, commercial, and residential projects across Kenya and East Africa.',
  phone: '+254 700 123 456',
  email: 'info@toplineflooring.co.ke',
  address: 'Industrial Area, Nairobi, Kenya',
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { settings } = useSiteSettings();
  const { services } = useServices();

  const siteName = settings.site_info?.name || DEFAULTS.name;
  const [firstWord, ...restWords] = siteName.split(' ');
  const tagline = settings.site_info?.tagline || DEFAULTS.tagline;
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
    <footer className="bg-white text-navy-700 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full border-2 border-navy-600 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-display font-bold text-lg">{firstWord.charAt(0)}</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-primary-600 leading-tight">
                  {firstWord}{restWords.length > 0 ? ` ${restWords.join(' ')}` : ''}
                </h2>
                <p className="text-xs text-navy-600 tracking-wide">{tagline}</p>
              </div>
            </div>
            <p className="text-sm text-navy-500 leading-relaxed">{description}</p>
          </div>

          <div>
            <h3 className="font-semibold text-primary-600 mb-4">Quick Links</h3>
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
              <a
                href={telHref(phone)}
                className="flex items-start gap-3 text-sm text-navy-600 hover:text-primary-600 transition-colors"
              >
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{phone}</span>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-start gap-3 text-sm text-navy-600 hover:text-primary-600 transition-colors"
              >
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{email}</span>
              </a>
              <div className="flex items-start gap-3 text-sm text-navy-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{address}</span>
              </div>
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
