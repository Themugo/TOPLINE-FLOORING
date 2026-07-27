import { useState, useMemo } from 'react';
import { FileText, Send, CheckCircle2, ShieldCheck, Calculator, Sparkles, ArrowRight, Phone, Check } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useSeoMeta } from '@/hooks/use-seo';
import { useImagePreloader } from '@/hooks/use-image-preloader';
import { useSiteSettings } from '@/hooks/use-data';
import { telHref } from '@/lib/utils';
import { Link } from 'wouter';

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  project_type: string;
  area_size: string;
  location: string;
  substrate_condition: string;
  timeline: string;
  message: string;
}

const QUOTATION_HERO_IMAGE = 'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=1200&q=80';

// Systems for instant budget estimation preview
const SYSTEM_ESTIMATES: Record<string, { name: string; ratePerSqm: number; unit: string; thickness: string }> = {
  'Industrial Flooring': { name: 'Epoxy / PU Industrial Screed', ratePerSqm: 2800, unit: 'sqm', thickness: '3mm - 6mm Heavy Duty' },
  'Commercial Flooring': { name: 'Self-Leveling Commercial Epoxy', ratePerSqm: 2200, unit: 'sqm', thickness: '2mm Decorative Finish' },
  'Residential Flooring': { name: '3D Metallic / Flake Epoxy', ratePerSqm: 2500, unit: 'sqm', thickness: '2mm - 3mm Premium' },
  'Waterproofing - Roof': { name: 'Polyurethane Liquid Membrane (Roof)', ratePerSqm: 1800, unit: 'sqm', thickness: '1.5mm UV Resistant' },
  'Waterproofing - Basement': { name: 'Crystalline / Bituminous Tanking', ratePerSqm: 2100, unit: 'sqm', thickness: 'Subterranean Grade' },
  'Waterproofing - Bathroom': { name: 'Flexible Cementitious Waterproofing', ratePerSqm: 1400, unit: 'sqm', thickness: 'Dual Coat System' },
  'Water Tank': { name: 'Potable Water Grade Membrane', ratePerSqm: 1950, unit: 'sqm', thickness: 'Food & Health Certified' },
  'Concrete Sealing': { name: 'Lithium Silicate Densifier & Sealer', ratePerSqm: 1100, unit: 'sqm', thickness: 'Deep Penetrating' },
};

export default function Quotation() {
  useSeoMeta('quotation', null, { breadcrumbs: [{ label: 'Request Quotation' }] });
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const phone = settings.contact?.phone || '+1 (555) 000-0000';
  const companyName = settings.site_info?.name || settings.company?.name || 'Your Flooring Company';

  useImagePreloader(useMemo(() => [QUOTATION_HERO_IMAGE], []));

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    project_type: 'Industrial Flooring',
    area_size: '250',
    location: '',
    substrate_condition: 'New Concrete Slab',
    timeline: 'Within 2 Weeks',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rfqReference, setRfqReference] = useState('');

  // Instant calculation preview
  const estimatedBudget = useMemo(() => {
    const areaNum = parseFloat(form.area_size.replace(/[^0-9.]/g, ''));
    if (isNaN(areaNum) || areaNum <= 0) return null;
    const system = SYSTEM_ESTIMATES[form.project_type] || SYSTEM_ESTIMATES['Industrial Flooring'];
    const minEst = Math.round(areaNum * system.ratePerSqm * 0.9);
    const maxEst = Math.round(areaNum * system.ratePerSqm * 1.15);
    return {
      area: areaNum,
      systemName: system.name,
      thickness: system.thickness,
      min: minEst,
      max: maxEst,
    };
  }, [form.area_size, form.project_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.rpc('submit_quotation_request', {
        p_name: form.name,
        p_email: form.email,
        p_phone: form.phone,
        p_company: form.company || null,
        p_project_type: form.project_type,
        p_area_size: form.area_size,
        p_location: form.location,
        p_message: `Substrate: ${form.substrate_condition} | Timeline: ${form.timeline}\nDetails: ${form.message}`,
      });

      if (error) throw error;

      const refCode = `RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setRfqReference(refCode);
      setSubmitted(true);

      toast({
        title: 'Quotation Request Received',
        description: `Reference Code: ${refCode}. An engineer will deliver a formal submittal within 24 hours.`,
      });
    } catch {
      toast({
        title: 'Submission Error',
        description: 'Failed to submit request. Please check your network or call us directly.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <CustomerLayout>
        <div className="min-h-screen bg-gray-50/60 py-16 lg:py-24">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-10 shadow-xl text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-primary-500 to-emerald-500" />

              <div className="w-20 h-20 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold tracking-wider uppercase mb-2">
                  Reference ID: {rfqReference}
                </span>
                <h1 className="font-display text-3xl font-bold text-navy-950">
                  Quotation Request Received!
                </h1>
                <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong className="text-navy-950">{form.name}</strong>. Our senior technical quantity surveyor is reviewing your project details for <strong className="text-navy-950">{form.location}</strong>.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 text-left border border-gray-100 space-y-3 text-xs">
                <h3 className="font-display font-bold text-navy-950 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  What Happens Next?
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Technical Review:</strong> We evaluate substrate specifications ({form.project_type}).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Site Verification:</strong> A field surveyor will call <strong>{form.phone}</strong> to confirm site readiness.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Formal BOQ Delivery:</strong> Detailed itemized quotation (Materials + Labor + Warranty) sent to <strong>{form.email}</strong> within 24h.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setForm({
                      name: '',
                      email: '',
                      phone: '',
                      company: '',
                      project_type: 'Industrial Flooring',
                      area_size: '250',
                      location: '',
                      substrate_condition: 'New Concrete Slab',
                      timeline: 'Within 2 Weeks',
                      message: '',
                    });
                  }}
                  className="flex-1 py-3 px-5 rounded-xl border border-gray-200 text-xs font-bold text-navy-950 hover:bg-gray-50 transition-colors"
                >
                  Submit Another RFQ
                </button>
                <Link
                  href="/shop"
                  className="flex-1 py-3 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Browse Materials Shop</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: 'Request Quotation' }]} />
      <div className="min-h-screen bg-gray-50/60 pb-16">
        {/* Hero Banner Header */}
        <section className="relative bg-navy-950 text-white overflow-hidden py-16 lg:py-20 border-b border-navy-800">
          <div className="absolute inset-0 opacity-25">
            <img
              src={QUOTATION_HERO_IMAGE}
              alt="Substrate preparation and epoxy flooring"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-500/20 text-primary-300 border border-primary-400/30 text-xs font-bold uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                Official Bill of Quantities & Scope Assessment
              </span>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                Request an Itemized Technical Quotation
              </h1>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                Receive an engineering-certified cost breakdown including substrate prep, primer systems, resin coats, and manufacturer warranty options.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs sm:text-sm font-semibold text-gray-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Guaranteed 24h Turnaround</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Zero Obligation Free Site Assessment</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left: Estimation Preview Widget & Tips */}
            <div className="lg:col-span-5 space-y-6">
              {/* Calculator Widget */}
              <div className="bg-navy-950 rounded-2xl border border-navy-800 p-6 text-white shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary-400" />
                    <h3 className="font-display font-bold text-base text-white">
                      Instant Budget Estimator
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-500/20 text-primary-300 border border-primary-400/30 px-2 py-0.5 rounded">
                    Guide Rates
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-300 mb-1">
                      Selected System
                    </label>
                    <p className="font-semibold text-primary-300 bg-white/5 p-2.5 rounded-xl border border-white/10">
                      {estimatedBudget?.systemName || form.project_type}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-300 mb-1">
                        Coverage Area
                      </label>
                      <p className="font-mono font-bold text-white bg-white/5 p-2.5 rounded-xl border border-white/10">
                        {estimatedBudget?.area || 0} sqm
                      </p>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-300 mb-1">
                        System Spec
                      </label>
                      <p className="font-semibold text-gray-300 bg-white/5 p-2.5 rounded-xl border border-white/10 truncate">
                        {estimatedBudget?.thickness}
                      </p>
                    </div>
                  </div>

                  {estimatedBudget && estimatedBudget.min > 0 ? (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary-950/80 to-navy-900 border border-primary-500/30 mt-4 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary-300">
                        Estimated Budget Range (KES)
                      </p>
                      <p className="font-display text-2xl font-bold text-white">
                        KES {estimatedBudget.min.toLocaleString()} – {estimatedBudget.max.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight pt-1">
                        *Includes supply of premium chemical resin and specialized installation. Final price depends on substrate moisture levels and surface profiling requirements.
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-[11px] pt-1">
                      Enter a valid floor/roof surface area (in sqm) in the form to see an instant estimated budget range.
                    </p>
                  )}
                </div>
              </div>

              {/* Requirements & Callout Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-4">
                <h3 className="font-display font-bold text-navy-950 text-sm">
                  Why Contractors Choose {companyName}
                </h3>
                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Technical Data Sheets (TDS):</strong> Comprehensive chemical resistance & compressive strength specifications included.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Substrate Moisture Testing:</strong> Calcium chloride & RH hygrometer tests performed prior to primer coat.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Custom Color Matching:</strong> RAL color palette options available for commercial branding.</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-semibold">Prefer speaking over phone?</span>
                  <a
                    href={telHref(phone)}
                    className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Desk</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Quotation Form */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs">
                <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold text-navy-950">
                      Project Specification Form
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Please provide accurate dimensions and site conditions for an exact BOQ.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md border border-primary-200">
                    Step 1 of 1
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="font-display font-bold text-navy-950 text-xs uppercase tracking-wider mb-3 text-primary-600">
                      1. Contact Information
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
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
                          placeholder="e.g. Architect Sarah Ochieng"
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
                          placeholder="sarah@firm.co.ke"
                        />
                      </div>
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
                          Company / Firm (Optional)
                        </label>
                        <input
                          type="text"
                          value={form.company}
                          onChange={(e) => setForm({ ...form, company: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400"
                          placeholder="e.g. Apex Construction Ltd"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Scope & Surface Area */}
                  <div className="pt-2 border-t border-gray-100">
                    <h3 className="font-display font-bold text-navy-950 text-xs uppercase tracking-wider mb-3 text-primary-600">
                      2. Scope & Surface Dimensions
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                          Project System / Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={form.project_type}
                          onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-semibold text-navy-950 transition-all cursor-pointer"
                        >
                          {Object.keys(SYSTEM_ESTIMATES).map((sysKey) => (
                            <option key={sysKey} value={sysKey}>
                              {sysKey}
                            </option>
                          ))}
                          <option value="Joint Sealing">Joint Sealing & Crack Repair</option>
                          <option value="Other">Other Custom Application</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                          Total Area Size (approx. SQM) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={form.area_size}
                            onChange={(e) => setForm({ ...form, area_size: e.target.value })}
                            className="w-full px-3.5 py-2.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400"
                            placeholder="e.g. 500"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                            SQM
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                        Project Site Location <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400"
                        placeholder="e.g. Tatu City Industrial Park, Ruiru"
                      />
                    </div>
                  </div>

                  {/* Substrate & Site Conditions */}
                  <div className="pt-2 border-t border-gray-100">
                    <h3 className="font-display font-bold text-navy-950 text-xs uppercase tracking-wider mb-3 text-primary-600">
                      3. Substrate & Timeline
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                          Current Substrate State
                        </label>
                        <select
                          value={form.substrate_condition}
                          onChange={(e) => setForm({ ...form, substrate_condition: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-semibold text-navy-950 transition-all cursor-pointer"
                        >
                          <option value="New Concrete Slab">Freshly Poured Concrete (&gt;28 days cured)</option>
                          <option value="Old Concrete with Cracks">Existing Concrete (Requires Crack Repair)</option>
                          <option value="Tiled Surface">Existing Ceramic / Terrazzo Tiles</option>
                          <option value="Damaged Epoxy Coating">Old Failed Coating (Requires Grinding)</option>
                          <option value="Plywood / Steel Deck">Timber / Steel Structural Deck</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                          Expected Timeline
                        </label>
                        <select
                          value={form.timeline}
                          onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-semibold text-navy-950 transition-all cursor-pointer"
                        >
                          <option value="Immediate (1-3 days)">Immediate / Emergency (1-3 days)</option>
                          <option value="Within 2 Weeks">Within 2 Weeks</option>
                          <option value="Within 1 Month">Within 1 Month</option>
                          <option value="Planning Phase">Future Planning Phase (&gt;1 Month)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Message / Additional Details */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-navy-950 mb-1.5">
                      Detailed Technical Scope & Special Requirements <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400 min-h-[120px] resize-none"
                      placeholder="Specify chemical exposure risks (acid/alkali), forklift traffic weight, desired RAL color, or roof slope details..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 px-6 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Preparing RFQ Submittal...' : 'Submit Quotation Request'}</span>
                  </button>

                  <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                    By submitting this RFQ, our quantity surveying department will generate an official bill of quantities. No payment or financial commitment required.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

