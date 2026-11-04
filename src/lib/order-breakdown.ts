import { taxIncludedIn, formatRate, type TaxSettings } from '@/lib/tax';

export interface BreakdownRow {
  label: string;
  amount: number;
  tone?: 'default' | 'minus' | 'muted' | 'total' | 'strong';
  note?: string;
}

/** Rows for a VAT-inclusive shop order. The total is untouched; tax is shown as contained in it. */
export function orderBreakdownRows(
  o: { subtotal: number; deliveryCharge: number; discountAmount: number; total: number },
  tax: TaxSettings,
): BreakdownRow[] {
  const rows: BreakdownRow[] = [{ label: 'Items subtotal', amount: o.subtotal }];
  if (o.discountAmount > 0) rows.push({ label: 'Discount', amount: o.discountAmount, tone: 'minus' });
  if (o.deliveryCharge > 0) rows.push({ label: 'Delivery', amount: o.deliveryCharge });
  rows.push({ label: 'Total to pay', amount: o.total, tone: 'total' });
  if (tax.enabled && tax.rate > 0) {
    const t = taxIncludedIn(o.total, tax);
    rows.push({ label: `Amount before ${tax.label}`, amount: t.net, tone: 'muted' });
    rows.push({ label: `${tax.label} (${formatRate(tax.rate)}) included in total`, amount: t.tax, tone: 'muted' });
  }
  return rows;
}
