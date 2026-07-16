import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = initialLimit;

  const totalPages = Math.ceil(total / limit);
  const from = page * limit;
  const to = from + limit - 1;

  const nextPage = useCallback(() => setPage((p) => Math.min(p + 1, totalPages - 1)), [totalPages]);
  const prevPage = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);
  const goToPage = useCallback((p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1))), [totalPages]);
  const reset = useCallback(() => { setPage(0); setTotal(0); }, []);

  return { page, setPage, limit, total, totalPages, from, to, nextPage, prevPage, goToPage, setTotal, reset };
}
