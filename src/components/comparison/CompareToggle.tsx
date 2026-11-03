import { Scale, Check } from 'lucide-react';
import { useProductComparison, MAX_COMPARE_PRODUCTS } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';

/** Adds or removes a material from the side-by-side comparison (max four). */
export function CompareToggle({ productId, productName, className = '' }: { productId: string; productName: string; className?: string }) {
  const { isInComparison, toggleComparison } = useProductComparison();
  const { toast } = useToast();
  const active = isInComparison(productId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${productName} from comparison` : `Compare ${productName}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (toggleComparison(productId) === 'full') toast({ title: 'Comparison is full', description: `You can compare up to ${MAX_COMPARE_PRODUCTS} materials at a time. Remove one to add another.` });
      }}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] ${active ? 'border-[#0E6B78] bg-[#0E6B78]/10 text-[#0E6B78]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'} ${className}`}
    >
      {active ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Scale className="h-3.5 w-3.5" aria-hidden="true" />}
      {active ? 'Comparing' : 'Compare'}
    </button>
  );
}
