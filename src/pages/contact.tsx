import { useMemo, useState } from "react";
import { Phone, Mail, MapPin, Send, Facebook, Instagram, Linkedin, CheckCircle2, MessageSquare, ExternalLink, Headphones, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/use-data";
import { QuotationRateLimitedError, submitQuotationRequest } from "@/lib/commerce";
import { telHref } from "@/lib/utils";
import { useSeoMeta } from "@/hooks/use-seo";
import { useImagePreloader } from "@/hooks/use-image-preloader";

interface FormData { name: string; email: string; phone: string; subject: string; message: string }
const CONTACT_HERO_IMAGE = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80";

export default function Contact() {
  useSeoMeta("contact", null, { breadcrumbs: [{ label: "Contact Us" }] });
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  useImagePreloader(useMemo(() => [CONTACT_HERO_IMAGE], []));
  const [form, setForm] = useState<FormData>({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const update = (key: keyof FormData, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const clean = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), subject: form.subject.trim(), message: form.message.trim() };
    if (clean.name.length < 2 || clean.name.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email) || clean.phone.length < 3 || clean.phone.length > 30 || !clean.message || clean.message.length > 5000) {
      toast({ title: "Please check your details", description: "Enter a valid name, email, phone number and message before submitting.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Preserve the established lead + quotation-request workflow used by the admin team.
      await submitQuotationRequest({
        name: clean.name,
        email: clean.email,
        phone: clean.phone,
        county: "General Inquiry",
        projectType: "General Contact Message",
        service: clean.subject || "General Contact Message",
        message: clean.message,
      });
      toast({ title: "Your message has been received", description: "Thank you for contacting TOPLINE. Our team will review your enquiry." });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      toast({
        title: "We couldn't submit your message",
        description: error instanceof QuotationRateLimitedError ? error.message : "Your enquiry was not confirmed. Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const phone = settings.contact?.phone || "";
  const email = settings.contact?.email || "";
  const address = settings.contact?.address || "";
  const contactInfo = [
    { icon: Phone, title: "Speak with our team", value: phone, subtitle: "For order, product and service enquiries", href: phone ? telHref(phone) : "", actionText: "Call" },
    { icon: Mail, title: "Email our team", value: email, subtitle: "For technical questions, RFQs and documents", href: email ? `mailto:${email}` : "", actionText: "Email" },
    { icon: MapPin, title: "Office and showroom", value: address, subtitle: "Location supplied in our site settings", href: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "", actionText: "Directions" },
  ].filter((item) => Boolean(item.value));
  const socials = [
    { name: "Facebook", url: settings.social_links?.facebook, Icon: Facebook },
    { name: "Instagram", url: settings.social_links?.instagram, Icon: Instagram },
    { name: "LinkedIn", url: settings.social_links?.linkedin, Icon: Linkedin },
  ].filter((item): item is { name: string; url: string; Icon: typeof Facebook } => Boolean(item.url));

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Contact Us" }]} />
      <div className="bg-[#F7F6F3]">
        <section className="relative isolate overflow-hidden bg-[#0C2D57] text-white">
          <div className="absolute inset-0 -z-20"><img src={CONTACT_HERO_IMAGE} alt="" loading="eager" className="h-full w-full object-cover opacity-20" /></div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0B1B2D] via-[#0C2D57]/95 to-[#0C2D57]/75" />
          <div className="page-container grid gap-9 py-12 sm:py-16 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:py-20">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4E33D]"><Headphones className="h-4 w-4" /> Contact TOPLINE</p>
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">Let's talk about what your project needs.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">Tell us about your flooring, waterproofing, material or site requirements. Share the details and our team can direct your enquiry to the right workflow.</p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/80"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#B4E33D]" />Project and service enquiries</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#B4E33D]" />Product and technical questions</span></div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm sm:p-6">
              <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B4E33D]/15 text-[#B4E33D]"><Sparkles className="h-5 w-5" /></div><div><h2 className="font-display text-lg font-semibold text-white">Help us route your enquiry</h2><p className="mt-1 text-sm leading-6 text-white/70">Choose a subject and include the project context, location and timing that you already know.</p></div></div>
              <Link href="/quotation" className="mt-5 inline-flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#0C2D57] transition hover:bg-[#F7F6F3]">Need a formal quotation? <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="page-container grid gap-7 py-8 sm:py-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10 lg:py-16">
          <aside className="space-y-6">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#566F0D]">Get in touch</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#0C2D57] sm:text-3xl">Choose your channel.</h2><p className="mt-3 text-sm leading-7 text-slate-600">Use the contact details configured by the TOPLINE team. If a detail is not configured, it is not displayed here.</p></div>
            <div className="space-y-3">{contactInfo.map((info) => <div key={info.title} className="flex gap-4 rounded-xl border border-[#DDD9D2] bg-white p-4 transition hover:border-[#CFCAC1] hover:shadow-sm sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F5F7] text-[#0E6B78]"><info.icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#0C2D57]">{info.title}</h3><p className="mt-1 break-words text-sm font-medium text-slate-700">{info.value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{info.subtitle}</p>{info.href && <a href={info.href} target={info.href.startsWith("https://") ? "_blank" : undefined} rel={info.href.startsWith("https://") ? "noopener noreferrer" : undefined} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#0E6B78] hover:text-[#0B5864]">{info.actionText}<ExternalLink className="h-3.5 w-3.5" /></a>}</div></div>)}</div>
            {socials.length > 0 && <div className="rounded-xl border border-[#DDD9D2] bg-white p-5"><h3 className="font-display text-lg font-semibold text-[#0C2D57]">Follow TOPLINE</h3><p className="mt-1 text-sm text-slate-500">Official social links configured for the website.</p><div className="mt-4 flex flex-wrap gap-2">{socials.map(({ name, url, Icon }) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Visit TOPLINE on ${name}`} className="inline-flex items-center gap-2 rounded-lg border border-[#DDD9D2] px-3 py-2 text-sm font-medium text-[#0E6B78] hover:bg-[#E6F5F7]"><Icon className="h-4 w-4" />{name}</a>)}</div></div>}
          </aside>

          <section className="rounded-2xl border border-[#DDD9D2] bg-white p-5 shadow-[0_18px_55px_-40px_rgba(12,45,87,0.4)] sm:p-8 lg:p-9">
            <div className="mb-7 border-b border-[#E3DFD8] pb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#566F0D]">Send an enquiry</p><h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold text-[#0C2D57]"><MessageSquare className="h-5 w-5 text-[#0E6B78]" />How can we help?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Required fields are marked. Your submission is routed through TOPLINE's existing enquiry and quotation workflow.</p></div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><label htmlFor="contact-name" className="text-sm font-semibold text-[#0C2D57]">Full name <span className="text-red-700">*</span></label><input id="contact-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={200} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" className="h-12 w-full rounded-lg border border-[#868D95] bg-white px-4 text-sm text-[#0C2D57] outline-none transition placeholder:text-[#5F6B78] focus:border-[#0E6B78] focus:ring-2 focus:ring-[#0E6B78]/20" /></div>
                <div className="space-y-2"><label htmlFor="contact-email" className="text-sm font-semibold text-[#0C2D57]">Email address <span className="text-red-700">*</span></label><input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" className="h-12 w-full rounded-lg border border-[#868D95] bg-white px-4 text-sm text-[#0C2D57] outline-none transition placeholder:text-[#5F6B78] focus:border-[#0E6B78] focus:ring-2 focus:ring-[#0E6B78]/20" /></div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><label htmlFor="contact-phone" className="text-sm font-semibold text-[#0C2D57]">Phone number <span className="text-red-700">*</span></label><input id="contact-phone" name="phone" type="tel" autoComplete="tel" required minLength={3} maxLength={30} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Include your country code if possible" className="h-12 w-full rounded-lg border border-[#868D95] bg-white px-4 text-sm text-[#0C2D57] outline-none transition placeholder:text-[#5F6B78] focus:border-[#0E6B78] focus:ring-2 focus:ring-[#0E6B78]/20" /></div>
                <div className="space-y-2"><label htmlFor="contact-subject" className="text-sm font-semibold text-[#0C2D57]">Enquiry type</label><select id="contact-subject" name="subject" value={form.subject} onChange={(e) => update("subject", e.target.value)} className="h-12 w-full rounded-lg border border-[#868D95] bg-white px-4 text-sm text-[#0C2D57] outline-none transition focus:border-[#0E6B78] focus:ring-2 focus:ring-[#0E6B78]/20"><option value="">Select a subject (optional)</option><option value="General Inquiry">General enquiry</option><option value="Site Survey & Moisture Test">Site survey or moisture test</option><option value="Product Technical Specification">Product technical specification</option><option value="Quotation Request">Quotation request / BOQ</option><option value="Subcontracting & Partnership">Subcontracting or partnership</option></select></div>
              </div>
              <div className="space-y-2"><label htmlFor="contact-message" className="text-sm font-semibold text-[#0C2D57]">Your message <span className="text-red-700">*</span></label><textarea id="contact-message" name="message" required minLength={1} maxLength={5000} rows={6} value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us what you need, where the project is located, and any timing or technical details you already know." className="w-full resize-y rounded-lg border border-[#868D95] bg-white px-4 py-3 text-sm leading-6 text-[#0C2D57] outline-none transition placeholder:text-[#5F6B78] focus:border-[#0E6B78] focus:ring-2 focus:ring-[#0E6B78]/20" /><p className="text-right text-xs text-slate-500">{form.message.length}/5000</p></div>
              <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0C2D57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2548] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-52">{submitting ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Submitting…</> : <><Send className="h-4 w-4" />Send enquiry <ArrowRight className="h-4 w-4" /></>}</button>
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E6B78]" />Please do not include payment card details or other sensitive information in this form.</p>
            </form>
          </section>
        </section>
      </div>
    </CustomerLayout>
  );
}
