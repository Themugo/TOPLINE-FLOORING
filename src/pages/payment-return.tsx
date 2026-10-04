import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { getCustomerPaymentAttemptStatus } from '@/lib/customer-payments';
import { useSeoMeta } from '@/hooks/use-seo';

export default function PaymentReturn() {
  useSeoMeta('payment-return', null, { noIndex: true });
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [status, setStatus] = useState<'loading'|'pending'|'successful'|'failed'>('loading');
  const [message, setMessage] = useState('Checking your payment status…');
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
  return <CustomerLayout><div className="max-w-xl mx-auto px-6 py-20 text-center"><Icon className="w-16 h-16 mx-auto mb-5"/><h1 className="text-3xl font-bold">{status === 'successful' ? 'Payment confirmed' : status === 'failed' ? 'Payment not completed' : 'Payment processing'}</h1><p className="text-muted-foreground mt-3">{message}</p>{instructions && Object.keys(instructions).length ? <div className="text-left mt-6 rounded-xl border bg-muted/20 p-5"><h2 className="font-semibold">Bank transfer instructions</h2><div className="mt-3 space-y-2 text-sm">{Object.entries(instructions).map(([k,v]) => <div key={k} className="flex justify-between gap-4 border-b py-2"><span className="capitalize text-muted-foreground">{k.replace(/_/g,' ')}</span><span className="font-medium text-right">{String(v)}</span></div>)}</div></div> : null}<div className="flex justify-center gap-3 mt-8"><Link href="/portal" className="btn-primary">My Account</Link><button className="btn-secondary" onClick={() => navigate('/shop')}>Continue shopping</button></div></div></CustomerLayout>;
}
