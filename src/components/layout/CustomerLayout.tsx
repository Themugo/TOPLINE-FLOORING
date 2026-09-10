import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-navy-950 focus:shadow-lg">Skip to main content</a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 pt-16 lg:pt-[7.25rem]">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
