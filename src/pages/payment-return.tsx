import { PaymentAccountsList } from '@/components/payments/PaymentAccountsList';
import type { CustomerPaymentAccount } from '@/lib/payment-accounts';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { getCustomerPaymentAttemptStatus } from '@/lib/customer-payments';
import { useSeoMeta } from '@/hooks/use-seo';
import { formatKES } from '@/lib/utils';

interface SavedOrderSummary {
  items: { name: string; quantity: number; price: number }[];
  subtotal: number; deliveryCharge: number; discountAmount: number; total: number;
  orderNumber: string | null; paymentAttemptId?: string; savedAt: number;
}

/** The cart stores a receipt in sessionStorage at checkout; find the one that belongs to this payment attempt. */
function findSavedSummary(attemptId: string | null): SavedOrderSummary | null {
  if (!attemptId) return null;
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith('order_summary_')) continue;
      const parsed = JSON.parse(sessionStorage.getItem(key) || 'null') as SavedOrderSummary | null;
      if (parsed && parsed.paymentAttemptId === attemptId && Date.now() - (parsed.savedAt || 0) <= 24 * 60 * 60 * 1000) return parsed;
    }
  } catch { /* storage unavailable: the page still works without the receipt */ }
  return null;
}

export default function PaymentReturn() {
  useSeoMeta('payment-return', null, { noIndex: true });
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [status, setStatus] = useState<'loading'|'pending'|'successful'|'failed'>('loading');
  const [message, setMessage] = useState('Checking your payment status…');
  const summary = useMemo(() => findSavedSummary(params.get('attempt_id')), [params]);
  const [instructions, setInstructions] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const attemptId = params.get('attempt_id');
    const token = params.get('access_token');
    if (!attemptId || !token) { setStatus('failed'); setMessage('This payment return link is incomplete.'); return; }
    let active = true;
    let polls = 0; // local counter: state captured by this closure would never advance, so polling never stopped
    let timer: number | undefined;
    const poll = async () => {
      const nextPoll = ++polls;
      try {
        const result = await getCustomerPaymentAttemptStatus(attemptId, token);
        if (!active) return;
        if (result.status === 'successful') { setStatus('successful'); setMessage('Your payment has been confirmed.'); return; }
        if (result.status === 'failed' || result.status === 'reversed') { setStatus('failed'); setMessage(result.failure_reason || 'The payment was not completed.'); return; }
        setStatus('pending'); setInstructions(result.instructions || null); setMessage(result.method === 'mpesa' ? 'Waiting for M-Pesa confirmation. Keep your phone available.' : result.method === 'bank_transfer' ? 'Use the bank-transfer instructions below, then Topline will reconcile the payment.' : 'Your payment is still being processed.');
        if (nextPoll < 40) timer = window.setTimeout(poll, 3500);
        else setMessage('Payment confirmation is taking longer than expected. You can return to your account and check again later.');
      } catch (e) { if (active) { setStatus('failed'); setMessage(e instanceof Error ? e.message : 'Unable to verify payment status.'); } }
    };
    void poll();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [params]);
  const Icon = status === 'successful' ? CheckCircle2 : status === 'failed' ? XCircle : Clock3;
  return <CustomerLayout><div className="max-w-xl mx-auto px-6 py-20 text-center"><Icon className="w-16 h-16 mx-auto mb-5"/><h1 className="text-3xl font-bold">{status === 'successful' ? 'Payment confirmed' : status === 'failed' ? 'Payment not completed' : 'Payment processing'}</h1><p className="text-muted-foreground mt-3">{message}</p>{Array.isArray(instructions?.accounts) && instructions.accounts.length ? <div className="text-left mt-6"><h2 className="font-semibold mb-3">Payment instructions</h2><PaymentAccountsList accounts={instructions.accounts as CustomerPaymentAccount[]} /></div> : instructions && Object.keys(instructions).length ? <div className="text-left mt-6 rounded-xl border bg-muted/20 p-5"><h2 className="font-semibold">Bank transfer instructions</h2><div className="mt-3 space-y-2 text-sm">{Object.entries(instructions).map(([k,v]) => <div key={k} className="flex justify-between gap-4 border-b py-2"><span className="capitalize text-muted-foreground">{k.replace(/_/g,' ')}</span><span className="font-medium text-right">{String(v)}</span></div>)}</div></div> : null}{summary && <div className="mt-6 rounded-xl border bg-white p-5 text-left"><h2 className="font-semibold">Order {summary.orderNumber || 'summary'}</h2><ul className="mt-3 space-y-1 border-b pb-3 text-sm">{summary.items.map((item, index) => <li key={index} className="flex justify-between gap-4"><span>{item.name} × {item.quantity}</span><span className="font-medium">{formatKES(item.price * item.quantity)}</span></li>)}</ul><div className="mt-3 space-y-1 text-sm text-muted-foreground"><div className="flex justify-between"><span>Subtotal</span><span>{formatKES(summary.subtotal)}</span></div>{summary.deliveryCharge > 0 && <div className="flex justify-between"><span>Delivery</span><span>{formatKES(summary.deliveryCharge)}</span></div>}{summary.discountAmount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatKES(summary.discountAmount)}</span></div>}<div className="flex justify-between text-base font-bold text-foreground"><span>Total</span><span>{formatKES(summary.total)}</span></div></div>{summary.orderNumber && <p className="mt-3 text-xs text-muted-foreground">Keep this order number. You can follow progress any time with the phone number used at checkout.</p>}</div>}<div className="flex flex-wrap justify-center gap-3 mt-8">{summary?.orderNumber && <Link href={`/track-order?order=${encodeURIComponent(summary.orderNumber)}`} className="btn-primary">Track this order</Link>}<Link href="/portal" className={summary?.orderNumber ? 'btn-secondary' : 'btn-primary'}>My Account</Link><button className="btn-secondary" onClick={() => navigate('/shop')}>Continue shopping</button></div></div></CustomerLayout>;
}
