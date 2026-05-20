// src/pages/development/SampleStylePage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Plus, ChevronDown, ChevronRight, MessageSquare,
  CheckCircle2, AlertCircle, Send, Building2, Lock, Calendar,
  GitBranch, Image,
} from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';
import { useSampleStyleStore, SampleStyle, SampleStyleRevision } from '../../store/sampleStyleStore';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(s?: string) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ style }: { style: SampleStyle }) {
  if (style.submittedToAdmin && style.adminStatus === 'Approved')
    return <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5">Admin Approved ✓</span>;
  if (style.submittedToAdmin)
    return <span className="rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5">Submitted to Admin</span>;
  if (style.clientApproved)
    return <span className="rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5">Client Approved ✓</span>;
  if (style.revisions.length > 0)
    return <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5">Rev {style.revisions.length} — In Progress</span>;
  return <span className="rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5">No Revisions</span>;
}

// ── Style image ───────────────────────────────────────────────────────────────
function StyleImage({ imagePath, alt }: { imagePath?: string; alt: string }) {
  const [err, setErr] = useState(false);
  const src = imagePath
    ? imagePath.startsWith('http')
      ? imagePath  // already a full URL (from DevelopmentJob artwork)
      : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(imagePath)}`
    : '';
  if (!src || err)
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-100 text-slate-300">
        <Image className="h-8 w-8" />
      </div>
    );
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full rounded-lg object-cover"
      onError={() => setErr(true)}
    />
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function SampleStylePage() {
  const {
    styles, loading,
    fetchStyles, addRevision, toggleClientApprove, submitToAdmin,
  } = useSampleStyleStore();

  const [pageError, setPageError]     = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  // Filters
  const [showAll, setShowAll] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');

  // Add revision
  const [addingRevFor, setAddingRevFor]     = useState<string | null>(null);
  const [revComment, setRevComment]         = useState('');
  const [revArtworkFile, setRevArtworkFile] = useState<File | null>(null);
  const [revArtworkBlob, setRevArtworkBlob] = useState('');
  const [isAddingRev, setIsAddingRev]       = useState(false);

  // Client approve modal
  const [approveModal, setApproveModal] = useState<SampleStyle | null>(null);
  const [isApproving, setIsApproving]   = useState(false);

  // Submit to admin modal
  const [submitModal, setSubmitModal]     = useState<SampleStyle | null>(null);
  const [rcMeetingDate, setRcMeetingDate] = useState('');
  const [boardSet, setBoardSet]           = useState('');
  const [bulkQty, setBulkQty]             = useState('');

  const [devComments, setDevComments]     = useState('');
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [submitError, setSubmitError]     = useState('');

  // Always fetch fresh on mount — ensures revisions from previous session are visible
  useEffect(() => { fetchStyles(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unique customers for filter dropdown
  const uniqueCustomers = useMemo(() => Array.from(new Set(styles.map(s => s.customer))).sort(), [styles]);

  // Group by styleNo + customer, apply filters, then slice top 10
  const allGrouped = useMemo(() => {
    const map = new Map<string, SampleStyle[]>();
    styles.forEach(s => {
      const key = s.styleNo + '|||' + s.customer;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      styleNo:    items[0].styleNo,
      customer:   items[0].customer,
      components: items,
    }));
  }, [styles]);

  const grouped = useMemo(() => {
    let list = allGrouped;
    if (filterCustomer) list = list.filter(g => g.customer === filterCustomer);
    if (filterStatus === 'approved')     list = list.filter(g => g.components.every(s => s.clientApproved));
    if (filterStatus === 'submitted')    list = list.filter(g => g.components.some(s => s.submittedToAdmin));
    if (filterStatus === 'in_progress')  list = list.filter(g => g.components.some(s => s.revisions.length > 0 && !s.clientApproved));
    if (filterStatus === 'no_revisions') list = list.filter(g => g.components.every(s => s.revisions.length === 0));
    return list;
  }, [allGrouped, filterCustomer, filterStatus]);

  const displayedGroups = showAll ? grouped : grouped.slice(0, 10);
  const hasMore = grouped.length > 10;
  const isFiltered = !!(filterCustomer || filterStatus);

  // ── Add revision ─────────────────────────────────────────────────────────────
  const handleAddRevision = async (styleId: string) => {
    if (!revComment.trim()) return;
    setIsAddingRev(true);
    try {
      let artworkUrl: string | undefined;

      // Upload revision artwork if provided
      if (revArtworkFile) {
        const fd = new FormData();
        fd.append('file', revArtworkFile);
        const headers = getAuthHeaders();
        delete (headers as any)['Content-Type'];
        const uploadRes = await fetch(`${API.BASE}/api/samplestyle/revisionimage`, {
          method: 'POST', headers, body: fd,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          artworkUrl = data.url;
        }
      }

      await addRevision(styleId, revComment.trim(), artworkUrl);
      setRevComment('');
      setRevArtworkFile(null);
      setRevArtworkBlob('');
      setAddingRevFor(null);
      setSuccessMsg('Revision saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to add revision.');
    } finally {
      setIsAddingRev(false);
    }
  };

  // ── Client approve ───────────────────────────────────────────────────────────
  const handleClientApprove = (style: SampleStyle) => {
    if (!style.clientApproved) {
      setApproveModal(style); // show confirmation
    } else {
      // Un-approve (before submission only)
      doToggleApprove(style.id);
    }
  };

  const doToggleApprove = async (id: string) => {
    setIsApproving(true);
    try {
      await toggleClientApprove(id);
      setApproveModal(null);
      setSuccessMsg('Client approval status updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setIsApproving(false);
    }
  };

  // ── Submit to admin ──────────────────────────────────────────────────────────
  const handleSubmitToAdmin = async () => {
    if (!submitModal) return;
    if (!rcMeetingDate) { setSubmitError('RA Meeting Date is required.'); return; }
    if (!bulkQty)       { setSubmitError('Bulk Qty is required.'); return; }
    setIsSubmitting(true); setSubmitError('');
    try {
      await submitToAdmin(submitModal.id, {
        rcMeetingDate,
        boardSet,
        bulkQty,
        developerComments: devComments,
      });
      setSubmitModal(null);
      setRcMeetingDate(''); setBoardSet(''); setBulkQty('');
      setDevComments('');
      setSuccessMsg('Submitted to admin successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2"><Palette className="h-6 w-6 text-purple-700" /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sample Styles</h2>
            <p className="text-sm text-slate-500">Add client comments as revisions → approve → submit to admin.</p>
          </div>
        </div>
        <button onClick={() => fetchStyles(true)} className="text-xs text-slate-500 hover:text-slate-700 underline">Refresh</button>
      </div>

      {pageError  && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />{pageError}
          <button onClick={() => setPageError('')} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mr-1 inline h-4 w-4" />{successMsg}
        </div>
      )}
      {loading && <div className="text-center py-12 text-slate-400">Loading styles…</div>}

      {/* Grouped styles */}
      {grouped.map(group => (
        <div key={group.key} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900">{group.styleNo}</p>
              <p className="text-sm text-slate-500">{group.customer}</p>
            </div>
            <span className="text-xs text-slate-400">
              {group.components.length} component{group.components.length !== 1 ? 's' : ''}
            </span>
          </div>

          {group.components.map(style => {
            const revisions             = style.revisions;
            const isExpanded            = expandedId === style.id;
            const canAddRevision        = !style.clientApproved && !style.submittedToAdmin;
            const canSubmit             = style.clientApproved && !style.submittedToAdmin;

            return (
              <div key={style.id} className="border-b border-slate-100 last:border-0">

                {/* Row */}
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : style.id)}>
                  {isExpanded
                    ? <ChevronDown  className="h-4 w-4 text-slate-400 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}

                  {/* Thumbnail */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                    <StyleImage imagePath={style.imagePath} alt={style.styleNo} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{style.component || 'Component'}</span>
                      <div className="flex flex-wrap gap-1">
                        {(style.bodyColour || '').split(',').map(c => c.trim()).filter(Boolean).map(c => (
                          <span key={c} className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">{c}</span>
                        ))}
                      </div>
                      <StatusBadge style={style} />
                      {revisions.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <MessageSquare className="h-3 w-3" />{revisions.length} revision{revisions.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{style.season} · {style.printingTechnique}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {canAddRevision && (
                      <button
                        onClick={() => {
                          setAddingRevFor(style.id);
                          setRevComment('');
                          setExpandedId(style.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                        <Plus className="h-3.5 w-3.5" /> Add Revision
                      </button>
                    )}
                    {!style.submittedToAdmin && (
                      <button
                        onClick={() => handleClientApprove(style)}
                        disabled={isApproving}
                        className={'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ' + (style.clientApproved ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-emerald-600 text-white hover:bg-emerald-700')}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {style.clientApproved ? 'Approved ✓' : 'Mark Approved'}
                      </button>
                    )}
                    {canSubmit && (
                      <button
                        onClick={() => {
                          setSubmitModal(style);
                          setRcMeetingDate(''); setBoardSet(''); setBulkQty('');
                          setDevComments(''); setSubmitError('');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
                        <Building2 className="h-3.5 w-3.5" /> Submit to Admin
                      </button>
                    )}
                    {style.submittedToAdmin && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Lock className="h-3.5 w-3.5" /> Locked
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 overflow-hidden">
                      <div className="px-6 py-5 space-y-5 bg-slate-50/30">

                        {/* Image + details */}
                        <div className="flex gap-4">
                          {style.imagePath && (
                            <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                              <StyleImage imagePath={style.imagePath} alt={style.styleNo} />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
                            {[
                              ['Print Colour',  style.printColour],
                              ['Technique',     style.printingTechnique],
                              ['Season',        style.season],
                              ['Washing',       style.washingStandard],
                              ['Print Qty',     style.printColourQty],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                                <p className="text-[9px] font-medium uppercase text-slate-400">{label}</p>
                                <p className="text-xs font-semibold text-slate-700">{value || '—'}</p>
                              </div>
                            ))}
                            {/* Body colour as chips */}
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 col-span-2">
                              <p className="text-[9px] font-medium uppercase text-slate-400 mb-1">Body Colour</p>
                              <div className="flex flex-wrap gap-1">
                                {(style.bodyColour || '').split(',').map(c => c.trim()).filter(Boolean).map(c => (
                                  <span key={c} className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{c}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Revision history */}
                        <div>
                          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                            <GitBranch className="h-3.5 w-3.5" />Revision History
                            {style.revisions.length > 0 && (
                              <span className="rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 ml-1">
                                {style.revisions.length}
                              </span>
                            )}
                          </h4>

                          {revisions.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 py-5 text-center text-sm text-slate-400">
                              No revisions yet. Use "Add Revision" to log client feedback.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {revisions.map((rev: SampleStyleRevision) => (
                                <div key={rev.id} className="flex gap-3 items-start rounded-lg border border-slate-200 bg-white px-4 py-3">
                                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">
                                    {rev.revisionNo}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{rev.comment}</p>
                                    {rev.artworkUrl && (
                                      <div className="mt-2">
                                        <p className="text-[10px] font-medium text-slate-400 mb-1">Revision Artwork:</p>
                                        <img
                                          src={rev.artworkUrl.startsWith('http') ? rev.artworkUrl : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(rev.artworkUrl)}`}
                                          alt={`Rev ${rev.revisionNo} artwork`}
                                          className="h-20 w-20 object-cover rounded-lg border border-slate-200 shadow-sm"
                                          onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                                        />
                                      </div>
                                    )}
                                    <p className="mt-1 text-[10px] text-slate-400">
                                      {fmtDate(rev.createdAt)} · {rev.createdBy}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add revision inline form */}
                          {canAddRevision && addingRevFor === style.id && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              className="mt-3 rounded-xl border border-blue-200 bg-white p-4 space-y-3">
                              <p className="text-xs font-semibold text-slate-600">
                                Revision {revisions.length + 1} — Client feedback
                              </p>
                              <textarea
                                value={revComment}
                                onChange={e => setRevComment(e.target.value)}
                                autoFocus
                                placeholder="Enter the client's feedback or revision request…"
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />

                              {/* Revision artwork upload */}
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1.5">Replace artwork (optional)</p>
                                <div className="flex items-center gap-3">
                                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                    <Plus className="h-3.5 w-3.5" />
                                    {revArtworkFile ? revArtworkFile.name : 'Upload Revision Artwork'}
                                    <input type="file" accept="image/*" className="hidden"
                                      onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) { setRevArtworkFile(f); setRevArtworkBlob(URL.createObjectURL(f)); }
                                      }} />
                                  </label>
                                  {revArtworkBlob && (
                                    <>
                                      <img src={revArtworkBlob} alt="preview" className="h-10 w-10 object-cover rounded-lg border border-slate-200" />
                                      <button type="button" onClick={() => { setRevArtworkFile(null); setRevArtworkBlob(''); }}
                                        className="text-xs text-red-500 hover:underline">Remove</button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddRevision(style.id)}
                                  disabled={isAddingRev || !revComment.trim()}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors">
                                  <Send className="h-3.5 w-3.5" />
                                  {isAddingRev ? 'Saving…' : 'Save Revision'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setAddingRevFor(null); setRevComment(''); setRevArtworkFile(null); setRevArtworkBlob(''); }}
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Submitted-to-admin summary */}
                        {style.submittedToAdmin && (
                          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-700">Submitted to Admin</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div><p className="text-slate-400">RA Meeting</p><p className="font-semibold">{fmtDate(style.rcMeetingDate)}</p></div>
                              <div><p className="text-slate-400">Board Set</p><p className="font-semibold">{style.boardSet || '—'}</p></div>
                              <div><p className="text-slate-400">Bulk Qty</p><p className="font-semibold">{style.bulkQty || '—'}</p></div>
                            </div>
                            {style.developerComments && (
                              <p className="mt-2 text-xs text-slate-500"><span className="font-semibold">Dev note:</span> {style.developerComments}</p>
                            )}
                            {style.adminRemarks && (
                              <p className="mt-1 text-xs text-slate-500"><span className="font-semibold">Admin:</span> {style.adminRemarks}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ))}

      {/* Show more / less */}
      {!showAll && hasMore && !loading && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-xs text-slate-400">Showing 10 of {grouped.length} styles</span>
          <button onClick={() => setShowAll(true)}
            className="text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline">
            Show all {grouped.length} →
          </button>
        </div>
      )}
      {showAll && grouped.length > 10 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-xs text-slate-400">Showing all {grouped.length} styles</span>
          <button onClick={() => setShowAll(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline">
            ↑ Show recent 10
          </button>
        </div>
      )}

      {!loading && grouped.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <Palette className="mx-auto mb-3 h-12 w-12 opacity-20" />
          <p>{isFiltered ? 'No styles match your filters.' : 'No sample styles yet.'}</p>
        </div>
      )}

      {/* ── CLIENT APPROVE CONFIRMATION MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {approveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={() => setApproveModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-xl bg-emerald-100 p-2.5"><CheckCircle2 className="h-5 w-5 text-emerald-700" /></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mark as Client Approved?</h3>
                  <p className="text-xs text-slate-500">No more revisions can be added after this.</p>
                </div>
              </div>

              {/* Style info + image */}
              <div className="mb-5 flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {approveModal.imagePath && (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                    <StyleImage imagePath={approveModal.imagePath} alt={approveModal.styleNo} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{approveModal.styleNo} — {approveModal.component}</p>
                  <p className="text-sm text-slate-500">{approveModal.customer} · {approveModal.bodyColour}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="text-slate-400">Print: <span className="font-semibold text-slate-600">{approveModal.printColour}</span></span>
                    <span className="text-slate-400">Season: <span className="font-semibold text-slate-600">{approveModal.season}</span></span>
                  </div>
                </div>
              </div>

              {/* Latest revision */}
              {approveModal.revisions.length > 0 && (() => {
                const latest = approveModal.revisions[approveModal.revisions.length - 1];
                return (
                  <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-indigo-500">Latest — Revision {latest.revisionNo}</p>
                    <p className="text-sm text-slate-700">{latest.comment}</p>
                  </div>
                );
              })()}

              {approveModal.revisions.length === 0 && (
                <p className="mb-5 text-sm text-slate-500 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                  No revisions recorded — style approved without client feedback.
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setApproveModal(null)} disabled={isApproving}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={() => doToggleApprove(approveModal.id)} disabled={isApproving}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {isApproving ? 'Saving…' : 'Confirm Approval'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUBMIT TO ADMIN MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {submitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={() => setSubmitModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                <div className="rounded-xl bg-indigo-100 p-2.5"><Building2 className="h-5 w-5 text-indigo-700" /></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit to Admin</h3>
                  <p className="text-xs text-slate-500">Review the style and fill in bulk details.</p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">

                {/* Style card with image */}
                <div className="flex gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-emerald-200 shadow-sm">
                    <StyleImage imagePath={submitModal.imagePath} alt={submitModal.styleNo} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-emerald-800 text-sm">Client Approved</span>
                    </div>
                    <p className="font-bold text-slate-800">{submitModal.styleNo} — {submitModal.component}</p>
                    <p className="text-sm text-slate-500">{submitModal.customer}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span>Body: <span className="font-semibold text-slate-700">{submitModal.bodyColour}</span></span>
                      <span>Print: <span className="font-semibold text-slate-700">{submitModal.printColour}</span></span>
                      <span>Season: <span className="font-semibold text-slate-700">{submitModal.season}</span></span>
                    </div>
                  </div>
                </div>

                {/* Revision summary */}
                {submitModal.revisions.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <GitBranch className="mr-1 inline h-3 w-3" />Revision History ({submitModal.revisions.length})
                    </p>
                    {submitModal.revisions.map((rev: SampleStyleRevision) => (
                      <div key={rev.id} className="flex gap-2 items-start">
                        <span className="flex-shrink-0 mt-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black w-4 h-4 flex items-center justify-center">
                          {rev.revisionNo}
                        </span>
                        <p className="text-xs text-slate-600">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submission fields */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">
                      <Calendar className="mr-1 inline h-3 w-3" />RA Meeting Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={rcMeetingDate} onChange={e => setRcMeetingDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Board Set</label>
                    <input type="text" value={boardSet} onChange={e => setBoardSet(e.target.value)}
                      placeholder="e.g. BS-001"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">
                      Bulk Qty <span className="text-red-500">*</span>
                    </label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*"
                      value={bulkQty} onChange={e => setBulkQty(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 1000"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Developer Notes (optional)</label>
                    <textarea value={devComments} onChange={e => setDevComments(e.target.value)}
                      placeholder="Any notes for the admin…" rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  </div>
                </div>

                {submitError && (
                  <p className="text-xs text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <AlertCircle className="mr-1 inline h-3 w-3" />{submitError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setSubmitModal(null); setSubmitError(''); }}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button onClick={handleSubmitToAdmin}
                    disabled={isSubmitting || !rcMeetingDate || !bulkQty}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {isSubmitting ? 'Submitting…' : 'Submit to Admin'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}