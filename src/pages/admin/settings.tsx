import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Setting {
  id: string;
  setting_key: string;
  setting_value: string;
}

export default function AdminSettings() {
  const [, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    site_name: '',
    site_tagline: '',
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    business_hours: '',
    whatsapp_number: '',
    admin_username: '',
    admin_password: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('admin_settings').select('*');
    if (data) {
      setSettings(data);
      const formObj: Record<string, string> = {};
      data.forEach((s) => {
        formObj[s.setting_key] = s.setting_value;
      });
      setFormData({
        site_name: formObj.site_name || '',
        site_tagline: formObj.site_tagline || '',
        contact_email: formObj.contact_email || '',
        contact_phone: formObj.contact_phone || '',
        contact_address: formObj.contact_address || '',
        business_hours: formObj.business_hours || '',
        whatsapp_number: formObj.whatsapp_number || '',
        admin_username: formObj.admin_username || '',
        admin_password: formObj.admin_password || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(formData).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        await supabase
          .from('admin_settings')
          .upsert(update, { onConflict: 'setting_key' });
      }

      toast({ title: 'Settings saved successfully' });
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Settings"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl">
        {/* Site Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Site Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
              <input
                type="text"
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                className="input"
                placeholder="Topline Flooring & Waterproofing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input
                type="text"
                value={formData.site_tagline}
                onChange={(e) => setFormData({ ...formData, site_tagline: e.target.value })}
                className="input"
                placeholder="Professional flooring and waterproofing solutions"
              />
            </div>
          </div>
        </div>

        {/* Contact Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="input"
                  placeholder="info@toplineflooring.co.ke"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="input"
                  placeholder="+254 700 123 456"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                className="input"
                placeholder="254700123456"
              />
              <p className="text-xs text-gray-500 mt-1">Format: country code + number (no + sign)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={formData.contact_address}
                onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                className="input"
                placeholder="Industrial Area, Nairobi, Kenya"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours</label>
              <input
                type="text"
                value={formData.business_hours}
                onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
                className="input"
                placeholder="Mon-Fri: 8AM-5PM, Sat: 9AM-1PM"
              />
            </div>
          </div>
        </div>

        {/* Admin Credentials */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Admin Credentials</h2>
          <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Changing these will affect admin login access</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.admin_username}
                onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </AdminLayout>
  );
}
