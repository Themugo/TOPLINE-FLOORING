import { useCallback, useEffect, useState } from 'react';
import { Landmark, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  PAYMENT_ACCOUNT_KINDS, deleteBusinessPaymentAccount, emptyPaymentAccount, listBusinessPaymentAccounts,
  saveBusinessPaymentAccount, type BusinessPaymentAccount, type PaymentAccountInput,
} from '@/lib/payment-accounts';

const kindLabel = (k: string) => PAYMENT_ACCOUNT_KINDS.find((x) => x.value === k)?.label ?? k;

function summary(a: BusinessPaymentAccount) {
  if (a.kind === 'bank') return `${a.bank_name ?? ''} · ${a.account_number ?? ''}`;
  if (a.kind === 'mpesa_paybill') return `Paybill ${a.paybill_number ?? ''}${a.account_number ? ` · Acc ${a.account_number}` : ''}`;
  if (a.kind === 'mpesa_till') return `Till ${a.till_number ?? ''}`;
  if (a.kind === 'mpesa_send_money') return a.phone_number ?? '';
  return a.account_name ?? '';
}

export function PaymentAccountsManager() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BusinessPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentAccountInput | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAccounts(await listBusinessPaymentAccounts()); setLoadError(null); }
    catch (e) { setLoadError(e instanceof Error ? e.message : 'Could not load payment details'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof PaymentAccountInput>(key: K, value: PaymentAccountInput[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const text = (key: keyof PaymentAccountInput) => (form?.[key] as string | null) ?? '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await saveBusinessPaymentAccount(editingId, form);
      toast({ title: editingId ? 'Payment details updated' : 'Payment details added' });
      setForm(null); setEditingId(null);
      await load();
    } catch (err) {
      toast({ title: 'Could not save', description: (err as { message?: string } | null)?.message ?? 'Unknown error. Check your permissions and try again.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async (a: BusinessPaymentAccount) => {
    if (!window.confirm(`Delete "${a.label}"? Customers will no longer see it.`)) return;
    try { await deleteBusinessPaymentAccount(a.id); toast({ title: 'Deleted' }); await load(); }
    catch (err) { toast({ title: 'Could not delete', description: (err as { message?: string } | null)?.message ?? 'Unknown error. Check your permissions and try again.', variant: 'destructive' }); }
  };

  const kind = form?.kind;
  return (
    <section className="mt-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="payment-accounts-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="payment-accounts-heading" className="flex items-center gap-2 text-lg font-semibold text-navy-950"><Landmark className="h-5 w-5" /> Bank &amp; payment details</h2>
          <p className="mt-1 text-sm text-gray-600">Bank accounts, M-Pesa Paybill, Till and Send Money numbers. Active ones marked &ldquo;show to customers&rdquo; appear in every customer&rsquo;s portal and in bank-transfer payment instructions.</p>
        </div>
        {!form && <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => { setEditingId(null); setForm(emptyPaymentAccount()); }}><Plus className="h-4 w-4" /> Add details</button>}
      </div>

      {loadError && <p role="alert" className="mt-4 text-sm text-red-600">{loadError}</p>}
      {loading ? <p className="mt-4 text-sm text-gray-500">Loading…</p> : !form && (
        accounts.length === 0 ? <p className="mt-4 text-sm text-gray-500">Nothing added yet. Customers will not see payment details until you add some.</p> :
        <ul className="mt-4 divide-y divide-gray-100">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy-900">{a.label} <span className="ml-1 text-xs font-normal text-gray-500">{kindLabel(a.kind)}</span></p>
                <p className="truncate text-xs text-gray-600">{summary(a)}</p>
                <p className="mt-1 text-[11px] text-gray-500">{!a.is_active ? 'Inactive' : a.show_to_customers ? 'Shown to customers' : 'Hidden from customers'}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" aria-label={`Edit ${a.label}`} className="btn-secondary p-2" onClick={() => { setEditingId(a.id); setForm({ ...a, id: undefined } as PaymentAccountInput); }}><Pencil className="h-4 w-4" /></button>
                <button type="button" aria-label={`Delete ${a.label}`} className="btn-secondary p-2 text-red-600" onClick={() => void remove(a)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-navy-900">{editingId ? 'Edit details' : 'Add details'}</h3><button type="button" aria-label="Cancel" onClick={() => { setForm(null); setEditingId(null); }}><X className="h-4 w-4" /></button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="block text-sm font-medium mb-1" htmlFor="pa-kind">Type</label>
              <select id="pa-kind" className="input" value={form.kind} onChange={(e) => set('kind', e.target.value as PaymentAccountInput['kind'])}>{PAYMENT_ACCOUNT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1" htmlFor="pa-label">Label customers see</label>
              <input id="pa-label" className="input" required maxLength={80} value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="e.g. KCB – Topline Ltd" /></div>
            {kind === 'bank' && <>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-bank">Bank name</label><input id="pa-bank" className="input" required value={text('bank_name')} onChange={(e) => set('bank_name', e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-accname">Account name</label><input id="pa-accname" className="input" required value={text('account_name')} onChange={(e) => set('account_name', e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-accno">Account number</label><input id="pa-accno" className="input" required value={text('account_number')} onChange={(e) => set('account_number', e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-branch">Branch (optional)</label><input id="pa-branch" className="input" value={text('branch')} onChange={(e) => set('branch', e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-swift">SWIFT / BIC (optional)</label><input id="pa-swift" className="input" value={text('swift_code')} onChange={(e) => set('swift_code', e.target.value)} /></div>
            </>}
            {kind === 'mpesa_paybill' && <>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-paybill">Paybill number</label><input id="pa-paybill" className="input" inputMode="numeric" required value={text('paybill_number')} onChange={(e) => set('paybill_number', e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-paybill-acc">Account number (optional)</label><input id="pa-paybill-acc" className="input" value={text('account_number')} onChange={(e) => set('account_number', e.target.value)} /></div>
            </>}
            {kind === 'mpesa_till' && <div><label className="block text-sm font-medium mb-1" htmlFor="pa-till">Till number</label><input id="pa-till" className="input" inputMode="numeric" required value={text('till_number')} onChange={(e) => set('till_number', e.target.value)} /></div>}
            {kind === 'mpesa_send_money' && <>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-phone">Phone number</label><input id="pa-phone" className="input" inputMode="tel" required value={text('phone_number')} onChange={(e) => set('phone_number', e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1" htmlFor="pa-regname">Registered name (optional)</label><input id="pa-regname" className="input" value={text('account_name')} onChange={(e) => set('account_name', e.target.value)} /></div>
            </>}
            {kind === 'other' && <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1" htmlFor="pa-othername">Name (optional)</label><input id="pa-othername" className="input" value={text('account_name')} onChange={(e) => set('account_name', e.target.value)} /></div>}
            <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1" htmlFor="pa-ref">What should customers use as the reference? (optional)</label><input id="pa-ref" className="input" maxLength={200} value={text('reference_hint')} onChange={(e) => set('reference_hint', e.target.value)} placeholder="e.g. Your order or invoice number" /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1" htmlFor="pa-inst">Extra instructions (optional)</label><textarea id="pa-inst" className="input" rows={3} maxLength={1000} value={text('instructions')} onChange={(e) => set('instructions', e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1" htmlFor="pa-order">Display order</label><input id="pa-order" type="number" min={0} max={10000} className="input" value={form.display_order} onChange={(e) => set('display_order', Number(e.target.value))} /></div>
            <div className="flex flex-col gap-2 justify-end text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Active</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.show_to_customers} onChange={(e) => set('show_to_customers', e.target.checked)} /> Show to customers in their account</label>
            </div>
          </div>
          <div className="flex gap-3"><button type="button" className="btn-secondary flex-1" onClick={() => { setForm(null); setEditingId(null); }}>Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button></div>
        </form>
      )}
    </section>
  );
}
