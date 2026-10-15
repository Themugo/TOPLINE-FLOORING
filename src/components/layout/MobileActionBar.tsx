import { Link, useLocation } from 'wouter';
import { MessageCircle, ShoppingBag, Wrench, FileText } from 'lucide-react';
import { useSiteSettings } from '@/hooks/use-data';

/**
 * Phone-first primary navigation: services, shop, WhatsApp and quotation are always one tap away.
 * Shown below the md breakpoint only; the desktop floating WhatsApp button covers larger screens.
 * Hidden on checkout pages where it would cover the order summary and payment controls.
 */
export function MobileActionBar() {
  const { settings } = useSiteSettings();
  const [location] = useLocation();
  if (location.startsWith('/cart') || location.startsWith('/checkout') || location.startsWith('/payment-return')) return null;

  const whatsapp = (settings.contact?.whatsapp || settings.contact?.phone || '254720859737').replace(/\D/g, '');
  const base = 'flex min-w-0 flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold min-h-[48px] leading-tight';

  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t border-[#D8DDE4] bg-[#F7F6F3] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(12,45,87,.10)] md:hidden">
      <Link href="/services" aria-label="Browse services" className={`${base} text-[#0C2D57] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}><Wrench className="h-5 w-5" aria-hidden="true" /><span>Services</span></Link>
      <Link href="/shop" aria-label="Shop materials" className={`${base} text-[#0C2D57] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}><ShoppingBag className="h-5 w-5" aria-hidden="true" /><span>Shop</span></Link>
      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="Contact Topline on WhatsApp" className={`${base} text-[#0C6B50] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}><MessageCircle className="h-5 w-5" aria-hidden="true" /><span>WhatsApp</span></a>
      <Link href="/quotation" aria-label="Request a quotation" className={`${base} bg-[#B4E33D] text-[#0C2D57] hover:bg-[#c4ed5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}><FileText className="h-5 w-5" aria-hidden="true" /><span>Get quote</span></Link>
    </nav>
  );
}
