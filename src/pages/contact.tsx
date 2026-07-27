import { useState, useMemo } from 'react';
import { Phone, Mail, MapPin, Clock, Send, Facebook, Instagram, Linkedin, ShieldCheck, CheckCircle2, MessageSquare, ExternalLink, Headphones, Sparkles, Building2 } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useToast } from '@/hooks/use-toast';
import { useSiteSettings } from '@/hooks/use-data';
import { supabase } from '@/lib/supabase';
import { telHref } from '@/lib/utils';
import { useSeoMeta } from '@/hooks/use-seo';
import { useImagePreloader } from '@/hooks/use-image-preloader';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const CONTACT_HERO_IMAGE = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80';
const SITE_INSPECTION_IMAGE = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80';

export default function Contact() {
  useSeoMeta('contact', null, { breadcrumbs: [{ label: 'Contact Us' }] });
  const { toast } = useToast();
  const { settings } = useSiteSettings();

  useImagePreloader(useMemo(() => [CONTACT_HERO_IMAGE, SITE_INSPECTION_IMAGE], []));

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.rpc('submit_quotation_request', {
        p_name: form.name,
        p_email: form.email,
        p_phone: form.phone,
        p_project_type: form.subject || 'General Contact Message',
        p_message: form.message,
      });

      if (error) throw error;

      toast({
        title: 'Message Sent Successfully',
        description: "Thank you for reaching out. Our engineering team will respond within 24 hours.",
      });

      setForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch {
      toast({
        title: 'Submission Failed',
        description: 'Failed to send message. Please call us directly or try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const phone = settings.contact?.phone || '+1 (555) 000-0000';
  const email = settings.contact?.email || 'contact@example.com';
  const address = settings.contact?.address || '123 Industrial Parkway, Commerce City, ST 12345';
  const weekdays = settings.business_hours?.weekdays;
  const saturday = settings.business_hours?.saturday;
  const hours = weekdays && saturday
    ? `Mon-Fri: ${weekdays.open}-${weekdays.close}, Sat: ${saturday.open}-${saturday.close}`
    : 'Mon-Fri: 8:00 AM - 5:00 PM, Sat: 9:00 AM - 1:00 PM';

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone Consultation',
      value: phone,
      subtitle: 'Immediate engineering & sales inquiry',
      href: telHref(phone),
      actionText: 'Call Hotline',
    },
    {
      icon: Mail,
      title: 'Official Email',
      value: email,
      subtitle: 'For RFQs, BOQs, & technical submittals',
      href: `mailto:${email}`,
      actionText: 'Send Email',
    },
    {
      icon: MapPin,
      title: 'Regional Headquarters',
      value: address,
      subtitle: 'Main Operations Hub & Showroom',
      href: 'https://maps.google.com',
      actionText: 'Get Directions',
    },
    {
      icon: Clock,
      title: 'Operating Hours',
      value: hours,
      subtitle: 'Emergency repairs team available 24/7',
      href: null,
      actionText: null,
    },
  ];

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: 'Contact Us' }]} />
      <div className="min-h-screen bg-gray-50/60">
        {/* Modern Split Hero Section */}
        <section className="relative bg-navy-950 text-white overflow-hidden py-16 lg:py-20 border-b border-navy-800">
          <div className="absolute inset-0 opacity-20">
            <img
              src={CONTACT_HERO_IMAGE}
              alt="Engineering site assessment background"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-500/20 text-primary-300 border border-primary-400/30 text-xs font-bold uppercase tracking-wider">
                  <Headphones className="w-3.5 h-3.5" />
                  Engineering & Sales Desk
                </span>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                  Let's Discuss Your Project Scope
                </h1>
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl">
                  Have questions about chemical compatibility, substrate moisture testing, or project scheduling? Our field engineers are ready to assist across East Africa.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-6 text-xs sm:text-sm font-semibold text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Free On-Site Assessments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>24-Hour RFQ Turnaround</span>
                  </div>
                </div>
              </div>

              {/* Quick Contact Badge Card */}
              <div className="lg:col-span-5">
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 text-white space-y-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base">Direct Site Visits</h3>
                      <p className="text-xs text-gray-300">Metropolitan & Regional Service Zones</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed">
                    Request a field engineer to inspect your substrate slab, perform pull-off adhesion tests, or recommend appropriate primer systems.
                  </p>
                  <a
                    href={telHref(phone)}
                    className="inline-flex items-center justify-center gap-2 w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Speak to On-Call Engineer Now ({phone})</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Content Grid */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Contact Cards & Info */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-950 mb-2">
                    Contact Channels
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Get in touch with our commercial operations team or visit our main facility.
                  </p>
                </div>

                <div className="space-y-4">
                  {contactInfo.map((info) => (
                    <div
                      key={info.title}
                      className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex items-start gap-4"
                    >
                      <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0">
                        <info.icon className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display font-bold text-navy-950 text-sm">
                            {info.title}
                          </h3>
                          {info.href && info.actionText && (
                            <a
                              href={info.href}
                              target={info.href.startsWith('http') ? '_blank' : undefined}
                              rel={info.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                              className="text-[11px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
                            >
                              <span>{info.actionText}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="font-semibold text-navy-900 text-sm mt-0.5 truncate">
                          {info.value}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {info.subtitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social Channels Card */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs">
                  <h3 className="font-display font-bold text-navy-950 text-sm mb-3">
                    Follow Our Project Updates
                  </h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Watch our application crews install heavy-duty PU screeds, metallic epoxy art floors, and roof waterproofing membranes.
                  </p>
                  <div className="flex gap-3">
                    {[
                      { name: 'Facebook', url: settings.social_links?.facebook || 'https://facebook.com', Icon: Facebook },
                      { name: 'Instagram', url: settings.social_links?.instagram || 'https://instagram.com', Icon: Instagram },
                      { name: 'LinkedIn', url: settings.social_links?.linkedin || 'https://linkedin.com', Icon: Linkedin },
                    ].map(({ name, url, Icon }) => (
                      <a
                        key={name}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-center gap-2 text-xs font-bold text-navy-800 hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-colors"
                        aria-label={`Follow us on ${name}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs">
                  <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-xl font-bold text-navy-950 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary-500" />
                        Send an Inquiry
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Fill out the form below and an engineer will review your request.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                      24h Response
                    </span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400"
                          placeholder="e.g. David Kamau"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400"
                          placeholder="e.g. david@company.co.ke"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                          Inquiry Subject
                        </label>
                        <select
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-semibold text-navy-950 transition-all cursor-pointer"
                        >
                          <option value="">Select subject category</option>
                          <option value="General Inquiry">General Inquiry</option>
                          <option value="Site Survey & Moisture Test">Site Survey & Moisture Test</option>
                          <option value="Product Technical Specification">Product Technical Specification</option>
                          <option value="Quotation Request">Quotation Request / BOQ</option>
                          <option value="Subcontracting & Partnership">Subcontracting & Partnership</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                        Message / Project Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400 min-h-[140px] resize-none"
                        placeholder="Tell us about your project location, slab condition, timeline, or chemical exposure requirements..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-6 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? 'Submitting Message...' : 'Send Inquiry Message'}</span>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 text-center pt-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Your information is kept strictly confidential and never shared with third parties.</span>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Google Map Section */}
        <section className="py-8 bg-white border-t border-gray-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                  Physical HQ & Depot
                </span>
                <h3 className="font-display text-xl font-bold text-navy-950 mt-0.5 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-500" />
                  Visit Our Main Showroom & Technical Center
                </h3>
              </div>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-navy-950 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 h-[340px] shadow-2xs relative">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8175872993013!2d36.8219!3d-1.2921!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTcnMzEuNiJTIDM2wrA0OScyMC44IkU!5e0!3m2!1sen!2ske!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Company Location Map"
              />
            </div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}

