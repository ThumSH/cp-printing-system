// src/hooks/usePaginatedSearch.ts
import { useState, useMemo } from 'react';

interface UsePaginatedSearchOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  pageSize?: number;
}

export function usePaginatedSearch<T>({ data, searchFields, pageSize = 25 }: UsePaginatedSearchOptions<T>) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase().trim();
    return data.filter((item) =>
      searchFields.some((field) => {
        const val = item[field];
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return {
    search,
    setSearch: handleSearch,
    currentPage: safePage,
    totalPages,
    totalFiltered: filtered.length,
    totalAll: data.length,
    paginated,
    goToPage,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}