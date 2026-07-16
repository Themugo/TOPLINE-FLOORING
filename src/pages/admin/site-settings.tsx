import { useState, useEffect } from 'react';
import { Save, Globe, Phone, Image, Code } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function AdminSiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');

  const [settings, setSettings] = useState({
    site_info: { name: '', tagline: '', description: '', founded: 2014 },
    logo: { url: '', width: 200, height: 60 },
    favicon: { url: '' },
    contact: { email: '', phone: '', phone_alt: '', whatsapp: '', address: '' },
    business_hours: { weekdays: { open: '08:00', close: '17:00' }, saturday: { open: '09:00', close: '13:00' }, sunday: 'Closed' },
    social_links: { facebook: '', instagram: '', linkedin: '', twitter: '' },
    footer: { copyright: '', show_social: true },
    seo_defaults: { meta_title: '', meta_description: '', og_image: '' },
  });

  useEffect(() => {
    fetchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*');
    if (data) {
      const newSettings = { ...settings };
      data.forEach((s) => {
        if (newSettings[s.setting_key as keyof typeof newSettings]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (newSettings as any)[s.setting_key] = typeof s.setting_value === 'object' ? s.setting_value : JSON.parse(s.setting_value || '{}');
        }
      });
      setSettings(newSettings);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('site_settings').upsert(
          { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
          { onConflict: 'setting_key' }
        );
      }
      toast({ title: 'Settings saved successfully' });
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    }
    setSaving(false);
  };

  const updateSetting = (key: string, value: Record<string, unknown>) => {
    setSettings({ ...settings, [key]: value });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'social', label: 'Social', icon: Code },
    { id: 'seo', label: 'SEO', icon: Code },
    { id: 'appearance', label: 'Appearance', icon: Image },
  ];

  if (loading) return <AdminLayout title="Site Settings"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Site Settings">
      <div className="max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h2 className="font-semibold text-gray-900">General Information</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                <input
                  type="text"
                  value={settings.site_info.name}
                  onChange={(e) => updateSetting('site_info', { ...settings.site_info, name: e.target.value })}
                  className="input"
                  placeholder="Topline Flooring & Waterproofing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={settings.site_info.tagline}
                  onChange={(e) => updateSetting('site_info', { ...settings.site_info, tagline: e.target.value })}
                  className="input"
                  placeholder="Professional Flooring and Waterproofing Solutions"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={settings.site_info.description}
                  onChange={(e) => updateSetting('site_info', { ...settings.site_info, description: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Company description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                  <input
                    type="number"
                    value={settings.site_info.founded}
                    onChange={(e) => updateSetting('site_info', { ...settings.site_info, founded: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Contact Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
                  <input
                    type="email"
                    value={settings.contact.email}
                    onChange={(e) => updateSetting('contact', { ...settings.contact, email: e.target.value })}
                    className="input"
                    placeholder="info@toplineflooring.co.ke"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone</label>
                  <input
                    type="tel"
                    value={settings.contact.phone}
                    onChange={(e) => updateSetting('contact', { ...settings.contact, phone: e.target.value })}
                    className="input"
                    placeholder="+254 700 123 456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={settings.contact.phone_alt}
                    onChange={(e) => updateSetting('contact', { ...settings.contact, phone_alt: e.target.value })}
                    className="input"
                    placeholder="+254 733 987 654"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={settings.contact.whatsapp}
                    onChange={(e) => updateSetting('contact', { ...settings.contact, whatsapp: e.target.value })}
                    className="input"
                    placeholder="254700123456"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: country code + number (no + sign)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={settings.contact.address}
                  onChange={(e) => updateSetting('contact', { ...settings.contact, address: e.target.value })}
                  className="input"
                  placeholder="Industrial Area, Nairobi, Kenya"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Business Hours</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekdays Open</label>
                  <input
                    type="time"
                    value={settings.business_hours.weekdays?.open || '08:00'}
                    onChange={(e) => updateSetting('business_hours', { ...settings.business_hours, weekdays: { ...settings.business_hours.weekdays, open: e.target.value } })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekdays Close</label>
                  <input
                    type="time"
                    value={settings.business_hours.weekdays?.close || '17:00'}
                    onChange={(e) => updateSetting('business_hours', { ...settings.business_hours, weekdays: { ...settings.business_hours.weekdays, close: e.target.value } })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Saturday Open</label>
                  <input
                    type="time"
                    value={settings.business_hours.saturday?.open || '09:00'}
                    onChange={(e) => updateSetting('business_hours', { ...settings.business_hours, saturday: { ...settings.business_hours.saturday, open: e.target.value } })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Saturday Close</label>
                  <input
                    type="time"
                    value={settings.business_hours.saturday?.close || '13:00'}
                    onChange={(e) => updateSetting('business_hours', { ...settings.business_hours, saturday: { ...settings.business_hours.saturday, close: e.target.value } })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sunday</label>
                <select
                  value={settings.business_hours.sunday || 'Closed'}
                  onChange={(e) => updateSetting('business_hours', { ...settings.business_hours, sunday: e.target.value })}
                  className="input"
                >
                  <option value="Closed">Closed</option>
                  <option value="By Appointment">By Appointment Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Social Tab */}
        {activeTab === 'social' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Social Media Links</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                <input
                  type="url"
                  value={settings.social_links.facebook}
                  onChange={(e) => updateSetting('social_links', { ...settings.social_links, facebook: e.target.value })}
                  className="input"
                  placeholder="https://facebook.com/toplineflooring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input
                  type="url"
                  value={settings.social_links.instagram}
                  onChange={(e) => updateSetting('social_links', { ...settings.social_links, instagram: e.target.value })}
                  className="input"
                  placeholder="https://instagram.com/toplineflooring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                <input
                  type="url"
                  value={settings.social_links.linkedin}
                  onChange={(e) => updateSetting('social_links', { ...settings.social_links, linkedin: e.target.value })}
                  className="input"
                  placeholder="https://linkedin.com/company/toplineflooring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                <input
                  type="url"
                  value={settings.social_links.twitter}
                  onChange={(e) => updateSetting('social_links', { ...settings.social_links, twitter: e.target.value })}
                  className="input"
                  placeholder="https://twitter.com/toplineflooring"
                />
              </div>
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Default SEO Settings</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Meta Title</label>
              <input
                type="text"
                value={settings.seo_defaults.meta_title}
                onChange={(e) => updateSetting('seo_defaults', { ...settings.seo_defaults, meta_title: e.target.value })}
                className="input"
                placeholder="Topline Flooring & Waterproofing | Nairobi, Kenya"
              />
              <p className="text-xs text-gray-500 mt-1">{settings.seo_defaults.meta_title?.length || 0}/60 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Meta Description</label>
              <textarea
                value={settings.seo_defaults.meta_description}
                onChange={(e) => updateSetting('seo_defaults', { ...settings.seo_defaults, meta_description: e.target.value })}
                className="input min-h-[100px]"
                placeholder="Professional flooring and waterproofing solutions..."
              />
              <p className="text-xs text-gray-500 mt-1">{settings.seo_defaults.meta_description?.length || 0}/160 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default OG Image URL</label>
              <input
                type="url"
                value={settings.seo_defaults.og_image}
                onChange={(e) => updateSetting('seo_defaults', { ...settings.seo_defaults, og_image: e.target.value })}
                className="input"
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Logo & Favicon</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={settings.logo.url}
                  onChange={(e) => updateSetting('logo', { ...settings.logo, url: e.target.value })}
                  className="input"
                  placeholder="/logo.svg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                <input
                  type="url"
                  value={settings.favicon.url}
                  onChange={(e) => updateSetting('favicon', { ...settings.favicon, url: e.target.value })}
                  className="input"
                  placeholder="/favicon.svg"
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Footer Settings</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Text</label>
                <input
                  type="text"
                  value={settings.footer.copyright}
                  onChange={(e) => updateSetting('footer', { ...settings.footer, copyright: e.target.value })}
                  className="input"
                  placeholder="Topline Flooring and Waterproofing. All rights reserved."
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.footer.show_social}
                  onChange={(e) => updateSetting('footer', { ...settings.footer, show_social: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Show social links in footer</span>
              </label>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
