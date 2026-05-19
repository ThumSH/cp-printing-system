// src/pages/development/SampleStylePage.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, CheckCircle2, XCircle, Upload, Image as ImageIcon,
  RefreshCw, Loader2, Clock, ChevronDown, ChevronUp,
  GitBranch, X,
} from 'lucide-react';
import { useSampleStyleStore, SampleStyle } from '../../store/sampleStyleStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { API } from '../../api/client';

// ── helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ style }: { style: SampleStyle }) {
  if (style.submittedToAdmin) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        style.adminStatus === 'Approved'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}>
        {style.adminStatus === 'Approved'
          ? <CheckCircle2 className="h-3 w-3" />
          : <Clock className="h-3 w-3" />}
        {style.adminStatus === 'Approved' ? 'Admin Approved' : 'Awaiting Admin'}
      </span>
    );
  }
  if (style.clientApproved) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <CheckCircle2 className="h-3 w-3" /> Client Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      <Clock className="h-3 w-3" /> Pending Client
    </span>
  );
}

// ── image upload cell ─────────────────────────────────────────────────────────
function ImageCell({ style }: { style: SampleStyle }) {
  const { uploadImage } = useSampleStyleStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      await uploadImage(style.id, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const imgUrl = style.imagePath ? `${API.BASE}${style.imagePath}` : null;

  return (
    <div className="flex flex-col items-center gap-1">
      {imgUrl ? (
        <label className="cursor-pointer group relative">
          <img src={imgUrl} alt="Sample" className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm group-hover:opacity-70 transition-opacity" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Upload className="w-5 h-5 text-white drop-shadow" />
          </div>
          <input type="file" className="sr-only" accept="image/*" onChange={handleFile} disabled={uploading} />
        </label>
      ) : (
        <label className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          uploading ? 'border-slate-200 bg-slate-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
        }`}>
          {uploading
            ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            : <ImageIcon className="w-5 h-5 text-slate-400" />}
          <input type="file" className="sr-only" accept="image/*" onChange={handleFile} disabled={uploading} />
        </label>
      )}
      {error && <p className="text-[10px] text-red-600 text-center max-w-16">{error}</p>}
    </div>
  );
}

// ── expandable detail row ─────────────────────────────────────────────────────
function DetailRow({ style, onToggleApprove, onRevise }: {
  style: SampleStyle;
  onToggleApprove: (id: string) => void;
  onRevise?: (style: SampleStyle) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState('');

  const component = (style as any).component || '';

  const handleToggle = async () => {
    setToggling(true); setToggleError('');
    try {
      await onToggleApprove(style.id);
    } catch (e) {
      setToggleError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${!style.clientApproved && !style.submittedToAdmin ? '' : ''}`}>
        <td className="px-4 py-3"><ImageCell style={style} /></td>
        <td className="px-4 py-3">
          <p className="font-semibold text-slate-900 text-sm">{style.styleNo}</p>
          <p className="text-xs text-slate-500">{style.customer}</p>
          <p className="text-xs text-slate-400">{style.season}</p>
        </td>
        <td className="px-4 py-3 text-sm text-slate-700">{style.bodyColour || '—'}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{style.printingTechnique || '—'}</td>
        <td className="px-4 py-3">
          {component ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">{component}</span>
          ) : <span className="text-slate-300 text-xs">—</span>}
        </td>
        <td className="px-4 py-3"><StatusBadge style={style} /></td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            {!style.submittedToAdmin ? (
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  style.clientApproved
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                } disabled:opacity-50`}
              >
                {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> :
                  style.clientApproved ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {style.clientApproved ? 'Unapprove' : 'Mark Approved'}
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">Submitted</span>
            )}
            {/* Add Revision — only for admin-approved styles */}
            {style.adminStatus === 'Approved' && onRevise && (
              <button
                onClick={() => onRevise(style)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                <GitBranch className="h-3 w-3" /> Add Revision
              </button>
            )}
            {toggleError && <p className="text-[10px] text-red-600">{toggleError}</p>}
            <button
              onClick={() => setExpanded((p) => !p)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Less' : 'Details'}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={7} className="px-4 pb-4 pt-0 bg-slate-50">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white rounded-xl border border-slate-200 mt-2 text-sm">
                  <div><p className="text-xs text-slate-500 font-medium">Print Colour</p><p className="font-semibold text-slate-800">{style.printColour || '—'}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Print Colour Qty</p><p className="font-semibold text-slate-800">{style.printColourQty || '—'}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Washing Standard</p><p className="font-semibold text-slate-800">{style.washingStandard || '—'}</p></div>
                  <div><p className="text-xs text-slate-500 font-medium">Created</p><p className="font-semibold text-slate-800">{style.createdAt}</p></div>
                  {style.submittedToAdmin && (
                    <>
                      <div><p className="text-xs text-slate-500 font-medium">RC Meeting Date</p><p className="font-semibold text-slate-800">{style.rcMeetingDate || '—'}</p></div>
                      <div><p className="text-xs text-slate-500 font-medium">AC Number</p><p className="font-semibold text-slate-800">{style.acNumber || '—'}</p></div>
                      <div><p className="text-xs text-slate-500 font-medium">Board Set</p><p className="font-semibold text-slate-800">{style.boardSet || '—'}</p></div>
                      <div><p className="text-xs text-slate-500 font-medium">Bulk Qty</p><p className="font-semibold text-slate-800">{style.bulkQty || '—'}</p></div>
                    </>
                  )}
                  {style.adminRemarks && (
                    <div className="col-span-4">
                      <p className="text-xs text-slate-500 font-medium">Admin Remarks</p>
                      <p className="font-semibold text-slate-800">{style.adminRemarks}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function SampleStylePage() {
  const { styles, loading, refreshing, fetchStyles, toggleClientApprove, reviseStyle } = useSampleStyleStore();
  const { fetchRecords } = useInventoryStore();

  // Revision modal
  const [reviseTarget, setReviseTarget] = useState<SampleStyle | null>(null);
  const [reviseForm, setReviseForm]     = useState({ extraBulkQty: '', rcMeetingDate: '', acNumber: '', boardSet: '', comments: '' });
  const [revising, setRevising]         = useState(false);
  const [reviseError, setReviseError]   = useState('');
  const [reviseSuccess, setReviseSuccess] = useState('');

  const handleRevise = async () => {
    if (!reviseTarget) return;
    if (!reviseForm.extraBulkQty || Number(reviseForm.extraBulkQty) <= 0) {
      setReviseError('Extra Bulk Qty must be a positive number.'); return;
    }
    setRevising(true); setReviseError('');
    try {
      await reviseStyle(reviseTarget.id, {
        extraBulkQty:  reviseForm.extraBulkQty,
        rcMeetingDate: reviseForm.rcMeetingDate || undefined,
        acNumber:      reviseForm.acNumber      || undefined,
        boardSet:      reviseForm.boardSet      || undefined,
        comments:      reviseForm.comments      || undefined,
      });
      setReviseSuccess(`Revision created — extra ${reviseForm.extraBulkQty} pcs sent to admin.`);
      setReviseForm({ extraBulkQty: '', rcMeetingDate: '', acNumber: '', boardSet: '', comments: '' });
      setReviseTarget(null);
      await fetchStyles(true);
    } catch (e) {
      setReviseError(e instanceof Error ? e.message : 'Failed to create revision.');
    } finally { setRevising(false); }
  };
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'submitted'>('all');

  useEffect(() => { fetchStyles(true); fetchRecords?.(); }, [fetchStyles]);

  const filtered = styles.filter((s) => {
    if (filter === 'pending') return !s.clientApproved && !s.submittedToAdmin;
    if (filter === 'approved') return s.clientApproved && !s.submittedToAdmin;
    if (filter === 'submitted') return s.submittedToAdmin;
    return true;
  });

  const counts = {
    all: styles.length,
    pending: styles.filter((s) => !s.clientApproved && !s.submittedToAdmin).length,
    approved: styles.filter((s) => s.clientApproved && !s.submittedToAdmin).length,
    submitted: styles.filter((s) => s.submittedToAdmin).length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><FlaskConical className="w-6 h-6 text-indigo-700" /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sample Styles</h2>
            <p className="text-slate-500 text-sm">Upload images and mark client approval before submission.</p>
          </div>
        </div>
        {refreshing && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <RefreshCw className="w-3 h-3 animate-spin" /> Refreshing…
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'submitted'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1.5 text-xs ${filter === f ? 'opacity-80' : 'text-slate-400'}`}>
              ({counts[f]})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading sample styles…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <FlaskConical className="w-10 h-10 opacity-30" />
            <p className="text-sm">
              {filter === 'all'
                ? 'No sample styles yet. Create a development job to get started.'
                : `No styles in "${filter}" state.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold w-20">Image</th>
                  <th className="px-4 py-3 font-semibold">Style / Customer</th>
                  <th className="px-4 py-3 font-semibold">Body Colour</th>
                  <th className="px-4 py-3 font-semibold">Technique</th>
                  <th className="px-4 py-3 font-semibold">Component</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((style) => (
                  <DetailRow
                    key={style.id}
                    style={style}
                    onToggleApprove={toggleClientApprove}
                    onRevise={setReviseTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-right">
        {counts.approved} ready to submit · {counts.submitted} submitted to admin
      </p>

      {/* ── REVISION MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {reviseTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setReviseTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">Add Revision</h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-indigo-700">{reviseTarget.styleNo}</span>
                    {' — '}{(reviseTarget as any).component} · {reviseTarget.bodyColour}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Current approved bulk: <span className="font-bold text-slate-600">{Number(reviseTarget.bulkQty || 0).toLocaleString()} pcs</span>
                  </p>
                </div>
                <button onClick={() => setReviseTarget(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                Enter the <strong>extra qty</strong> only. This creates a new revision sent to admin for approval.
                The system automatically sums all approved revisions for this component.
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Extra Bulk Qty <span className="text-red-500">*</span></label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={reviseForm.extraBulkQty}
                    onChange={e => setReviseForm(p => ({ ...p, extraBulkQty: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="e.g. 500"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus />
                  {reviseForm.extraBulkQty && Number(reviseForm.extraBulkQty) > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      New total: <span className="font-bold text-blue-700">{(Number(reviseTarget.bulkQty || 0) + Number(reviseForm.extraBulkQty)).toLocaleString()} pcs</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">RC Meeting Date</label>
                    <input type="date" value={reviseForm.rcMeetingDate}
                      onChange={e => setReviseForm(p => ({ ...p, rcMeetingDate: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">AC Number</label>
                    <input type="text" value={reviseForm.acNumber}
                      onChange={e => setReviseForm(p => ({ ...p, acNumber: e.target.value }))}
                      placeholder="e.g. AC-993"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Comments for Admin</label>
                  <textarea value={reviseForm.comments} rows={3}
                    onChange={e => setReviseForm(p => ({ ...p, comments: e.target.value }))}
                    placeholder="e.g. Client increased Front order by 500 pcs..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
              {reviseError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{reviseError}</div>}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button onClick={handleRevise} disabled={revising}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {revising ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : <><GitBranch className="h-4 w-4" />Submit Revision</>}
                </button>
                <button onClick={() => setReviseTarget(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviseSuccess && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-lg flex items-center gap-3 max-w-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">{reviseSuccess}</p>
            <button onClick={() => setReviseSuccess('')} className="ml-auto text-emerald-500"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}