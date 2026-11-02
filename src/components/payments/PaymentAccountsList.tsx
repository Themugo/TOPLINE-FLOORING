import { useState } from 'react';
import { Check, Copy, Landmark, Smartphone } from 'lucide-react';
import type { CustomerPaymentAccount } from '@/lib/payment-accounts';

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-sm font-medium text-right break-all">
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

export function PaymentAccountsList({ accounts }: { accounts: CustomerPaymentAccount[] }) {
  if (!accounts.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {accounts.map((a, i) => {
        const Icon = a.kind === 'bank' ? Landmark : Smartphone;
        return (
          <div key={a.id ?? i} className="rounded-xl border border-slate-200 bg-white p-4 text-left">
            <div className="mb-2 flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{a.label}</div>
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
            {a.reference_hint && <p className="mt-2 text-xs"><strong>Reference:</strong> {a.reference_hint}</p>}
            {a.instructions && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">{a.instructions}</p>}
          </div>
        );
      })}
    </div>
  );
}
