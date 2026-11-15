import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { formatKES } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/db';
import { completeOrderRefund, requestOrderRefund, type OrderOperations360 } from '@/lib/order-operations';

const OPEN = ['pending', 'processing'];
const COUNTED = ['pending', 'processing', 'successful'];

/**
 * Finance workflow for refunds. The money is returned outside the system (M-Pesa reversal, bank transfer, card
 * dashboard), so staff first record the request and later record the provider outcome. Server rules (finance permission,
 * refundable limit, replay safety) are enforced by create_order_refund_request / complete_order_refund.
 */
export function RefundPanel({ data, onChanged }: { data: OrderOperations360; onChanged: () => Promise<void> | void }) {
  const { toast } = useToast();
  const order = data.order;
  const paid = Number(data.paid_amount) || 0;
  const committed = (data.refunds || []).filter((r) => COUNTED.includes(r.status)).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const refundable = Math.max(Math.round((paid - committed) * 100) / 100, 0);

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  // One key per intended refund: a double click or retry after a network error replays instead of duplicating.
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [completing, setCompleting] = useState<string | null>(null);
  const [provider, setProvider] = useState('');
  const [providerRef, setProviderRef] = useState('');
  const [notes, setNotes] = useState('');

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= refundable + 0.001 && Math.abs(amountNum * 100 - Math.round(amountNum * 100)) < 1e-6;
  const canRequest = amountValid && reason.trim().length >= 5 && !busy;

  const request = async () => {
    if (!canRequest) return;
    setBusy(true);
    try {
      await requestOrderRefund({ orderId: order.id, amount: Math.round(amountNum * 100) / 100, reason: reason.trim(), idempotencyKey: requestKey });
      toast({ title: 'Refund request recorded', description: 'Pay the customer back, then record the outcome below.' });
      setAmount(''); setReason(''); setRequestKey(crypto.randomUUID());
      await onChanged();
    } catch (e) { toast({ title: 'Refund not recorded', description: errorMessage(e, 'Please try again'), variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const finish = async (refundId: string, success: boolean) => {
    if (success && (!provider.trim() || !providerRef.trim())) { toast({ title: 'Provider and reference required', description: 'Enter how the refund was paid (e.g. mpesa, bank) and its transaction reference.', variant: 'destructive' }); return; }
    if (!success && !notes.trim()) { toast({ title: 'Add a note', description: 'Say why the refund failed.', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await completeOrderRefund({ refundId, success, provider, providerRefundId: providerRef, notes });
      toast({ title: success ? 'Refund marked as paid' : 'Refund marked as failed' });
      setCompleting(null); setProvider(''); setProviderRef(''); setNotes('');
      await onChanged();
    } catch (e) { toast({ title: 'Could not record outcome', description: errorMessage(e, 'Please try again'), variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  if (paid <= 0 && !(data.refunds || []).length) return null;

  return (
    <div className="mt-4 rounded-lg border p-4">
      <h4 className="font-medium flex items-center gap-2"><Undo2 className="w-4 h-4" /> Refunds</h4>
      <p className="mt-1 text-xs text-muted-foreground">Paid {formatKES(paid)} · committed to refunds {formatKES(committed)} · refundable {formatKES(refundable)}</p>

      {(data.refunds || []).length > 0 && (
        <ul className="mt-3 space-y-2">
          {data.refunds.map((r) => (
            <li key={r.id} className="rounded-md bg-muted/30 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><span className="font-medium">{formatKES(Number(r.amount))}</span> · <span className="capitalize">{r.status}</span>{r.provider ? ` · ${r.provider}${r.provider_refund_id ? ` ${r.provider_refund_id}` : ''}` : ''}</span>
                {OPEN.includes(r.status) && completing !== r.id && <button type="button" className="btn-secondary" onClick={() => setCompleting(r.id)}>Record outcome</button>}
              </div>
              {r.reason && <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>}
              {completing === r.id && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input className="input" placeholder="Paid via (mpesa, bank, card…)" value={provider} onChange={(e) => setProvider(e.target.value)} maxLength={80} />
                  <input className="input" placeholder="Transaction reference" value={providerRef} onChange={(e) => setProviderRef(e.target.value)} maxLength={200} />
                  <input className="input sm:col-span-2" placeholder="Notes (required if the refund failed)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="button" className="btn-primary" disabled={busy} onClick={() => void finish(r.id, true)}>Mark paid</button>
                    <button type="button" className="btn-secondary" disabled={busy} onClick={() => void finish(r.id, false)}>Mark failed</button>
                    <button type="button" className="btn-secondary" disabled={busy} onClick={() => setCompleting(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {refundable > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-[140px_1fr_auto]">
          <input className="input" inputMode="decimal" placeholder={`Amount (max ${refundable})`} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Refund amount" />
          <input className="input" placeholder="Reason for refund (min 5 characters)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} aria-label="Refund reason" />
          <button type="button" className="btn-primary" disabled={!canRequest} onClick={() => void request()}>Request refund</button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Nothing left to refund on this order.</p>
      )}
    </div>
  );
}
