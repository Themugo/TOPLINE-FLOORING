import { useState } from 'react';
import { Check, Copy, Landmark, Smartphone } from 'lucide-react';
import type { CustomerPaymentAccount } from '@/lib/payment-accounts';

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-sm font-semibold tabular-nums text-right [overflow-wrap:anywhere]">
        {value}
        <button
          type="button"
          aria-label={`Copy ${label}`}
          className="rounded p-1 text-muted-foreground hover:bg-slate-100"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined);
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </span>
    </div>
  );
}

const KIND_TITLES: Record<string, string> = {
  mpesa_till: 'M-Pesa Till (Buy Goods)', mpesa_paybill: 'M-Pesa Paybill', mpesa_send_money: 'M-Pesa Send Money', bank: 'Bank transfer', other: 'Other',
};

export function PaymentAccountsList({ accounts }: { accounts: CustomerPaymentAccount[] }) {
  if (!accounts.length) return null;
  // The same thank-you / "send us your confirmation" text is usually saved on every account; show each distinct note once.
  const notes = Array.from(new Set(accounts.map((a) => (a.instructions ?? '').trim()).filter(Boolean)));
  return (
    <div className="space-y-4">
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]">
      {accounts.map((a, i) => {
        const Icon = a.kind === 'bank' ? Landmark : Smartphone;
        return (
          <div key={a.id ?? i} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
            <div className="mb-1 flex items-center gap-2 border-b border-slate-100 pb-2 font-semibold text-[#0C2D57]"><Icon className="h-4 w-4 shrink-0 text-primary" />{KIND_TITLES[a.kind] ?? a.label}</div>
            {a.kind === 'bank' && <>
              {a.bank_name && <CopyValue label="Bank" value={a.bank_name} />}
              {a.account_name && <CopyValue label="Account name" value={a.account_name} />}
              {a.account_number && <CopyValue label="Account number" value={a.account_number} />}
              {a.branch && <CopyValue label="Branch" value={a.branch} />}
              {a.swift_code && <CopyValue label="SWIFT / BIC" value={a.swift_code} />}
            </>}
            {a.kind === 'mpesa_paybill' && <>
              {a.paybill_number && <CopyValue label="Paybill number" value={a.paybill_number} />}
              {a.account_number && <CopyValue label="Account number" value={a.account_number} />}
            </>}
            {a.kind === 'mpesa_till' && a.till_number && <CopyValue label="Till number" value={a.till_number} />}
            {a.kind === 'mpesa_send_money' && <>
              {a.phone_number && <CopyValue label="Phone number" value={a.phone_number} />}
              {a.account_name && <CopyValue label="Registered name" value={a.account_name} />}
            </>}
            {a.kind === 'other' && a.account_name && <CopyValue label="Name" value={a.account_name} />}
          </div>
        );
      })}
    </div>
    {notes.length > 0 && <details className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-muted-foreground">
      <summary className="cursor-pointer text-sm font-medium text-foreground">Payment notes</summary>
      <div className="mt-2 space-y-3">{notes.map((n, i) => <p key={i} className="whitespace-pre-line">{n}</p>)}</div>
    </details>}
    </div>
  );
}
