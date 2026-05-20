// src/pages/development/DevelopmentSubmission.tsx
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, AlertCircle, CheckCircle2, Clock, History,
  FlaskConical, Loader2, Image as ImageIcon, MessageSquare,
  ZoomIn, X, Info,
} from 'lucide-react';
import { useSampleStyleStore, SampleStyle } from '../../store/sampleStyleStore';
import { API } from '../../api/client';

const EMPTY_FORM = {
  rcMeetingDate: '',
  acNumber: '',
  boardSet: '',
  bulkQty: '',
  developerComments: '',
};

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt="Sample artwork"
        className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── Clickable image with lightbox ─────────────────────────────────────────────
function StyleImage({ src, size = 'md' }: { src: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const [open, setOpen] = useState(false);
  const sizeClass = size === 'lg' ? 'w-36 h-36' : size === 'md' ? 'w-32 h-32' : 'w-14 h-14';

  if (!src) {
    return (
      <div className={`${sizeClass} rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0`}>
        <ImageIcon className="w-8 h-8 text-slate-300" />
      </div>
    );
  }

  return (
    <>
      <div
        className={`${sizeClass} rounded-xl border border-slate-200 shadow-sm shrink-0 relative group cursor-zoom-in overflow-hidden`}
        onClick={() => setOpen(true)}
      >
        <img src={src} alt="Sample" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </div>
      </div>
      {open && <Lightbox src={src} onClose={() => setOpen(false)} />}
    </>
  );
}

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
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Force fetch so adminStatus is always current
    fetchStyles(true);
    // Poll every 30s so status updates (admin approves) appear without manual refresh
    const interval = setInterval(() => fetchStyles(true), 30_000);
    return () => clearInterval(interval);
  }, []);

  const readyStyles = useMemo(() =>
    styles.filter((s) => s.clientApproved && !s.submittedToAdmin), [styles]);

  const submittedStyles = useMemo(() =>
    styles.filter((s) => s.submittedToAdmin)
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')),
    [styles]);

  const selected = useMemo(() =>
    styles.find((s) => s.id === selectedId) || null, [styles, selectedId]);

  const imgUrl = selected?.imagePath
    ? selected.imagePath.startsWith('http')
      ? selected.imagePath
      : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(selected.imagePath)}`
    : null;

  const handleSelect = (s: SampleStyle) => {
    setSelectedId(s.id);
    setForm(EMPTY_FORM);
    setErrors({});
    setSuccessMsg('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedId) e.selected = 'Select a style to submit.';
    if (!form.rcMeetingDate) e.rcMeetingDate = 'RC Meeting Date is required.';
    if (!form.bulkQty.trim() || isNaN(Number(form.bulkQty)) || Number(form.bulkQty) <= 0)
      e.bulkQty = 'Valid Bulk Qty is required (must be greater than 0).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selected) return;

    setSubmitting(true);
    setSuccessMsg('');
    setErrors({});

    try {
      await submitToAdmin(selected.id, {
        rcMeetingDate: form.rcMeetingDate,
        boardSet: form.boardSet || undefined,
        bulkQty: form.bulkQty,
        developerComments: form.developerComments || undefined,
      });
      setSuccessMsg(`Style "${selected.styleNo}" submitted successfully to admin.`);
      setSelectedId('');
      setForm(EMPTY_FORM);
    } catch (err) {
      // Show the actual backend error message so we know what went wrong
      const msg = err instanceof Error ? err.message : 'Submission failed — unknown error.';
      setErrors({ submit: msg });
    } finally {
      // ALWAYS clears — if this doesn't run, something is very wrong above
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

      {/* Global success banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                  const thumbUrl = s.imagePath
                    ? s.imagePath.startsWith('http')
                      ? s.imagePath
                      : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(s.imagePath)}`
                    : null;
                  return (
                    <button key={s.id} onClick={() => handleSelect(s)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedId === s.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt=""
                            className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
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
                <motion.div key={selected.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
                >
                  {/* Style summary — CLICKABLE IMAGE WITH LIGHTBOX */}
                  <div className="flex items-start gap-5 pb-5 border-b border-slate-100">
                    <StyleImage src={imgUrl} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900">{selected.styleNo}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{selected.customer} · {selected.season}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selected.bodyColour && (
                          <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">{selected.bodyColour}</span>
                        )}
                        {selected.printingTechnique && (
                          <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">{selected.printingTechnique}</span>
                        )}
                        {selected.printColour && (
                          <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">{selected.printColour}</span>
                        )}
                      </div>
                      {imgUrl && (
                        <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                          <ZoomIn className="h-3 w-3" /> Click image to zoom
                        </p>
                      )}
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
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                            errors.rcMeetingDate ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
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

                      {/* Bulk Qty — with important notice */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bulk Qty <span className="text-red-500">*</span>
                        </label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.bulkQty} placeholder="e.g. 5000"
                          onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setForm((p) => ({ ...p, bulkQty: v })); setErrors((p) => ({ ...p, bulkQty: '' })); }}
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                            errors.bulkQty ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
                        />
                        {errors.bulkQty && <p className="mt-1 text-xs text-red-600">{errors.bulkQty}</p>}
                      </div>
                    </div>

                    {/* Bulk Qty warning banner */}
                    {form.bulkQty && Number(form.bulkQty) > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
                        <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                          <span className="font-bold">Bulk Qty: {Number(form.bulkQty).toLocaleString()} pcs</span> — Once approved by admin, this quantity flows into Store-In, CPI, Production, Gatepass, and Audit as the total order quantity for this style. Make sure this is correct before submitting.
                        </p>
                      </div>
                    )}

                    {/* Developer Comments */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4 text-slate-400" />
                          Developer Comments
                        </span>
                      </label>
                      <textarea
                        value={form.developerComments}
                        rows={4}
                        placeholder="Describe what the admin should focus on, any changes, or special instructions…"
                        onChange={(e) => setForm((p) => ({ ...p, developerComments: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      />
                      <p className="mt-1 text-xs text-slate-400">Visible to admin on the approval page.</p>
                    </div>

                    {/* Backend error — shown prominently so we know what failed */}
                    {errors.submit && (
                      <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Submission failed</p>
                          <p className="mt-0.5">{errors.submit}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button type="submit" disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                        {submitting
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                          : <><Send className="h-4 w-4" /> Submit to Admin</>
                        }
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                  <th className="px-5 py-3 font-semibold">Image</th>
                  <th className="px-5 py-3 font-semibold">Style / Customer</th>
                  <th className="px-5 py-3 font-semibold">Body Colour</th>
                  <th className="px-5 py-3 font-semibold">RC Meeting</th>
                  <th className="px-5 py-3 font-semibold">Bulk Qty</th>
                  <th className="px-5 py-3 font-semibold">Comments</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold">Admin Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submittedStyles.map((s) => {
                  const thumbUrl = s.imagePath
                    ? s.imagePath.startsWith('http')
                      ? s.imagePath
                      : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(s.imagePath)}`
                    : null;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <StyleImage src={thumbUrl} size="sm" />
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">{s.styleNo}</p>
                        <p className="text-xs text-slate-500">{s.customer}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{s.bodyColour || '—'}</td>
                      <td className="px-5 py-3 text-slate-700">{s.rcMeetingDate || '—'}</td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-900">
                          {s.bulkQty ? Number(s.bulkQty).toLocaleString() : '—'}
                        </span>
                        {s.bulkQty && <span className="text-xs text-slate-400 ml-1">pcs</span>}
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <p className="text-slate-600 text-xs line-clamp-2 whitespace-normal">
                          {s.developerComments || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{s.submittedAt?.slice(0, 10) || '—'}</td>
                      <td className="px-5 py-3"><AdminStatusBadge status={s.adminStatus} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}