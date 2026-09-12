import React, { useState } from 'react';
import { MessageCircle, X, Send, PhoneCall } from 'lucide-react';
import { useSiteSettings } from '@/hooks/use-data';

const DEFAULT_WHATSAPP = '15550000000';

export function WhatsAppButton() {
  const { settings } = useSiteSettings();
  const rawNumber = settings.contact?.whatsapp || settings.contact?.phone || DEFAULT_WHATSAPP;
  const phoneNumber = rawNumber.replace(/\D/g, '');
  const companyName = settings.site_info?.name || settings.company?.name || "Your Flooring Company";
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState(
    `Hello ${companyName}! I would like to request an instant sales quote.`
  );

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    const encoded = encodeURIComponent(customMsg);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Sleek Quick Chat Popover */}
      {isOpen && (
        <div className="mb-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-xl">
                <MessageCircle className="w-4 h-4 text-white fill-current" />
              </div>
              <div>
                <h4 className="font-bold text-xs flex items-center gap-1.5">
                  {companyName} Sales Desk
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                </h4>
                <p className="text-[10px] text-emerald-100">Online • Instant Response</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-emerald-100 hover:text-white rounded-lg transition-colors"
              aria-label="Close WhatsApp chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleStartChat} className="p-3 bg-gray-50/60 space-y-2.5 text-xs">
            <p className="text-[11px] text-gray-600 leading-snug">
              Chat live with our technical flooring & waterproofing specialists on WhatsApp:
            </p>

            <textarea
              rows={2}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Type your inquiry..."
            />

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <a
                href={`tel:+${phoneNumber}`}
                className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-[11px] flex items-center gap-1 transition-colors"
              >
                <PhoneCall className="w-3 h-3 text-emerald-600" /> Call
              </a>
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Start Chat
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Small & Communicating Floating Toggle */}
      <div className="relative flex items-center group">
        {/* Hover label tooltip */}
        <span className="mr-2 text-xs font-semibold px-2.5 py-1 bg-gray-900 text-white rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none hidden sm:inline-block">
          Chat on WhatsApp
        </span>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 border border-white/20"
          aria-label="Contact Sales on WhatsApp"
        >
          <MessageCircle className="w-6 h-6 text-white fill-current shrink-0" />
          
          {/* Online status indicator badge */}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
          </span>
        </button>
      </div>
    </div>
  );
}


