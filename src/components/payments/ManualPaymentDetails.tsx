import { useEffect, useState } from 'react';
import { getPublicPaymentAccounts, type CustomerPaymentAccount } from '@/lib/payment-accounts';
import { PaymentAccountsList } from './PaymentAccountsList';
import { formatKES } from '@/lib/utils';
import { useSiteSettings } from '@/hooks/use-data';

/** Where and how to pay manually (M-Pesa Till / Paybill / bank), with the amount and the reference to quote. */
export function ManualPaymentDetails({ amount, reference }: { amount?: number | null; reference?: string | null }) {
  const [accounts, setAccounts] = useState<CustomerPaymentAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { settings } = useSiteSettings();
  useEffect(() => {
    let active = true;
    getPublicPaymentAccounts()
      .then((rows) => { if (active) setAccounts(rows); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  if (!loaded) return null;
  // Bank transfer can be offered while no payment account is configured (or the list failed to load). Never leave the
  // customer without a way to pay: say so plainly and point them to the company's own contact details.
  if (!accounts.length) {
    const { email, phone } = settings.contact;
    return (
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-left text-sm" role="status">
        <h3 className="font-semibold">Payment details</h3>
        {typeof amount === 'number' && amount > 0 && <p className="mt-1">Amount to pay: <span className="text-lg font-bold">{formatKES(amount)}</span></p>}
        <p className="mt-2">We could not show our payment account details here. {reference ? <>Your order <span className="font-mono font-semibold">{reference}</span> is saved. </> : null}Please contact us{phone ? <> on <a className="underline" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a></> : null}{email ? <> or <a className="underline" href={`mailto:${email}`}>{email}</a></> : null} and we will send you the details to pay.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-left">
      <h3 className="font-semibold">How to pay</h3>
      {typeof amount === 'number' && amount > 0 && <p className="mt-1 text-sm">Amount to pay: <span className="text-lg font-bold">{formatKES(amount)}</span></p>}
      {reference
        ? <p className="mt-1 text-sm">Use <span className="font-mono font-semibold">{reference}</span> as the payment reference.</p>
        : <p className="mt-1 text-sm text-muted-foreground">Place your order first. You will get an order number to use as the payment reference.</p>}
      <div className="mt-4"><PaymentAccountsList accounts={accounts} /></div>
      <p className="mt-3 text-xs text-muted-foreground">We confirm payments manually and email you a receipt.</p>
    </div>
  );
}
