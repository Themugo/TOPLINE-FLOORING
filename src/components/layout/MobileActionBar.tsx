import { Link, useLocation } from 'wouter';
import { Home, Layers, Package, ReceiptText } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSiteSettings } from '@/hooks/use-data';
import { isRouteActive } from '@/lib/nav-active';

/**
 * Phone-first primary navigation: home, services, shop, WhatsApp and quotation are always one tap away.
 * The cart lives in the header, so it is not repeated here. Each destination has its own colour so the bar reads at a glance.
 * Shown below the md breakpoint only; hidden on checkout pages where it would cover the order summary and payment controls.
 */
export function MobileActionBar() {
  const { settings } = useSiteSettings();
  const [location] = useLocation();
  if (location.startsWith('/cart') || location.startsWith('/checkout') || location.startsWith('/payment-return')) return null;

  const whatsapp = (settings.contact?.whatsapp || settings.contact?.phone || '254720859737').replace(/\D/g, '');
  const on = (path: string) => (path === '/' ? location === '/' : isRouteActive(path, location));
  const base = 'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-bold min-h-[52px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]';
  const current = (path: string) => (on(path) ? ('page' as const) : undefined);
  const chip = (active: boolean, tint: string, activeBg: string) => `flex h-7 w-10 items-center justify-center rounded-full transition-colors ${active ? activeBg : tint}`;

  const items = [
    { href: '/', label: 'Home', aria: 'Home', Icon: Home, color: 'text-[#0C2D57]', tint: 'bg-[#E8EEF6]', active: 'bg-[#0C2D57] text-white' },
    { href: '/services', label: 'Services', aria: 'Browse services', Icon: Layers, color: 'text-[#0E6B78]', tint: 'bg-[#E1F3F4]', active: 'bg-[#0E6B78] text-white' },
    { href: '/shop', label: 'Shop', aria: 'Shop materials', Icon: Package, color: 'text-[#B45309]', tint: 'bg-[#FDF0DC]', active: 'bg-[#B45309] text-white' },
  ];

  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-[#D8DDE4] bg-white/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(12,45,87,.10)] backdrop-blur md:hidden">
      {items.map(({ href, label, aria, Icon, color, tint, active }) => (
        <Link key={href} href={href} aria-label={aria} aria-current={current(href)} className={`${base} ${color}`}>
          <span className={chip(on(href), `${tint} ${color}`, active)}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
          <span>{label}</span>
        </Link>
      ))}
      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="Contact Topline on WhatsApp" className={`${base} text-[#15803D]`}>
        <span className="flex h-7 w-10 items-center justify-center rounded-full bg-[#E3F6E9]"><WhatsAppIcon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <span>WhatsApp</span>
      </a>
      <Link href="/quotation" aria-label="Request a quotation" aria-current={current('/quotation')} className={`${base} text-[#0C2D57]`}>
        <span className="flex h-7 w-10 items-center justify-center rounded-full bg-[#B4E33D] shadow-sm"><ReceiptText className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <span>Get quote</span>
      </Link>
    </nav>
  );
}
