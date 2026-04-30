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
  search, onSearchChange, currentPage, totalPages,
  totalFiltered, totalAll, onPageChange, hasNext, hasPrev,
  placeholder = 'Search...',
}: PaginationControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="font-medium">
          {totalFiltered === totalAll
            ? `${totalAll} record${totalAll !== 1 ? 's' : ''}`
            : `${totalFiltered} of ${totalAll}`}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
            <NavBtn onClick={() => onPageChange(1)} disabled={!hasPrev}><ChevronsLeft className="h-3.5 w-3.5" /></NavBtn>
            <NavBtn onClick={() => onPageChange(currentPage - 1)} disabled={!hasPrev}><ChevronLeft className="h-3.5 w-3.5" /></NavBtn>
            <span className="px-2.5 py-1 text-xs font-semibold text-slate-700 min-w-12 text-center">
              {currentPage}<span className="text-slate-400 font-normal"> / {totalPages}</span>
            </span>
            <NavBtn onClick={() => onPageChange(currentPage + 1)} disabled={!hasNext}><ChevronRight className="h-3.5 w-3.5" /></NavBtn>
            <NavBtn onClick={() => onPageChange(totalPages)} disabled={!hasNext}><ChevronsRight className="h-3.5 w-3.5" /></NavBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
    >
      {children}
    </button>
  );
}