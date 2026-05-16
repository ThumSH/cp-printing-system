// src/pages/development/DevelopmentSubmission.tsx
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, AlertCircle, CheckCircle2, Clock, History,
  FlaskConical, Loader2, Image as ImageIcon,
} from 'lucide-react';
import { useSampleStyleStore, SampleStyle } from '../../store/sampleStyleStore';
import { API } from '../../api/client';

const EMPTY_FORM = {
  rcMeetingDate: '',
  acNumber: '',
  boardSet: '',
  bulkQty: '',
};

function AdminStatusBadge({ status }: { status: string }) {
  if (status === 'Approved') return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Admin Approved
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Clock className="h-3 w-3" /> Awaiting Admin
    </span>
  );
}

export default function DevelopmentSubmission() {
  const { styles, loading, fetchStyles, submitToAdmin } = useSampleStyleStore();
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState('');

  useEffect(() => { fetchStyles(); }, [fetchStyles]);

  // Only show client-approved, not yet submitted styles for selection
  const readyStyles = useMemo(() =>
    styles.filter((s) => s.clientApproved && !s.submittedToAdmin),
    [styles]
  );

  // Submitted history
  const submittedStyles = useMemo(() =>
    styles.filter((s) => s.submittedToAdmin).sort((a, b) =>
      (b.submittedAt || '').localeCompare(a.submittedAt || '')
    ),
    [styles]
  );

  const selected = useMemo(() =>
    styles.find((s) => s.id === selectedId) || null,
    [styles, selectedId]
  );

  const handleSelect = (s: SampleStyle) => {
    setSelectedId(s.id);
    setForm(EMPTY_FORM);
    setErrors({});
    setSuccessId('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedId) e.selected = 'Select a style to submit.';
    if (!form.rcMeetingDate) e.rcMeetingDate = 'RC Meeting Date is required.';
    if (!form.bulkQty.trim() || isNaN(Number(form.bulkQty))) e.bulkQty = 'Valid Bulk Qty is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selected) return;
    setSubmitting(true);
    try {
      await submitToAdmin(selected.id, {
        rcMeetingDate: form.rcMeetingDate,
        acNumber: form.acNumber || undefined,
        boardSet: form.boardSet || undefined,
        bulkQty: form.bulkQty,
      });
      setSuccessId(selected.id);
      setSelectedId('');
      setForm(EMPTY_FORM);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Loading styles…</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Submit for Admin Approval</h1>
        <p className="mt-1 text-sm text-slate-500">
          Only client-approved styles appear here. Fill in the submission details and send to admin.
        </p>
      </div>

      {readyStyles.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertCircle className="h-5 w-5" /> No styles ready for submission
          </div>
          <p className="mt-2 text-sm text-amber-700">
            Go to <strong>Sample Styles</strong> and mark a style as Client Approved first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Left — style picker */}
          <div className="xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">Client-Approved Styles</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {readyStyles.length} ready
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {readyStyles.map((s) => {
                  const imgUrl = s.imagePath ? `${API.BASE}${s.imagePath}` : null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelect(s)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedId === s.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {imgUrl ? (
                          <img src={imgUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{s.styleNo}</p>
                          <p className="text-xs text-slate-500 truncate">{s.customer}</p>
                          <p className="text-xs text-slate-400 truncate">{s.bodyColour}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right — submission form */}
          <div className="xl:col-span-8">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
                >
                  {/* Selected style summary */}
                  <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                    {selected.imagePath ? (
                      <img src={`${API.BASE}${selected.imagePath}`} alt=""
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-7 h-7 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{selected.styleNo}</h3>
                      <p className="text-sm text-slate-500">{selected.customer} · {selected.season}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">{selected.bodyColour}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">{selected.printingTechnique}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">{selected.printColour}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h4 className="text-sm font-semibold text-slate-800">Submission Details</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          RC Meeting Date <span className="text-red-500">*</span>
                        </label>
                        <input type="date" value={form.rcMeetingDate}
                          onChange={(e) => { setForm((p) => ({ ...p, rcMeetingDate: e.target.value })); setErrors((p) => ({ ...p, rcMeetingDate: '' })); }}
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${errors.rcMeetingDate ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                        />
                        {errors.rcMeetingDate && <p className="mt-1 text-xs text-red-600">{errors.rcMeetingDate}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">AC Number</label>
                        <input type="text" value={form.acNumber} placeholder="e.g. AC-993"
                          onChange={(e) => setForm((p) => ({ ...p, acNumber: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Board Set</label>
                        <input type="text" value={form.boardSet} placeholder="e.g. BS-102"
                          onChange={(e) => setForm((p) => ({ ...p, boardSet: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bulk Qty <span className="text-red-500">*</span>
                        </label>
                        <input type="number" value={form.bulkQty} placeholder="e.g. 5000" min="1"
                          onChange={(e) => { setForm((p) => ({ ...p, bulkQty: e.target.value })); setErrors((p) => ({ ...p, bulkQty: '' })); }}
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${errors.bulkQty ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                        />
                        {errors.bulkQty && <p className="mt-1 text-xs text-red-600">{errors.bulkQty}</p>}
                      </div>
                    </div>

                    {errors.submit && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {errors.submit}
                      </div>
                    )}

                    {successId && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" /> Submitted successfully to admin.
                      </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button type="submit" disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {submitting ? 'Submitting…' : 'Submit to Admin'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm"
                >
                  <FlaskConical className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-slate-500 font-medium">Select a style from the left to fill submission details</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Submission history */}
      {submittedStyles.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
            <History className="h-5 w-5 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Submission History</h2>
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {submittedStyles.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Style / Customer</th>
                  <th className="px-5 py-3 font-semibold">Body Colour</th>
                  <th className="px-5 py-3 font-semibold">RC Meeting</th>
                  <th className="px-5 py-3 font-semibold">Bulk Qty</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold">Admin Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submittedStyles.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{s.styleNo}</p>
                      <p className="text-xs text-slate-500">{s.customer}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{s.bodyColour || '—'}</td>
                    <td className="px-5 py-3 text-slate-700">{s.rcMeetingDate || '—'}</td>
                    <td className="px-5 py-3 text-slate-700">{s.bulkQty || '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{s.submittedAt || '—'}</td>
                    <td className="px-5 py-3"><AdminStatusBadge status={s.adminStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}