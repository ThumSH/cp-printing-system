import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Loader2,
  Printer,
  Trash2,
} from 'lucide-react';
import InvoiceDocument from '../../components/invoice/InvoiceDocument';
import InvoiceForm from '../../components/invoice/InvoiceForm';
import PasswordModal from '../../components/invoice/PasswordModal';
import {
  deleteInvoice,
  getInvoice,
  updateInvoice,
  verifyInvoicePassword,
} from '../../services/invoiceService';
import {
  TaxInvoice,
  TaxInvoicePayload,
  toInvoicePayload,
} from '../../types/invoice';

type PasswordAction = 'edit' | 'delete' | null;

export default function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] =
    useState<TaxInvoice | null>(null);

  const [draft, setDraft] =
    useState<TaxInvoicePayload | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPassword, setEditPassword] =
    useState('');

  const [passwordAction, setPasswordAction] =
    useState<PasswordAction>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      const loaded = await getInvoice(id);
      setInvoice(loaded);
      setDraft(toInvoicePayload(loaded));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to load the Tax Invoice.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const confirmPassword = async (
    password: string
  ) => {
    if (passwordAction === 'edit') {
      await verifyInvoicePassword(password);
      setEditPassword(password);
      setEditing(true);
      setPasswordAction(null);
      return;
    }

    if (passwordAction === 'delete') {
      await deleteInvoice(id, password);
      setPasswordAction(null);
      navigate('/invoice', { replace: true });
    }
  };

  const saveUpdate = async () => {
    if (!draft || !invoice) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateInvoice(
        invoice.id,
        draft,
        editPassword
      );

      setInvoice(updated);
      setDraft(toInvoicePayload(updated));
      setEditing(false);
      setEditPassword('');
      setSuccess(
        `Tax Invoice ${updated.invoiceNumber} was updated successfully.`
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to update the Tax Invoice.'
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    if (invoice) {
      setDraft(toInvoicePayload(invoice));
    }

    setEditing(false);
    setEditPassword('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-sm text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading Tax Invoice...
      </div>
    );
  }

  if (!invoice || !draft) {
    return (
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-bold text-red-800">
          The Tax Invoice could not be opened.
        </p>
        <p className="text-sm text-red-600">
          {error || 'Report not found.'}
        </p>
        <Link
          to="/invoice/search"
          className="inline-flex items-center gap-2 text-sm font-bold text-red-700 underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Invoice Search
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <Link
            to="/invoice/search"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Invoice Search
          </Link>

          <h1 className="mt-2 text-xl font-black text-slate-900">
            Tax Invoice {invoice.invoiceNumber}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View, print, or unlock this report for alteration.
          </p>
        </div>

        {!editing && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>

            <button
              type="button"
              onClick={() =>
                setPasswordAction('edit')
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>

            <button
              type="button"
              onClick={() =>
                setPasswordAction('delete')
              }
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="print:hidden rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="print:hidden rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      {editing ? (
        <InvoiceForm
          value={draft}
          onChange={setDraft}
          onSubmit={saveUpdate}
          submitting={saving}
          submitLabel="Update Tax Invoice"
          onCancel={cancelEditing}
        />
      ) : (
        <InvoiceDocument invoice={invoice} />
      )}

      <PasswordModal
        open={passwordAction === 'edit'}
        title="Unlock Tax Invoice"
        description="Enter the password configured by the SuperAdmin to edit this report."
        confirmLabel="Unlock Edit"
        onClose={() => setPasswordAction(null)}
        onConfirm={confirmPassword}
      />

      <PasswordModal
        open={passwordAction === 'delete'}
        title="Delete Tax Invoice"
        description="This permanently deletes the report and all of its item rows. Enter the invoice password to continue."
        confirmLabel="Delete Report"
        danger
        onClose={() => setPasswordAction(null)}
        onConfirm={confirmPassword}
      />
    </div>
  );
}