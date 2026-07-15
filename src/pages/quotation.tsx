import { useState } from 'react';
import { FileText, Send, CheckCircle } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useSeoMeta } from '@/hooks/use-seo';

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  project_type: string;
  area_size: string;
  location: string;
  message: string;
}

export default function Quotation() {
  useSeoMeta('quotation');
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    project_type: '',
    area_size: '',
    location: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        p_message: form.message,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Quotation Request Submitted',
        description: 'We\'ll prepare a detailed quote and contact you within 24-48 hours.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">
              Request Received!
            </h1>
            <p className="text-gray-600 mb-8">
              Thank you for requesting a quotation. Our team will review your project
              details and get back to you with a detailed quote within 24-48 hours.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-2">What's Next?</h3>
              <p className="text-sm text-gray-600">
                A project manager will contact you to discuss your requirements and
                provide a comprehensive quotation including materials, labor, and timeline.
              </p>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({
                  name: '',
                  email: '',
                  phone: '',
                  company: '',
                  project_type: '',
                  area_size: '',
                  location: '',
                  message: '',
                });
              }}
              className="btn-secondary"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="bg-white border-b border-gray-200 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-primary-600" />
            </div>
            <span className="section-label">Free Consultation</span>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-primary-600 mb-4 mt-2">
              Request a Quotation
            </h1>
            <p className="text-navy-600 text-lg max-w-2xl mx-auto">
              Tell us about your project and we'll provide a detailed quotation including
              materials, installation, and timeline.
            </p>
          </div>
        </section>

        <section className="py-12 lg:py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="card p-6 lg:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="font-display text-xl font-bold text-navy-900 mb-6">
                  Project Details
                </h2>

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
                      Phone Number *
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
                      Company (optional)
                    </label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="input"
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Type *
                    </label>
                    <select
                      required
                      value={form.project_type}
                      onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                      className="input"
                    >
                      <option value="">Select project type</option>
                      <option value="Industrial Flooring">Industrial Flooring</option>
                      <option value="Commercial Flooring">Commercial Flooring</option>
                      <option value="Residential Flooring">Residential Flooring</option>
                      <option value="Waterproofing - Roof">Waterproofing - Roof</option>
                      <option value="Waterproofing - Basement">Waterproofing - Basement</option>
                      <option value="Waterproofing - Bathroom">Waterproofing - Bathroom/Kitchen</option>
                      <option value="Water Tank">Water Tank Waterproofing</option>
                      <option value="Concrete Sealing">Concrete Sealing</option>
                      <option value="Joint Sealing">Joint Sealing</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area Size (approx.)
                    </label>
                    <input
                      type="text"
                      value={form.area_size}
                      onChange={(e) => setForm({ ...form, area_size: e.target.value })}
                      className="input"
                      placeholder="e.g., 500 sqm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="input"
                    placeholder="e.g., Westlands, Nairobi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Description *
                  </label>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="input min-h-[150px] resize-none"
                    placeholder="Describe your project in detail. Include current condition, desired finish, timeline, and any specific requirements..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Submit Quotation Request'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  By submitting, you agree to be contacted regarding your quotation request.
                  We typically respond within 24-48 hours.
                </p>
              </form>
            </div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}
