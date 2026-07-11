import { MessageCircle } from 'lucide-react';
import { useSiteSettings } from '@/hooks/use-data';

const DEFAULT_WHATSAPP = '254700123456';

export function WhatsAppButton() {
  const { settings } = useSiteSettings();
  const rawNumber = settings.contact?.whatsapp || settings.contact?.phone || DEFAULT_WHATSAPP;
  const phoneNumber = rawNumber.replace(/\D/g, '');
  const message = encodeURIComponent("Hello! I'm interested in your flooring and waterproofing services.");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-all duration-300 hover:scale-110 group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
      <span className="absolute right-full mr-3 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Chat with us
      </span>
      <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
    </a>
  );
}
