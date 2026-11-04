import { useEffect, useState } from 'react';
import { BadgeCheck, Download, Mail, Truck } from 'lucide-react';
import { formatKES } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/db';
import { confirmManualPayment, resendPaymentReceipt, type OrderOperations360 } from '@/lib/order-operations';
import { listBusinessPaymentAccounts, type BusinessPaymentAccount } from '@/lib/payment-accounts';
import { generateDeliveryNotePdf, generatePaymentReceiptPdf } from '@/lib/pdf';
import { useTaxSettings } from '@/lib/tax';
import { useSiteSettings } from '@/hooks/use-data';

type Method = 'bank_transfer' | 'mpesa' | 'cash' | 'cheque';
const METHOD_LABEL: Record<Method, string> = { bank_transfer: 'Bank transfer', mpesa: 'M-Pesa (paybill / till / send money)', cash: 'Cash', cheque: 'Cheque' };

const accountLabel = (a: BusinessPaymentAccount) => a.label || a.bank_name || a.paybill_number || a.till_number || a.kind;

/** Staff confirm that money really arrived, then the system receipts the buyer. Works next to automatic (Daraja/card) payments. */
export function ManualPaymentPanel({ data, onChanged }: { data: OrderOperations360; onChanged: () => Promise<void> | void }) {
  const { toast } = useToast();
  const tax = useTaxSettings();
  const { settings } = useSiteSettings();
  const order = data.order;
  const outstanding = Math.max(Number(data.outstanding_amount) || 0, 0);
  const [method, setMethod] = useState<Method>(order.payment_method === 'mpesa' ? 'mpesa' : 'bank_transfer');
  const [amount, setAmount] = useState(String(outstanding));
  const [reference, setReference] = useState('');
  const [account, setAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<BusinessPaymentAccount[]>([]);

  useEffect(() => { setAmount(String(outstanding)); setReference(''); setSure(false); }, [outstanding, order.id]);
  useEffect(() => { listBusinessPaymentAccounts().then((a) => setAccounts(a.filter((x) => x.is_active))).catch(() => setAccounts([])); }, []);

  const company = {
    name: settings.site_info?.name || 'Topline Flooring & Waterproofing', tagline: settings.site_info?.tagline,
    phone: settings.contact?.phone, email: settings.contact?.email, address: settings.contact?.address,
    taxLabel: tax.label, taxPin: tax.show_pin_on_documents ? tax.tax_pin : '',
  };
  const amountNum = Number(amount);
  const needsRef = method !== 'cash';
  const valid = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= outstanding + 0.001 && (!needsRef || reference.trim().length >= 4);

  const submit = async () => {
    if (!valid || !sure) return;
    setBusy(true);
    try {
      const res = await confirmManualPayment({ orderId: order.id, amount: amountNum, method, reference: reference.trim(), receivedInto: account, notes: notes.trim() });
      toast({
        title: res.balance > 0 ? `Payment recorded. ${formatKES(res.balance)} still due` : 'Payment confirmed. Order paid in full',
        description: res.receipt_emailed ? `Receipt emailed to ${res.customer_email}.` : 'No receipt email was sent (no valid buyer email). Download the receipt and share it.',
      });
      setNotes(''); await onChanged();
    } catch (e) { toast({ title: 'Payment not confirmed', description: errorMessage(e), variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const resend = async (id: string) => {
    try { await resendPaymentReceipt(id); toast({ title: 'Receipt queued', description: `It will be emailed to ${order.customer_email}.` }); }
    catch (e) { toast({ title: 'Could not resend', description: errorMessage(e), variant: 'destructive' }); }
  };

  const successful = data.payments.filter((p) => p.status === 'successful');
  const paidSoFar = successful.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="mt-4 space-y-4">
      {outstanding > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Confirm money received · {formatKES(outstanding)} outstanding</p>
          <p className="text-xs text-amber-800 mt-1">Only confirm after you have seen the money in the bank or M-Pesa statement. The buyer is emailed a receipt immediately.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <label className="text-xs font-medium text-gray-700">Received by
              <select className="input mt-1" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                {(Object.keys(METHOD_LABEL) as Method[]).map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-700">Amount received (KES)
              <input className="input mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="text-xs font-medium text-gray-700">{method === 'cash' ? 'Reference (optional)' : 'Bank / M-Pesa reference *'}
              <input className="input mt-1" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === 'mpesa' ? 'e.g. SJK9Z8Y7X6' : 'Transaction reference'} />
            </label>
            <label className="text-xs font-medium text-gray-700">Paid into
              <select className="input mt-1" value={account} onChange={(e) => setAccount(e.target.value)}>
                <option value="">Select account (optional)</option>
                {accounts.map((a) => <option key={a.id} value={accountLabel(a)}>{accountLabel(a)}</option>)}
              </select>
            </label>
          </div>
          <input className="input mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (optional)" />
          <label className="mt-3 flex items-start gap-2 text-xs text-gray-800"><input type="checkbox" className="mt-0.5" checked={sure} onChange={(e) => setSure(e.target.checked)} /> I have verified this money in the account statement.</label>
          <button type="button" onClick={() => void submit()} disabled={!valid || !sure || busy} className="btn-primary mt-3 flex items-center gap-2 disabled:opacity-50"><BadgeCheck className="w-4 h-4" />{busy ? 'Confirming…' : 'Confirm payment & send receipt'}</button>
          {!valid && amount !== '' && <p className="text-xs text-red-600 mt-2">{amountNum > outstanding ? 'The amount is more than the outstanding balance.' : needsRef && reference.trim().length < 4 ? 'Enter the bank or M-Pesa reference.' : 'Enter a valid amount.'}</p>}
        </div>
      ) : <p className="text-sm font-medium text-green-700 flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> Paid in full</p>}

      {successful.length > 0 && <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-gray-500">Receipts</p>
        {successful.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
            <span>{String(p.method).replace('_', ' ')} · {p.provider_reference || p.provider_transaction_id || 'no ref'} · <strong>{formatKES(p.amount)}</strong></span>
            <span className="flex gap-2">
              <button type="button" className="btn-secondary text-xs flex items-center gap-1" onClick={() => generatePaymentReceiptPdf(order, data.items as never, p, paidSoFar, company, tax)}><Download className="w-3.5 h-3.5" />Receipt PDF</button>
              <button type="button" className="btn-secondary text-xs flex items-center gap-1" onClick={() => void resend(p.id)}><Mail className="w-3.5 h-3.5" />Email again</button>
            </span>
          </div>
        ))}
      </div>}

      <button type="button" className="btn-secondary text-xs flex items-center gap-1" onClick={() => generateDeliveryNotePdf(order, data.items as never, data.deliveries[0] || null, company)}><Truck className="w-3.5 h-3.5" />Print delivery note</button>
    </div>
  );
}
