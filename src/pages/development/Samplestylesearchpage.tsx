// src/pages/development/SampleStyleSearchPage.tsx
// Developer search history — Sample Styles and Admin-Approved styles.
// Filters: Style No, Customer, Body Colour, Date (dropdown of available dates).
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, FlaskConical, CheckCircle2, Clock, X,
  Image as ImageIcon, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { useSampleStyleStore, SampleStyle } from '../../store/sampleStyleStore';
import { API } from '../../api/client';

// ── filter bar ────────────────────────────────────────────────────────────────
interface Filters {
  styleNo: string;
  customer: string;
  bodyColour: string;
  date: string;
  tab: 'all' | 'submitted' | 'approved';
}

const EMPTY_FILTERS: Filters = {
  styleNo: '',
  customer: '',
  bodyColour: '',
  date: '',
  tab: 'all',
};

// ── helpers ───────────────────────────────────────────────────────────────────
function unique(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

function StatusBadge({ style }: { style: SampleStyle }) {
  if (style.adminStatus === 'Approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Admin Approved
      </span>
    );
  }
  if (style.submittedToAdmin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> Awaiting Admin
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
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
      <Clock className="h-3 w-3" /> Pending Client
    </span>
  );
}

// ── expandable detail panel ───────────────────────────────────────────────────
function DetailPanel({ style }: { style: SampleStyle }) {
  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">

      {/* Print details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
        <p className="text-xs text-slate-500 font-medium mb-1">Body Colour</p>
        <div className="flex flex-wrap gap-1">
          {(style.bodyColour || '').split(',').map(c => c.trim()).filter(Boolean).map(c => (
            <span key={c} className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{c}</span>
          ))}
        </div>
      </div>
      <div><p className="text-xs text-slate-500 font-medium">Component</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            {style.component || '—'}
          </span>
        </div>
        <div><p className="text-xs text-slate-500 font-medium">Print Colour</p><p className="font-semibold text-slate-800">{style.printColour || '—'}</p></div>
        <div><p className="text-xs text-slate-500 font-medium">Print Qty</p><p className="font-semibold text-slate-800">{style.printColourQty || '—'}</p></div>
        <div><p className="text-xs text-slate-500 font-medium">Washing</p><p className="font-semibold text-slate-800">{style.washingStandard || '—'}</p></div>
        <div><p className="text-xs text-slate-500 font-medium">Technique</p><p className="font-semibold text-slate-800">{style.printingTechnique || '—'}</p></div>
      </div>

      {/* Revision history */}
      {style.revisions && style.revisions.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
            Revision History ({style.revisions.length})
          </p>
          <div className="space-y-1.5">
            {style.revisions.map((rev) => (
              <div key={rev.id} className="flex gap-3 items-start rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center">
                  {rev.revisionNo}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700">{rev.comment}</p>
                  {rev.artworkUrl && (
                    <div className="mt-1.5">
                      <p className="text-[10px] text-slate-400 mb-1">Revision artwork:</p>
                      <img
                        src={rev.artworkUrl.startsWith('http') ? rev.artworkUrl
                          : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(rev.artworkUrl)}`}
                        alt={`Rev ${rev.revisionNo}`}
                        className="h-16 w-16 object-cover rounded border border-slate-200"
                        onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">{rev.createdAt} · {rev.createdBy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission details */}
      {style.submittedToAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-slate-500 font-medium">RA Meeting Date</p><p className="font-semibold text-slate-800">{style.rcMeetingDate || '—'}</p></div>
          <div><p className="text-xs text-slate-500 font-medium">Board Set</p><p className="font-semibold text-slate-800">{style.boardSet || '—'}</p></div>
          <div><p className="text-xs text-slate-500 font-medium">Bulk Qty</p><p className="font-semibold text-slate-800">{style.bulkQty || '—'}</p></div>
          <div><p className="text-xs text-slate-500 font-medium">Submitted At</p><p className="font-semibold text-slate-800">{style.submittedAt?.slice(0, 10) || '—'}</p></div>
          {style.developerComments && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-slate-500 font-medium">Developer Comments</p>
              <p className="font-semibold text-slate-800">{style.developerComments}</p>
            </div>
          )}
        </div>
      )}

      {/* Admin action */}
      {style.adminStatus === 'Approved' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm space-y-1">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Admin Approved</p>
          <div className="flex gap-4 text-xs text-slate-600">
            <span>By: <span className="font-semibold">{style.adminActionBy || '—'}</span></span>
            <span>At: <span className="font-semibold">{style.adminActionAt?.slice(0, 10) || '—'}</span></span>
          </div>
          {style.adminRemarks && <p className="text-xs text-slate-600">Remarks: <span className="font-semibold">{style.adminRemarks}</span></p>}
        </div>
      )}
    </div>
  );
}

// ── row ───────────────────────────────────────────────────────────────────────
function StyleRow({ style }: { style: SampleStyle }) {
  const [expanded, setExpanded] = useState(false);
  const imgUrl = style.imagePath
    ? style.imagePath.startsWith('http')
      ? style.imagePath
      : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(style.imagePath)}`
    : null;

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          {imgUrl ? (
            <img src={imgUrl} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-slate-300" />
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <p className="font-semibold text-slate-900 text-sm">{style.styleNo}</p>
          <p className="text-xs text-slate-500">{style.customer}</p>
          <p className="text-xs text-slate-400">{style.season}</p>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {(style.bodyColour || '').split(',').map(c => c.trim()).filter(Boolean).map(c => (
              <span key={c} className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">{c}</span>
            ))}
            {!style.bodyColour && <span className="text-slate-400 text-xs">—</span>}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">{style.createdAt?.slice(0, 10) || '—'}</td>
        <td className="px-4 py-3"><StatusBadge style={style} /></td>
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Less' : 'Details'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 pb-4 pt-0">
            <DetailPanel style={style} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function SampleStyleSearchPage() {
  const { styles, loading, refreshing, fetchStyles } = useSampleStyleStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => { fetchStyles(true); }, [fetchStyles]);

  // Build dropdown options from actual data
  const styleNos = useMemo(() => unique(styles.map((s) => s.styleNo)), [styles]);
  const customers = useMemo(() => unique(styles.map((s) => s.customer)), [styles]);
  const bodyColours = useMemo(() => unique(styles.map((s) => s.bodyColour)), [styles]);
  const dates = useMemo(() => unique(styles.map((s) => s.createdAt?.slice(0, 10))), [styles]);

  const hasFilters = filters.styleNo || filters.customer || filters.bodyColour || filters.date;

  const filtered = useMemo(() => {
    return styles.filter((s) => {
      // Tab filter
      if (filters.tab === 'submitted' && !s.submittedToAdmin) return false;
      if (filters.tab === 'approved' && s.adminStatus !== 'Approved') return false;

      // Field filters
      if (filters.styleNo && s.styleNo !== filters.styleNo) return false;
      if (filters.customer && s.customer !== filters.customer) return false;
      if (filters.bodyColour && !s.bodyColour?.toLowerCase().includes(filters.bodyColour.toLowerCase())) return false;
      if (filters.date && s.createdAt?.slice(0, 10) !== filters.date) return false;

      return true;
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [styles, filters]);

  const set = (key: keyof Filters, val: string) =>
    setFilters((p) => ({ ...p, [key]: val }));

  const clearFilters = () => setFilters((p) => ({ ...p, styleNo: '', customer: '', bodyColour: '', date: '' }));

  const counts = {
    all: styles.length,
    submitted: styles.filter((s) => s.submittedToAdmin).length,
    approved: styles.filter((s) => s.adminStatus === 'Approved').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <FlaskConical className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sample Style Search</h2>
            <p className="text-slate-500 text-sm">Search your sample style and approval history.</p>
          </div>
        </div>
        {refreshing && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <RefreshCw className="w-3 h-3 animate-spin" /> Refreshing…
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'submitted', 'approved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => set('tab', tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filters.tab === tab
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab === 'all' ? 'All Styles' : tab === 'submitted' ? 'Submitted to Admin' : 'Admin Approved'}
            <span className={`ml-1.5 text-xs ${filters.tab === tab ? 'opacity-80' : 'text-slate-400'}`}>
              ({counts[tab]})
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">Filters</span>
          {hasFilters && (
            <button onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Style No dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Style No</label>
            <select value={filters.styleNo} onChange={(e) => set('styleNo', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">All</option>
              {styleNos.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Customer dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Customer</label>
            <select value={filters.customer} onChange={(e) => set('customer', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">All</option>
              {customers.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Body Colour dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Body Colour</label>
            <select value={filters.bodyColour} onChange={(e) => set('bodyColour', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">All</option>
              {bodyColours.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Date dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date Created</label>
            <select value={filters.date} onChange={(e) => set('date', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">All</option>
              {dates.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800">Results</span>
          <span className="text-xs text-slate-500">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <FlaskConical className="w-10 h-10 opacity-30" />
            <p className="text-sm">No styles match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold w-20">Image</th>
                  <th className="px-4 py-3 font-semibold">Style / Customer</th>
                  <th className="px-4 py-3 font-semibold">Body Colour</th>
                  <th className="px-4 py-3 font-semibold">Date Created</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((style) => (
                  <StyleRow key={style.id} style={style} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}