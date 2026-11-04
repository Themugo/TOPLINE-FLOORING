import { formatKES } from '@/lib/utils';
import type { BreakdownRow } from '@/lib/order-breakdown';

/** Aligned accounting table used on carts, receipts and invoices. */
export function MoneyBreakdown({ rows, className = '' }: { rows: BreakdownRow[]; className?: string }) {
  return (
    <table className={`w-full text-sm tabular-nums ${className}`}>
      <tbody>
        {rows.map((r, i) => {
          const total = r.tone === 'total';
          return (
            <tr key={`${r.label}-${i}`} className={total ? 'border-t border-gray-300 font-bold text-base text-[#0C2D57]' : r.tone === 'strong' ? 'font-semibold' : r.tone === 'muted' ? 'text-gray-500 text-xs' : r.tone === 'minus' ? 'text-green-700' : 'text-gray-700'}>
              <td className={`py-1 pr-3 ${total ? 'pt-2' : ''}`}>
                {r.label}
                {r.note && <span className="block text-[11px] font-normal text-gray-400">{r.note}</span>}
              </td>
              <td className={`py-1 text-right whitespace-nowrap ${total ? 'pt-2' : ''}`}>
                {r.tone === 'minus' ? '-' : ''}{formatKES(r.amount)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
