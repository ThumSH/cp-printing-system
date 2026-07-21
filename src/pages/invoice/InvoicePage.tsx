import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileSearch,
  Loader2,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import InvoiceForm from '../../components/invoice/InvoiceForm';
import {
  createInvoice,
  getRecentInvoices,
} from '../../services/invoiceService';
import {
  TaxInvoicePayload,
  TaxInvoiceSummary,
  createBlankInvoice,
} from '../../types/invoice';

export default function InvoicePage() {
  const [form, setForm] =
    useState<TaxInvoicePayload>(
      createBlankInvoice(8)
    );

  const [recentInvoices, setRecentInvoices] =
    useState<TaxInvoiceSummary[]>([]);

  const [loadingRecent, setLoadingRecent] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRecent = async () => {
    setLoadingRecent(true);

    try {
      setRecentInvoices(await getRecentInvoices());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to load recent invoices.'
      );
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    void loadRecent();
  }, []);

  const submit = async () => {
    setError('');
    setSuccess('');

    if (!form.invoiceNumber.trim()) {
      setError('Tax Invoice No. is required.');
      return;
    }

    if (!form.invoiceDate.trim()) {
      setError('Date of Invoice is required.');
      return;
    }

    if (!form.deliveryDate.trim()) {
      setError('Date of Delivery is required.');
      return;
    }

    setSaving(true);

    try {
      const saved = await createInvoice(form);

      setSuccess(
        `Tax Invoice ${saved.invoiceNumber} was saved successfully.`
      );

      setForm(createBlankInvoice(8));
      await loadRecent();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to save the Tax Invoice.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900">
              Tax Invoice
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Create and save a fully manual Tax Invoice report.
          </p>
        </div>

        <Link
          to="/invoice/search"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <FileSearch className="h-4 w-4" />
          Invoice Search
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <InvoiceForm
        value={form}
        onChange={setForm}
        onSubmit={submit}
        submitting={saving}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-black text-slate-800">
              Recent 10 Tax Invoices
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Older reports are available through Invoice Search.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRecent()}
            disabled={loadingRecent}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loadingRecent ? 'animate-spin' : ''
              }`}
            />
          </button>
        </header>

        {loadingRecent ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading recent invoices...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {[
                    'Invoice No.',
                    'Date',
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
                {recentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-slate-50"
                  >
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
                      {invoice.totalAmountIncludingVat ||
                        '—'}
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

                {recentInvoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      No Tax Invoice reports have been saved yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}