import { FormEvent, useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  X,
} from 'lucide-react';

interface PasswordModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export default function PasswordModal({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  onClose,
  onConfirm,
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!password.trim()) {
      setError('Enter the invoice alteration password.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onConfirm(password);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Password verification failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                danger
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              <KeyRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-black text-slate-900">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Invoice Password
          </span>

          <div className="relative mt-1">
            <input
              autoFocus
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </label>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {submitting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}