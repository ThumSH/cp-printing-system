// src/pages/admin/ApproveSubmission.tsx
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Search, CheckCircle2, Clock,
  Image as ImageIcon, Loader2, User2, Palette,
  CalendarDays, Layers3, Shirt, RefreshCw,
} from 'lucide-react';
import { useSampleStyleStore, SampleStyle } from '../../store/sampleStyleStore';
import { API } from '../../api/client';

// ── helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'Approved') return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Approved
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function InfoCard({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-slate-900">{value || '—'}</p>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ApproveSubmission() {
  const { styles, loading, refreshing, fetchStyles, adminAction } = useSampleStyleStore();

  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchStyle, setSearchStyle] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState<'Approved' | 'Pending'>('Pending');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => { fetchStyles(); }, [fetchStyles]);

  // Only show submitted-to-admin styles
  const submittedStyles = useMemo(() =>
    styles.filter((s) => s.submittedToAdmin),
    [styles]
  );

  const filtered = useMemo(() => {
    const c = searchCustomer.trim().toLowerCase();
    const st = searchStyle.trim().toLowerCase();
    return submittedStyles.filter((s) =>
      (!c || s.customer.toLowerCase().includes(c)) &&
      (!st || s.styleNo.toLowerCase().includes(st))
    ).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  }, [submittedStyles, searchCustomer, searchStyle]);

  const selected = useMemo(() =>
    styles.find((s) => s.id === selectedId) || null,
    [styles, selectedId]
  );

  const handleSelect = (s: SampleStyle) => {
    setSelectedId(s.id);
    setStatus(s.adminStatus as 'Approved' | 'Pending');
    setRemarks(s.adminRemarks || '');
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      await adminAction(selected.id, status, remarks || undefined);
      setSaveSuccess(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-50 p-3">
              <ClipboardCheck className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Approve Submissions</h1>
              <p className="mt-1 text-sm text-slate-500">
                Review sample style details submitted by developers and set approval status.
              </p>
            </div>
          </div>
          {refreshing && (
            <span className="flex items-center gap-1 text-xs text-slate-400 mt-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Refreshing…
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Search</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)}
            placeholder="Filter by customer…"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          <input type="text" value={searchStyle} onChange={(e) => setSearchStyle(e.target.value)}
            placeholder="Filter by style no…"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          <button onClick={() => { setSearchCustomer(''); setSearchStyle(''); }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Left — submission list */}
          <div className="xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">Submitted Styles</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {filtered.length}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No submissions yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filtered.map((s) => (
                    <button key={s.id} onClick={() => handleSelect(s)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedId === s.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{s.styleNo}</p>
                          <p className="text-xs text-slate-500 truncate">{s.customer}</p>
                        </div>
                        <StatusBadge status={s.adminStatus} />
                      </div>
                      <div className="mt-2 text-xs text-slate-400 flex gap-3">
                        <span>{s.bodyColour}</span>
                        <span>Submitted: {s.submittedAt?.slice(0, 10) || '—'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — detail + decision */}
          <div className="xl:col-span-8">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div key={selected.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  {/* Style detail card — read only */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4 pb-4 border-b border-slate-100 mb-4">
                      {selected.imagePath ? (
                        <img src={`${API.BASE}${selected.imagePath}`} alt=""
                          className="w-24 h-24 object-cover rounded-xl border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{selected.styleNo}</h2>
                        <p className="text-sm text-slate-500">{selected.customer} · {selected.season}</p>
                        <div className="mt-2"><StatusBadge status={selected.adminStatus} /></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <InfoCard icon={User2} label="Customer" value={selected.customer} />
                      <InfoCard icon={Shirt} label="Style No" value={selected.styleNo} />
                      <InfoCard icon={Layers3} label="Season" value={selected.season} />
                      <InfoCard icon={Palette} label="Body Colour" value={selected.bodyColour} />
                      <InfoCard icon={Palette} label="Print Colour" value={selected.printColour} />
                      <InfoCard icon={Palette} label="Technique" value={selected.printingTechnique} />
                      <InfoCard icon={Layers3} label="Print Colour Qty" value={selected.printColourQty} />
                      <InfoCard icon={Layers3} label="Washing Standard" value={selected.washingStandard} />
                      <InfoCard icon={Layers3} label="Bulk Qty" value={selected.bulkQty || '—'} />
                      <InfoCard icon={CalendarDays} label="RC Meeting Date" value={selected.rcMeetingDate || '—'} />
                      <InfoCard icon={Layers3} label="AC Number" value={selected.acNumber || '—'} />
                      <InfoCard icon={Layers3} label="Board Set" value={selected.boardSet || '—'} />
                    </div>

                    {/* Placements */}
                    {selected.placements && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-slate-500 mb-2">Placements</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.placements.split(',').filter(Boolean).map((p) => (
                            <span key={p} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission details — read only */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Submission Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <InfoCard icon={CalendarDays} label="Submitted At" value={selected.submittedAt?.slice(0, 10) || '—'} />
                      <InfoCard icon={CalendarDays} label="Client Approved At" value={selected.clientApprovedAt?.slice(0, 10) || '—'} />
                      <InfoCard icon={User2} label="Client Approved By" value={selected.clientApprovedBy || '—'} />
                      <InfoCard icon={Layers3} label="Bulk Qty" value={selected.bulkQty || '—'} />
                    </div>
                  </div>

                  {/* Admin decision */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardCheck className="h-5 w-5 text-slate-500" />
                      <h3 className="text-base font-semibold text-slate-900">Admin Decision</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select value={status} onChange={(e) => { setStatus(e.target.value as any); setSaveSuccess(false); }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (optional)</label>
                        <textarea value={remarks} rows={3}
                          onChange={(e) => { setRemarks(e.target.value); setSaveSuccess(false); }}
                          placeholder="Any notes for the developer…"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                      </div>

                      {saveError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                          {saveError}
                        </div>
                      )}

                      {saveSuccess && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Decision saved successfully.
                        </div>
                      )}

                      <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button onClick={handleSave} disabled={saving}
                          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {saving ? 'Saving…' : 'Save Decision'}
                        </button>
                        <button onClick={() => { setSelectedId(''); setSaveSuccess(false); setSaveError(''); }}
                          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm"
                >
                  <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Select a submission</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose a submitted style from the left to review.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}