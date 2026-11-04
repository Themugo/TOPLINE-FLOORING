import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface TaxSettings {
  enabled: boolean;
  label: string;
  rate: number;
  tax_pin: string;
  show_pin_on_documents: boolean;
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  label: 'VAT',
  rate: 16,
  tax_pin: '',
  show_pin_on_documents: true,
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function normalizeTaxSettings(raw: unknown): TaxSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<TaxSettings>;
  const rate = Number(v.rate);
  return {
    enabled: v.enabled !== false,
    label: typeof v.label === 'string' && v.label.trim() ? v.label.trim().slice(0, 20) : DEFAULT_TAX_SETTINGS.label,
    rate: Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : DEFAULT_TAX_SETTINGS.rate,
    tax_pin: typeof v.tax_pin === 'string' ? v.tax_pin.trim().slice(0, 30) : '',
    show_pin_on_documents: v.show_pin_on_documents !== false,
  };
}

export async function loadTaxSettings(): Promise<TaxSettings> {
  try {
    const { data } = await supabase.from('site_settings').select('setting_value').eq('setting_key', 'tax_settings').maybeSingle();
    return normalizeTaxSettings(data?.setting_value);
  } catch {
    return DEFAULT_TAX_SETTINGS;
  }
}

export function useTaxSettings(): TaxSettings {
  const [tax, setTax] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  useEffect(() => {
    let live = true;
    loadTaxSettings().then((t) => { if (live) setTax(t); });
    return () => { live = false; };
  }, []);
  return tax;
}

/** Shop prices already include tax: split a gross total into net + tax (total never changes). */
export function taxIncludedIn(gross: number, tax: TaxSettings) {
  if (!tax.enabled || tax.rate <= 0) return { net: round2(gross), tax: 0 };
  const t = round2((gross * tax.rate) / (100 + tax.rate));
  return { net: round2(gross - t), tax: t };
}

/** Invoices / quotations add tax on top of the net subtotal. */
export function taxAdded(net: number, ratePercent: number) {
  const t = round2((net * ratePercent) / 100);
  return { tax: t, total: round2(net + t) };
}

export const formatRate = (rate: number) => `${Number(rate.toFixed(2))}%`;
