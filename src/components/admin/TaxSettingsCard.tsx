import { useEffect, useState } from 'react';
import { Percent, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/db';
import { DEFAULT_TAX_SETTINGS, loadTaxSettings, taxAdded, taxIncludedIn, type TaxSettings } from '@/lib/tax';
import { MoneyBreakdown } from '@/components/finance/MoneyBreakdown';

export function TaxSettingsCard() {
  const [tax, setTax] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [rate, setRate] = useState('16');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTaxSettings().then((t) => { setTax(t); setRate(String(t.rate)); });
  }, []);

  const rateNum = Number(rate);
  const rateOk = rate.trim() !== '' && Number.isFinite(rateNum) && rateNum >= 0 && rateNum <= 100;
  const live: TaxSettings = { ...tax, rate: rateOk ? rateNum : tax.rate };
  const sample = 11600;
  const inc = taxIncludedIn(sample, live);
  const added = taxAdded(10000, live.rate);

  const save = async () => {
    if (!rateOk) { toast({ title: 'Enter a tax rate between 0 and 100', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const value = { ...live, label: live.label.trim() || 'VAT' };
      const { data, error } = await supabase.from('site_settings')
        .upsert({ setting_key: 'tax_settings', setting_value: value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' })
        .select('setting_value').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('The change was not saved. Check that you have settings permission.');
      setTax(value);
      toast({ title: 'Tax & accounting saved' });
    } catch (err) {
      toast({ title: 'Could not save tax settings', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-2xl">
      <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><Percent className="w-5 h-5" /> Tax & accounting</h2>
      <p className="text-sm text-gray-500 mb-4">
        Set the tax once. It becomes the default on quotations and invoices (added on top) and is shown as the amount already
        included in shop prices on carts, order confirmations, receipts and emails.
      </p>
      <label className="flex items-center gap-2 text-sm mb-4">
        <input type="checkbox" checked={tax.enabled} onChange={(e) => setTax({ ...tax, enabled: e.target.checked })} />
        Charge and show tax
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax name</label>
          <input className="input" value={tax.label} maxLength={20} onChange={(e) => setTax({ ...tax, label: e.target.value })} placeholder="VAT" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
          <input className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="16" />
          <p className="text-xs text-gray-400 mt-1">Kenya VAT is 16%.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">KRA PIN / tax number</label>
          <input className="input" value={tax.tax_pin} maxLength={30} onChange={(e) => setTax({ ...tax, tax_pin: e.target.value.toUpperCase() })} placeholder="P000000000X" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm mb-5">
        <input type="checkbox" checked={tax.show_pin_on_documents} onChange={(e) => setTax({ ...tax, show_pin_on_documents: e.target.checked })} />
        Print the tax number on invoices, quotations and receipts
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Invoice (tax added)</p>
          <MoneyBreakdown rows={[
            { label: 'Subtotal', amount: 10000 },
            ...(live.enabled ? [{ label: `${live.label} (${live.rate}%)`, amount: added.tax }] : []),
            { label: 'Total', amount: live.enabled ? added.total : 10000, tone: 'total' as const },
          ]} />
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Shop receipt (tax included)</p>
          <MoneyBreakdown rows={[
            { label: 'Total paid', amount: sample, tone: 'strong' },
            ...(live.enabled ? [
              { label: `Amount before ${live.label}`, amount: inc.net, tone: 'muted' as const },
              { label: `${live.label} (${live.rate}%) included`, amount: inc.tax, tone: 'muted' as const },
            ] : []),
          ]} />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save tax settings'}</button>
    </div>
  );
}
