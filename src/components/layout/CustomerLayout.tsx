import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { MobileActionBar } from './MobileActionBar';
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
      <div className="hidden md:block mt-16 lg:mt-[116px] border-b border-[#DDD9D2] bg-[#F7F6F3] relative z-40">
        <div className="page-container min-h-10 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-700">
            <span className="font-semibold text-[#0C2D57]">How can we help?</span>
            <Link href="/shop" className="inline-flex items-center gap-1.5 hover:text-[#0C2D57] transition-colors"><ShoppingBag className="w-3.5 h-3.5" />Shop materials</Link>
            <Link href="/services" className="inline-flex items-center gap-1.5 hover:text-[#0C2D57] transition-colors"><Wrench className="w-3.5 h-3.5" />Find a service</Link>
            <Link href="/quotation" className="inline-flex items-center gap-1.5 hover:text-[#0C2D57] transition-colors"><MessageSquareQuote className="w-3.5 h-3.5" />Get a quote</Link>
            <Link href="/track-order" className="inline-flex items-center gap-1.5 hover:text-[#0C2D57] transition-colors"><ClipboardCheck className="w-3.5 h-3.5" />Track order</Link>
          </div>
          <Link href="/portal" className="inline-flex items-center gap-1.5 font-semibold text-[#0C2D57] hover:text-slate-600">Customer account <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
      <main id="main-content" tabIndex={-1} className="flex-1 pt-16 pb-20 md:pb-0 md:pt-0">{children}</main>
      <Footer />
      <WhatsAppButton />
      <MobileActionBar />
    </div>
  );
}
