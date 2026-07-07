import { useState, useEffect } from 'react';
import { Save, AlertCircle, KeyRound } from 'lucide-react';
import { Link } from 'wouter';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email || '');
      setNewEmail(data.user?.email || '');
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const updates: { email?: string; password?: string } = {};
      if (newEmail && newEmail !== currentEmail) updates.email = newEmail;
      if (newPassword) updates.password = newPassword;

      if (Object.keys(updates).length === 0) {
        toast({ title: 'Nothing to update' });
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Account settings saved successfully' });
    } catch (err) {
      toast({
        title: 'Failed to save settings',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Settings"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Site & Contact Information</h2>
          <p className="text-sm text-gray-500 mb-4">
            Site name, tagline, contact details, logo, SEO defaults, and social links
            now live in one place.
          </p>
          <Link href="/admin/site-settings" className="btn-secondary inline-block">
            Go to Site Settings
          </Link>
        </div>

        {/* Admin Account (real Supabase Auth) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Admin Account
          </h2>
          <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>This changes the sign-in credentials for the account you're currently logged in as.</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input"
                autoComplete="username"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="Leave blank to keep current password"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Account Settings'}
        </button>
      </div>
    </AdminLayout>
  );
}
