import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, Facebook, Instagram, Linkedin } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useToast } from '@/hooks/use-toast';
import { useSiteSettings } from '@/hooks/use-data';
import { supabase } from '@/lib/supabase';
import { telHref } from '@/lib/utils';
import { useSeoMeta } from '@/hooks/use-seo';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default function Contact() {
  useSeoMeta('contact');
  const { toast } = useToast();
  const { settings } = useSiteSettings();
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
        p_project_type: form.subject,
        p_message: form.message,
      });

      if (error) throw error;

      toast({
        title: 'Message Sent',
        description: 'We\'ll get back to you within 24 hours.',
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
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const phone = settings.contact?.phone || '+254 700 123 456';
  const email = settings.contact?.email || 'info@toplineflooring.co.ke';
  const address = settings.contact?.address || 'Industrial Area, Nairobi, Kenya';
  const weekdays = settings.business_hours?.weekdays;
  const saturday = settings.business_hours?.saturday;
  const hours = weekdays && saturday
    ? `Mon-Fri: ${weekdays.open}-${weekdays.close}, Sat: ${saturday.open}-${saturday.close}`
    : 'Mon-Fri: 8AM-5PM, Sat: 9AM-1PM';

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      value: phone,
      href: telHref(phone),
    },
    {
      icon: Mail,
      title: 'Email',
      value: email,
      href: `mailto:${email}`,
    },
    {
      icon: MapPin,
      title: 'Address',
      value: address,
      href: null,
    },
    {
      icon: Clock,
      title: 'Hours',
      value: hours,
      href: null,
    },
  ];

  return (
    <CustomerLayout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="bg-white border-b border-gray-200 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="section-label">Get In Touch</span>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-primary-600 mb-4 mt-2">
              Contact Us
            </h1>
            <p className="text-navy-600 text-lg max-w-2xl mx-auto">
              Have questions about our products or services? We're here to help.
              Get in touch with our team.
            </p>
          </div>
        </section>

        <section className="py-12 lg:py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Info */}
              <div className="lg:col-span-1">
                <div className="card p-6">
                  <h2 className="font-display text-xl font-bold text-navy-900 mb-6">
                    Get in Touch
                  </h2>
                  <div className="space-y-6">
                    {contactInfo.map((info) => (
                      <div key={info.title} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <info.icon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-navy-900">{info.title}</p>
                          {info.href ? (
                            <a
                              href={info.href}
                              className="text-gray-600 hover:text-primary-500 transition-colors"
                            >
                              {info.value}
                            </a>
                          ) : (
                            <p className="text-gray-600">{info.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 card p-6">
                  <h3 className="font-semibold text-navy-900 mb-4">Follow Us</h3>
                  <div className="flex gap-3">
                    {[
                      { name: 'Facebook', url: settings.social_links?.facebook, Icon: Facebook },
                      { name: 'Instagram', url: settings.social_links?.instagram, Icon: Instagram },
                      { name: 'LinkedIn', url: settings.social_links?.linkedin, Icon: Linkedin },
                    ].filter(s => !!s.url).map(({ name, url, Icon }) => (
                      <a
                        key={name}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-primary-500 hover:text-white transition-colors"
                        aria-label={`Follow us on ${name}`}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="card p-6 lg:p-8">
                  <h2 className="font-display text-xl font-bold text-navy-900 mb-6">
                    Send Us a Message
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="input"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="input"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="input"
                          placeholder="+254 700 123 456"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject
                        </label>
                        <select
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          className="input"
                        >
                          <option value="">Select a subject</option>
                          <option value="General Inquiry">General Inquiry</option>
                          <option value="Product Question">Product Question</option>
                          <option value="Quotation Request">Quotation Request</option>
                          <option value="Technical Support">Technical Support</option>
                          <option value="Partnership">Partnership</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        required
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="input min-h-[150px] resize-none"
                        placeholder="Tell us about your project or question..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="py-8 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gray-200 rounded-xl h-[300px] flex items-center justify-center overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8175872993013!2d36.8219!3d-1.2921!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTcnMzEuNiJTIDM2wrA0OScyMC44IkU!5e0!3m2!1sen!2ske!4v1234567890"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Topline Flooring Location"
              />
            </div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}
