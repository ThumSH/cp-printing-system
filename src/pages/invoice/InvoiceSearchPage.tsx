import {
  FormEvent,
  useEffect,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Loader2,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  getInvoiceFilterOptions,
  searchInvoices,
} from '../../services/invoiceService';
import {
  TaxInvoiceFilterOptions,
  TaxInvoiceSearchFilters,
  TaxInvoiceSearchResponse,
} from '../../types/invoice';

const emptyFilters: TaxInvoiceSearchFilters = {
  invoiceNumber: '',
  supplierName: '',
  purchaserName: '',
  dateFrom: '',
  dateTo: '',
};

const emptyOptions: TaxInvoiceFilterOptions = {
  invoiceNumbers: [],
  supplierNames: [],
  purchaserNames: [],
};

export default function InvoiceSearchPage() {
  const [filters, setFilters] =
    useState<TaxInvoiceSearchFilters>({ ...emptyFilters });
  const [appliedFilters, setAppliedFilters] =
    useState<TaxInvoiceSearchFilters>({ ...emptyFilters });
  const [filterOptions, setFilterOptions] =
    useState<TaxInvoiceFilterOptions>({ ...emptyOptions });
  const [result, setResult] =
    useState<TaxInvoiceSearchResponse>({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
    });

  const [page, setPage] = useState(1);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        setFilterOptions(await getInvoiceFilterOptions());
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Failed to load search dropdowns.'
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    void loadOptions();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        setResult(
          await searchInvoices(appliedFilters, page, 25)
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Failed to search invoices.'
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [appliedFilters, page]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      filters.dateFrom &&
      filters.dateTo &&
      filters.dateFrom > filters.dateTo
    ) {
      setError('Date From cannot be later than Date To.');
      return;
    }

    setError('');
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const reset = () => {
    const cleared = { ...emptyFilters };
    setFilters(cleared);
    setPage(1);
    setAppliedFilters(cleared);
    setError('');
  };

  const updateFilter = (
    field: keyof TaxInvoiceSearchFilters,
    value: string
  ) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900">
              Invoice Search
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Select saved invoice details and an optional date range.
          </p>
        </div>

        <Link
          to="/invoice"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoice
        </Link>
      </div>

      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label="Invoice No."
            value={filters.invoiceNumber}
            options={filterOptions.invoiceNumbers}
            placeholder="All invoice numbers"
            disabled={loadingOptions}
            onChange={(value) => updateFilter('invoiceNumber', value)}
          />

          <FilterSelect
            label="Supplier"
            value={filters.supplierName}
            options={filterOptions.supplierNames}
            placeholder="All suppliers"
            disabled={loadingOptions}
            onChange={(value) => updateFilter('supplierName', value)}
          />

          <FilterSelect
            label="Purchaser"
            value={filters.purchaserName}
            options={filterOptions.purchaserNames}
            placeholder="All purchasers"
            disabled={loadingOptions}
            onChange={(value) => updateFilter('purchaserName', value)}
          />

          <FilterDate
            label="Date From"
            value={filters.dateFrom}
            onChange={(value) => updateFilter('dateFrom', value)}
          />

          <FilterDate
            label="Date To"
            value={filters.dateTo}
            onChange={(value) => updateFilter('dateTo', value)}
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>

          <button
            type="submit"
            disabled={loading || loadingOptions}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-black text-slate-800">
              Search Results
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {result.total} report{result.total === 1 ? '' : 's'} found
            </p>
          </div>

          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          )}
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {[
                  'Invoice No.',
                  'Invoice Date',
                  'Supplier',
                  'Purchaser',
                  'Total Including VAT',
                  'Created By',
                  '',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!loading &&
                result.items.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {invoice.invoiceDate || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {invoice.supplierName || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {invoice.purchaserName || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {invoice.totalAmountIncludingVat || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {invoice.createdBy || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/invoice/${invoice.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && result.items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    No matching Tax Invoice reports were found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    Searching invoices...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-500">
            Page {result.page || page} of {Math.max(1, result.totalPages)}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={
                loading ||
                result.totalPages === 0 ||
                page >= result.totalPages
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-wait disabled:bg-slate-50"
      >
        <option value="">
          {disabled ? 'Loading...' : placeholder}
        </option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      />
    </label>
  );
}