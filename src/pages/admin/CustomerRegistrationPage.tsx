import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  CheckCircle2,
  Loader2,
  PencilLine,
  RefreshCw,
  UserRoundPlus,
  X,
} from 'lucide-react';

import {
  createCustomer,
  getCustomers,
  updateCustomer,
} from '../../services/customerService';

import {
  Customer,
  CustomerPayload,
  createBlankCustomer,
} from '../../types/customer';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';

const labelClass =
  'text-[10px] font-bold uppercase tracking-wider text-slate-500';

const normalisePayload = (
  form: CustomerPayload
): CustomerPayload => ({
  customerName:
    form.customerName.trim(),

  customerCode:
    form.customerCode
      .trim()
      .toUpperCase(),

  address:
    form.address.trim(),

  tinNumber:
    form.tinNumber.trim(),

  telephoneNumber:
    form.telephoneNumber.trim(),

  email:
    form.email.trim(),
});

export default function CustomerRegistrationPage() {
  const [form, setForm] =
    useState<CustomerPayload>(
      createBlankCustomer()
    );

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [editingCustomerId, setEditingCustomerId] =
    useState<string | null>(null);

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [reviewOpen, setReviewOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const isEditing =
    editingCustomerId !== null;

  const loadCustomers = async () => {
    setLoadingCustomers(true);

    try {
      setCustomers(await getCustomers());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to load registered customers.'
      );
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const updateField = (
    field: keyof CustomerPayload,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = (): string | null => {
    if (!form.customerName.trim()) {
      return 'Customer name is required.';
    }

    if (!form.customerCode.trim()) {
      return 'Customer code is required.';
    }

    if (!form.address.trim()) {
      return 'Customer address is required.';
    }

    if (!form.tinNumber.trim()) {
      return 'TIN number is required.';
    }

    if (!form.telephoneNumber.trim()) {
      return 'Telephone number is required.';
    }

    return null;
  };

  const openReview = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setReviewOpen(true);
  };

  const resetForm = () => {
    setForm(createBlankCustomer());
    setEditingCustomerId(null);
    setReviewOpen(false);
    setError('');
  };

  const startEditing = (
    customer: Customer
  ) => {
    setForm({
      customerName:
        customer.customerName,

      customerCode:
        customer.customerCode,

      address:
        customer.address,

      tinNumber:
        customer.tinNumber,

      telephoneNumber:
        customer.telephoneNumber,

      email:
        customer.email,
    });

    setEditingCustomerId(customer.id);
    setReviewOpen(false);
    setError('');
    setSuccess('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const confirmSave = async () => {
    setSaving(true);
    setError('');

    try {
      const payload =
        normalisePayload(form);

      const saved =
        editingCustomerId
          ? await updateCustomer(
              editingCustomerId,
              payload
            )
          : await createCustomer(payload);

      setSuccess(
        editingCustomerId
          ? `${saved.customerCode} - ${saved.customerName} was updated successfully.`
          : `${saved.customerCode} - ${saved.customerName} was registered successfully.`
      );

      setForm(createBlankCustomer());
      setEditingCustomerId(null);
      setReviewOpen(false);

      await loadCustomers();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : isEditing
            ? 'Failed to update the customer.'
            : 'Failed to register the customer.'
      );

      setReviewOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <UserRoundPlus className="h-5 w-5 text-blue-600" />

          <h1 className="text-xl font-black text-slate-900">
            Customer Registration
          </h1>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Register and update customers used as
          purchasers in Tax Invoices.
        </p>
      </header>

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

      <form
        onSubmit={openReview}
        className="rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800">
              {isEditing
                ? 'Update Customer Details'
                : 'Customer Details'}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {isEditing
                ? 'Review the corrected details before updating the customer.'
                : 'Review the customer details before saving them.'}
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel Editing
            </button>
          )}
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label>
            <span className={labelClass}>
              Customer Name
            </span>

            <input
              required
              value={form.customerName}
              onChange={(event) =>
                updateField(
                  'customerName',
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Customer Code
            </span>

            <input
              required
              value={form.customerCode}
              onChange={(event) =>
                updateField(
                  'customerCode',
                  event.target.value.toUpperCase()
                )
              }
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              TIN Number
            </span>

            <input
              required
              type="text"
              value={form.tinNumber}
              onChange={(event) =>
                updateField(
                  'tinNumber',
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Telephone Number
            </span>

            <input
              required
              type="text"
              value={form.telephoneNumber}
              onChange={(event) =>
                updateField(
                  'telephoneNumber',
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>

          <label className="md:col-span-2">
            <span className={labelClass}>
              Email
            </span>

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                updateField(
                  'email',
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>

          <label className="md:col-span-2">
            <span className={labelClass}>
              Address
            </span>

            <textarea
              required
              rows={4}
              value={form.address}
              onChange={(event) =>
                updateField(
                  'address',
                  event.target.value
                )
              }
              className={`${inputClass} resize-y`}
            />
          </label>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />

            {isEditing
              ? 'Review Update'
              : 'Review Customer'}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-black text-slate-800">
              Registered Customers
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              {customers.length} customer
              {customers.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadCustomers()}
            disabled={loadingCustomers}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loadingCustomers
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-225 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {[
                  'Code',
                  'Customer',
                  'TIN',
                  'Telephone',
                  'Email',
                  '',
                ].map((heading, index) => (
                  <th
                    key={`${heading}-${index}`}
                    className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!loadingCustomers &&
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {customer.customerCode}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {customer.customerName}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {customer.tinNumber}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {customer.telephoneNumber}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {customer.email || '—'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          startEditing(customer)
                        }
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

              {loadingCustomers && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}

              {!loadingCustomers &&
                customers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      No customers have been registered.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>

      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-black text-slate-900">
                  {isEditing
                    ? 'Recheck Customer Update'
                    : 'Recheck Customer Details'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {isEditing
                    ? 'Confirm that the corrected details are accurate before updating.'
                    : 'Confirm that every detail is correct before saving.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <ReviewItem
                label="Customer Name"
                value={form.customerName}
              />

              <ReviewItem
                label="Customer Code"
                value={form.customerCode}
              />

              <ReviewItem
                label="TIN Number"
                value={form.tinNumber}
              />

              <ReviewItem
                label="Telephone"
                value={form.telephoneNumber}
              />

              <ReviewItem
                label="Email"
                value={form.email || '—'}
              />

              <div className="sm:col-span-2">
                <ReviewItem
                  label="Address"
                  value={form.address}
                />
              </div>
            </dl>

            <footer className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={() => void confirmSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {saving
                  ? isEditing
                    ? 'Updating...'
                    : 'Saving...'
                  : isEditing
                    ? 'Confirm & Update'
                    : 'Confirm & Save'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-800">
        {value}
      </dd>
    </div>
  );
}