import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, limit, totalPages, onPageChange }: PaginationProps) {
  if (total === 0) return null;

  const start = page * limit + 1;
  const end = Math.min((page + 1) * limit, total);

  const pageNumbers: number[] = [];
  const maxVisible = 5;
  let startPage = Math.max(0, page - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible);
  startPage = Math.max(0, endPage - maxVisible);

  for (let i = startPage; i < endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
      <span className="text-sm text-gray-600">
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pageNumbers.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 text-sm rounded-md ${
              p === page ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            {p + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
