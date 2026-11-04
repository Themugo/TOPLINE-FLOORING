import { useEffect, useState } from 'react';
import { getPublicPaymentAccounts, type CustomerPaymentAccount } from '@/lib/payment-accounts';
import { PaymentAccountsList } from './PaymentAccountsList';
import { formatKES } from '@/lib/utils';

/** Where and how to pay manually (M-Pesa Till / Paybill / bank), with the amount and the reference to quote. */
export function ManualPaymentDetails({ amount, reference }: { amount?: number | null; reference?: string | null }) {
  const [accounts, setAccounts] = useState<CustomerPaymentAccount[]>([]);
  useEffect(() => {
    let active = true;
    getPublicPaymentAccounts().then((rows) => { if (active) setAccounts(rows); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (!accounts.length) return null;
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-left">
      <h3 className="font-semibold">How to pay</h3>
      {typeof amount === 'number' && amount > 0 && <p className="mt-1 text-sm">Amount to pay: <span className="text-lg font-bold">{formatKES(amount)}</span></p>}
      {reference && <p className="mt-1 text-sm">Use <span className="font-mono font-semibold">{reference}</span> as the payment reference.</p>}
      <div className="mt-4"><PaymentAccountsList accounts={accounts} /></div>
      <p className="mt-3 text-xs text-muted-foreground">We confirm payments manually and email you a receipt.</p>
    </div>
  );
}
