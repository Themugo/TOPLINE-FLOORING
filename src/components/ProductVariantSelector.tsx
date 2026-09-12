import type { ProductVariant } from '@/lib/types';

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  value?: string;
  onChange: (variantId: string) => void;
  compact?: boolean;
}

export function ProductVariantSelector({ variants, value, onChange, compact = false }: ProductVariantSelectorProps) {
  if (variants.length === 0) return null;
  return (
    <label className={compact ? 'block' : 'block mt-3'}>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
        Choose option
      </span>
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {variants.map((variant) => (
          <option key={variant.id} value={variant.id} disabled={variant.stock_quantity <= 0}>
            {variant.variant_name} — {variant.stock_quantity > 0 ? `${variant.stock_quantity} available` : 'Out of stock'}
          </option>
        ))}
      </select>
    </label>
  );
}
