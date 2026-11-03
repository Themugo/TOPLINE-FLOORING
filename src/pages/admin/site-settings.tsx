import { useState, useEffect } from 'react';
import { Save, Globe, Phone, Code, Image as ImageIcon } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { dbFailure, describeDbError, errorMessage } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useCMS } from '@/context/CMSContext';
import { ImageUpload } from '@/components/ui/image-upload';
import { BrandLockup } from '@/components/layout/BrandLockup';
import { DEFAULT_BRAND, resolveBrand } from '@/lib/brand';

export default function AdminSiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const { toast } = useToast();
  const { refetch: refetchCms } = useCMS();
  const [activeTab, setActiveTab] = useState('general');

  const [settings, setSettings] = useState({
    site_info: {
      name: '', tagline: '', description: '', founded: 2014,
      // Brand lockup. Everything here is shown across the public site, admin, footer and browser tab.
      logo_url: '', favicon_url: '', brand_wordmark: '', brand_descriptor: '', brand_promise: undefined as string | undefined, show_brand_text: true,
    },
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
    const { data, error } = await supabase.from('site_settings').select('*');
    if (error) {
      // Never leave the form looking empty-but-saveable: saving defaults would overwrite real values.
      setLoadFailed(true);
      toast({ title: 'Could not load site settings', description: describeDbError(error), variant: 'destructive' });
    } else if (data) {
      const newSettings = { ...settings };
      // Older versions saved the logo and favicon under their own keys, which the public site never read.
      // Carry those values over so nothing already uploaded is lost.
      let legacyLogo = '';
      let legacyFavicon = '';
      const parseValue = (raw: unknown): Record<string, unknown> => {
        try { const v = typeof raw === 'object' ? raw : JSON.parse(String(raw || '{}')); return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>; } catch { return {}; }
      };
      data.forEach((s) => {
        if (s.setting_key === 'logo') legacyLogo = String(parseValue(s.setting_value).url ?? '');
        if (s.setting_key === 'favicon') legacyFavicon = String(parseValue(s.setting_value).url ?? '');
      });
      data.forEach((s) => {
        if (newSettings[s.setting_key as keyof typeof newSettings]) {
          const settingKey = s.setting_key as keyof typeof newSettings;
          const rawValue = s.setting_value;
          const parsedValue: unknown = parseValue(rawValue);
          (newSettings as unknown as Record<string, unknown>)[settingKey] = parsedValue;
        }
      });
      newSettings.site_info = { ...settings.site_info, ...newSettings.site_info };
      if (!newSettings.site_info.logo_url && legacyLogo) newSettings.site_info.logo_url = legacyLogo;
      if (!newSettings.site_info.favicon_url && legacyFavicon) newSettings.site_info.favicon_url = legacyFavicon;
      setSettings(newSettings);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (loadFailed) {
      toast({ title: 'Reload before saving', description: 'The current settings could not be loaded, so saving now could overwrite them.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        const failure = await dbFailure(
          supabase.from('site_settings').upsert(
            { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
            { onConflict: 'setting_key' }
          )
        );
        if (failure) throw new Error(failure);
      }
      await refetchCms();
      toast({ title: 'Settings saved successfully' });
    } catch (err) {
      toast({ title: 'Failed to save settings', description: errorMessage(err), variant: 'destructive' });
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
    { id: 'appearance', label: 'Appearance', icon: ImageIcon },
  ];

  if (loading) return <AdminLayout title="Site Settings"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Site Settings">
      <div className="max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 whitespace-nowrap items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
                <p className="mb-1 text-xs text-gray-500">The full name, used in page titles, the footer copyright, search results and emails.</p>
                <input
                  type="text"
                  value={settings.site_info.name}
                  onChange={(e) => updateSetting('site_info', { ...settings.site_info, name: e.target.value })}
                  className="input"
                  placeholder="Your Flooring Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search-result tagline</label>
                <p className="mb-1 text-xs text-gray-500">Shown after the business name in browser tabs and search results. The line under the logo is set below.</p>
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
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Logo text and descriptor</h3>
                  <p className="text-xs text-gray-500">Shown next to the logo in the website header, footer and the admin sidebar. Changes apply everywhere once saved.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="brand-wordmark">Brand name (large text)</label>
                    <input id="brand-wordmark" type="text" maxLength={30} value={settings.site_info.brand_wordmark} onChange={(e) => updateSetting('site_info', { ...settings.site_info, brand_wordmark: e.target.value })} className="input" placeholder={DEFAULT_BRAND.wordmark} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="brand-descriptor">Descriptor (line under the name)</label>
                    <input id="brand-descriptor" type="text" maxLength={40} value={settings.site_info.brand_descriptor} onChange={(e) => updateSetting('site_info', { ...settings.site_info, brand_descriptor: e.target.value })} className="input" placeholder={DEFAULT_BRAND.descriptor} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="brand-promise">Slogan (wider screens and footer)</label>
                  <input id="brand-promise" type="text" maxLength={80} value={settings.site_info.brand_promise ?? DEFAULT_BRAND.promise} onChange={(e) => updateSetting('site_info', { ...settings.site_info, brand_promise: e.target.value })} className="input" />
                  <p className="mt-1 text-xs text-gray-500">Leave it empty to hide the slogan.</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Preview</p>
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"><BrandLockup variant="header" brand={resolveBrand(settings.site_info)} /></div>
                </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
                  <input
                    type="email"
                    value={settings.contact.email}
                    onChange={(e) => updateSetting('contact', { ...settings.contact, email: e.target.value })}
                    className="input"
                    placeholder="contact@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone</label>
                  <input
                    type="tel"
                    value={settings.contact.phone}
                    onChange={(e) => updateSetting('contact', { ...settings.contact, phone: e.target.value })}
                    className="input"
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={settings.contact.phone_alt}
                    onChange={(e) => updateSetting('contact', { ...settings.contact, phone_alt: e.target.value })}
                    className="input"
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={settings.contact.whatsapp}
                    onChange={(e) => updateSetting('contact', { ...settings.contact, whatsapp: e.target.value })}
                    className="input"
                    placeholder="15550000000"
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
                  placeholder="123 Industrial Parkway, Commerce City, ST 12345"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Business Hours</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="https://facebook.com/yourflooringcompany"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input
                  type="url"
                  value={settings.social_links.instagram}
                  onChange={(e) => updateSetting('social_links', { ...settings.social_links, instagram: e.target.value })}
                  className="input"
                  placeholder="https://instagram.com/yourflooringcompany"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                <input
                  type="url"
                  value={settings.social_links.linkedin}
                  onChange={(e) => updateSetting('social_links', { ...settings.social_links, linkedin: e.target.value })}
                  className="input"
                  placeholder="https://linkedin.com/company/yourflooringcompany"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                <input
                  type="url"
                  value={settings.social_links.twitter}
                  onChange={(e) => updateSetting('social_links', { ...settings.social_links, twitter: e.target.value })}
                  className="input"
                  placeholder="https://twitter.com/yourflooringcompany"
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
                placeholder="Your Flooring Company | Professional Flooring Solutions"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Default OG Share Image</label>
              <ImageUpload
                value={settings.seo_defaults.og_image}
                onChange={(url) => updateSetting('seo_defaults', { ...settings.seo_defaults, og_image: url })}
                folder="branding"
                label="OG Share Image"
              />
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Logo & Favicon Asset Selection</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Header Logo</label>
                  <ImageUpload
                    value={settings.site_info.logo_url}
                    onChange={(url) => updateSetting('site_info', { ...settings.site_info, logo_url: url })}
                    folder="branding"
                    label="Header Logo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Browser Favicon</label>
                  <ImageUpload
                    value={settings.site_info.favicon_url}
                    onChange={(url) => updateSetting('site_info', { ...settings.site_info, favicon_url: url })}
                    folder="branding"
                    label="Favicon Icon"
                  />
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" className="mt-1" checked={settings.site_info.show_brand_text !== false} onChange={(e) => updateSetting('site_info', { ...settings.site_info, show_brand_text: e.target.checked })} />
                <span>Show the brand name and descriptor next to the logo<span className="block text-xs text-gray-500">Turn this off if your uploaded logo already contains the business name.</span></span>
              </label>
              <p className="text-xs text-gray-500">Square or wide PNG or WebP with a transparent background works best. Leave empty to use the built-in Topline mark. The favicon is the small icon in the browser tab. The installed phone-app icon is separate: see docs/brand-and-site-identity.md.</p>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"><BrandLockup variant="header" brand={resolveBrand(settings.site_info)} /></div>
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
                  placeholder="Your Flooring Company. All rights reserved."
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
