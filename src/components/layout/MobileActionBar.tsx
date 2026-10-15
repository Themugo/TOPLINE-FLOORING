import { Link, useLocation } from 'wouter';
import { MessageCircle, Phone, FileText } from 'lucide-react';
import { useSiteSettings } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';

/**
 * Phone-first conversion bar: call, WhatsApp and request a quotation are always one tap away.
 * Shown below the md breakpoint only; the desktop floating WhatsApp button covers larger screens.
 * Hidden on checkout pages where it would cover the order summary and payment controls.
 */
export function MobileActionBar() {
  const { settings } = useSiteSettings();
  const [location] = useLocation();
  if (location.startsWith('/cart') || location.startsWith('/checkout') || location.startsWith('/payment-return')) return null;

  const phone = settings.contact?.phone || '';
  const whatsapp = (settings.contact?.whatsapp || phone).replace(/\D/g, '');
  const base = 'flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold min-h-[48px]';

  return (
    <nav aria-label="Quick actions" className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-white/10 bg-primary-500 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden">
      {phone && (
        <a href={telHref(phone)} className={`${base} bg-white/10 text-white`}><Phone className="h-4 w-4" aria-hidden="true" />Call</a>
      )}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={`${base} bg-white/10 text-white`}><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp</a>
      )}
      <Link href="/quotation" className={`${base} bg-lime-400 text-primary-500`}><FileText className="h-4 w-4" aria-hidden="true" />Get a quote</Link>
    </nav>
  );
}
