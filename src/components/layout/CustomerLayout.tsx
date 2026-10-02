import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { Link } from 'wouter';
import { ArrowRight, ClipboardCheck, MessageSquareQuote, ShoppingBag, Wrench } from 'lucide-react';

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-navy-950 focus:shadow-lg">Skip to main content</a>
      <Header />
      <div className="hidden md:block mt-[116px] border-b border-navy-100/70 bg-white/95 backdrop-blur-sm relative z-40">
        <div className="page-container h-11 flex items-center justify-between gap-4 text-[12px]">
          <div className="flex items-center gap-5 text-navy-600">
            <span className="font-semibold text-navy-900">How can we help?</span>
            <Link href="/shop" className="inline-flex items-center gap-1.5 hover:text-primary-600 transition-colors"><ShoppingBag className="w-3.5 h-3.5" />Shop materials</Link>
            <Link href="/services" className="inline-flex items-center gap-1.5 hover:text-primary-600 transition-colors"><Wrench className="w-3.5 h-3.5" />Find a service</Link>
            <Link href="/quotation" className="inline-flex items-center gap-1.5 hover:text-primary-600 transition-colors"><MessageSquareQuote className="w-3.5 h-3.5" />Get a quote</Link>
            <Link href="/track-order" className="inline-flex items-center gap-1.5 hover:text-primary-600 transition-colors"><ClipboardCheck className="w-3.5 h-3.5" />Track order</Link>
          </div>
          <Link href="/portal" className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700">Customer account <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
      <main id="main-content" tabIndex={-1} className="flex-1 pt-16 lg:pt-0">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
