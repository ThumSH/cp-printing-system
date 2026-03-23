// src/components/PaginatedTable.tsx
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  currentPage: number;
  totalPages: number;
  totalFiltered: number;
  totalAll: number;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
  placeholder?: string;
}

export function PaginationControls({
  search,
  onSearchChange,
  currentPage,
  totalPages,
  totalFiltered,
  totalAll,
  onPageChange,
  hasNext,
  hasPrev,
  placeholder = 'Search by style, customer, schedule...',
}: PaginationControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Info + navigation */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          {totalFiltered === totalAll
            ? `${totalAll} record(s)`
            : `${totalFiltered} of ${totalAll} record(s)`}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(1)} disabled={!hasPrev}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button onClick={() => onPageChange(currentPage - 1)} disabled={!hasPrev}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={!hasNext}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => onPageChange(totalPages)} disabled={!hasNext}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}