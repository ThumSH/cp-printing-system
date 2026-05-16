// src/pages/development/SampleStylePage.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, CheckCircle2, XCircle, Upload, Image as ImageIcon,
  RefreshCw, Loader2, AlertCircle, Clock, Send, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useSampleStyleStore, SampleStyle } from '../../store/sampleStyleStore';
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
function DetailRow({ style, onToggleApprove }: {
  style: SampleStyle;
  onToggleApprove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState('');

  const placements = style.placements ? style.placements.split(',').filter(Boolean) : [];

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
          <div className="flex flex-wrap gap-1">
            {placements.map((p) => (
              <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">{p}</span>
            ))}
          </div>
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
  const { styles, loading, refreshing, fetchStyles, toggleClientApprove } = useSampleStyleStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'submitted'>('all');

  useEffect(() => { fetchStyles(); }, [fetchStyles]);

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
                  <th className="px-4 py-3 font-semibold">Placements</th>
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
    </motion.div>
  );
}