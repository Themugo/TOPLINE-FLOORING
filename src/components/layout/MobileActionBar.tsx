import { Link, useLocation } from 'wouter';
import { Layers, Package, ReceiptText, ShoppingCart } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSiteSettings } from '@/hooks/use-data';
import { useCart } from '@/hooks/use-cart';
import { isRouteActive } from '@/lib/nav-active';

/**
 * Phone-first primary navigation: services, shop, WhatsApp and quotation are always one tap away.
 * Shown below the md breakpoint only; the desktop floating WhatsApp button covers larger screens.
 * Hidden on checkout pages where it would cover the order summary and payment controls.
 */
export function MobileActionBar() {
  const { settings } = useSiteSettings();
  const { totalItems } = useCart();
  const [location] = useLocation();
  if (location.startsWith('/cart') || location.startsWith('/checkout') || location.startsWith('/payment-return')) return null;

  const whatsapp = (settings.contact?.whatsapp || settings.contact?.phone || '254720859737').replace(/\D/g, '');
  const on = (path: string) => isRouteActive(path, location);
  const current = (path: string) => (on(path) ? ('page' as const) : undefined);
  const base = 'flex min-w-0 flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 relative rounded-xl px-1 py-2 text-[11px] sm:text-xs font-bold min-h-[52px] leading-tight transition-colors active:bg-white';

  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-[#D8DDE4] bg-[#F7F6F3] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(12,45,87,.10)] md:hidden">
      <Link href="/services" aria-label="Browse services" aria-current={current('/services')} className={`${base} ${on('/services') ? 'bg-white shadow-inner' : ''} text-[#0C2D57] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}>{on('/services') && <span aria-hidden="true" className="absolute inset-x-5 -top-2 h-0.5 rounded-full bg-[#0C2D57]" />}<Layers className="h-5 w-5" aria-hidden="true" /><span>Services</span></Link>
      <Link href="/shop" aria-label="Shop materials" aria-current={current('/shop')} className={`${base} ${on('/shop') ? 'bg-white shadow-inner' : ''} text-[#0C2D57] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}>{on('/shop') && <span aria-hidden="true" className="absolute inset-x-5 -top-2 h-0.5 rounded-full bg-[#0C2D57]" />}<Package className="h-5 w-5" aria-hidden="true" /><span>Shop</span></Link>
      <Link href="/cart" aria-label={`Shopping cart${totalItems > 0 ? `, ${totalItems} items` : ''}`} className={`${base} text-[#0C2D57] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}><span className="relative"><ShoppingCart className="h-5 w-5" aria-hidden="true" />{totalItems > 0 && <span className="absolute -right-2 -top-2 min-w-4 h-4 rounded-full bg-[#B4E33D] px-1 text-[9px] leading-4 text-[#0C2D57]">{totalItems}</span>}</span><span>Cart</span></Link>
      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="Contact Topline on WhatsApp" className={`${base} text-[#0C6B50] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}><WhatsAppIcon className="h-5 w-5" aria-hidden="true" /><span>WhatsApp</span></a>
      <Link href="/quotation" aria-label="Request a quotation" aria-current={current('/quotation')} className={`${base} ${on('/quotation') ? 'ring-2 ring-[#0C2D57]/40' : ''} bg-[#B4E33D] text-[#0C2D57] hover:bg-[#c4ed5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]`}><ReceiptText className="h-5 w-5" aria-hidden="true" /><span>Get quote</span></Link>
    </nav>
  );
}
