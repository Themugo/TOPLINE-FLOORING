import { useEffect, useState } from 'react';
import { CreditCard, Landmark, Smartphone, ShieldCheck } from 'lucide-react';
import { getCustomerPaymentMethods, type CustomerPaymentContext, type CustomerPaymentGateway } from '@/lib/payment-gateways';

const icons = { 'mobile-money': Smartphone, card: CreditCard, bank: Landmark } as const;

export function CustomerPaymentMethods({ context, value, onChange, onGatewayChange }: { context: CustomerPaymentContext; value: string | null; onChange: (method: 'mpesa'|'card'|'bank_transfer') => void; onGatewayChange?: (gatewayKey: string) => void }) {
  const [methods, setMethods] = useState<CustomerPaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { let active = true; setLoading(true); setError(''); getCustomerPaymentMethods(context).then(rows => { if (!active) return; setMethods(rows); if (!value && rows[0]) { onChange(rows[0].payment_method); onGatewayChange?.(rows[0].gateway_key); } }).catch(() => { if (active) setError('Payment options are temporarily unavailable. Please try again.'); }).finally(() => active && setLoading(false)); return () => { active = false; }; }, [context]);

  if (loading) return <div className="rounded-xl border p-4 text-sm text-muted-foreground">Loading secure payment options…</div>;
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>;
  if (!methods.length) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Online payment is not currently available. Please contact Topline for payment instructions.</div>;

  return <div className="space-y-3"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4"/> Secure payment options</div>{methods.map(method => { const Icon = icons[method.icon_key as keyof typeof icons] || CreditCard; return <label key={method.gateway_key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${value === method.payment_method ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}><input type="radio" name={`payment-${context}`} className="mt-1" checked={value === method.payment_method} onChange={() => onChange(method.payment_method)}/><Icon className="mt-0.5 h-5 w-5"/><span><span className="block font-medium">{method.display_name}</span>{method.customer_description && <span className="block text-xs text-muted-foreground mt-1">{method.customer_description}</span>}</span></label>; })}</div>;
}
