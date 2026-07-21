import {
  FormEvent,
  useEffect,
  useState,
} from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
} from 'lucide-react';
import {
  getInvoiceSecurityStatus,
  setInvoicePassword,
} from '../../services/invoiceService';
import { InvoiceSecurityStatus } from '../../types/invoice';

export default function InvoiceSecurityPage() {
  const [status, setStatus] =
    useState<InvoiceSecurityStatus | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadStatus = async () => {
    setLoading(true);

    try {
      setStatus(await getInvoiceSecurityStatus());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to load password status.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!password) {
      setError('Enter the invoice alteration password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirmation do not match.');
      return;
    }

    setSaving(true);

    try {
      const response = await setInvoicePassword(
        password,
        confirmPassword
      );

      setStatus({
        hasPassword: response.hasPassword,
        updatedBy: response.updatedBy,
        updatedAt: response.updatedAt,
      });

      setPassword('');
      setConfirmPassword('');
      setSuccess(response.message);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to save the password.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-violet-600" />
          <h1 className="text-xl font-black text-slate-900">
            Invoice Security
          </h1>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Set the password Admin and SuperAdmin users must enter before editing or deleting a Tax Invoice.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              status?.hasPassword
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : status?.hasPassword ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <KeyRound className="h-5 w-5" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-black text-slate-900">
              {loading
                ? 'Checking password status...'
                : status?.hasPassword
                  ? 'Invoice alteration password is active'
                  : 'No invoice alteration password has been set'}
            </h2>

            {!loading && status?.hasPassword && (
              <p className="mt-1 text-xs text-slate-500">
                Last updated by{' '}
                <b>{status.updatedBy || 'SuperAdmin'}</b>
                {status.updatedAt
                  ? ` on ${new Date(
                      status.updatedAt
                    ).toLocaleString('en-GB')}`
                  : ''}
              </p>
            )}
          </div>
        </div>
      </section>

      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-5">
          <h2 className="text-sm font-black text-slate-900">
            Set Invoice Password
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Saving a new value immediately replaces the previous invoice password. The password itself is never displayed or returned by the system.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="New Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setError('');
            }}
            visible={showPassword}
            onToggle={() =>
              setShowPassword((current) => !current)
            }
          />

          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              setError('');
            }}
            visible={showPassword}
            onToggle={() =>
              setShowPassword((current) => !current)
            }
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <div className="relative mt-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          autoComplete="new-password"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-11 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </label>
  );
}