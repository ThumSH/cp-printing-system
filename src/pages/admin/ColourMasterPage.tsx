// src/pages/admin/ColourMasterPage.tsx
// Accessible by: Admin (full CRUD) and Developer (view + add only)
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Plus, Edit2, Trash2, CheckCircle2, XCircle,
  AlertCircle, Loader2, RefreshCw, Info, Eye, EyeOff, X,
} from 'lucide-react';
import { useColourMasterStore } from '../../store/colourMasterStore';
import {
  validateColourName,
  COLOUR_FORMAT_HINT,
  COLOUR_FORMAT_RULES,
} from '../../utils/colourNameValidation';
import { useAuthStore } from '../../store/authStore'; // adjust import path as needed

// ── helpers ───────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', hexCode: '#cccccc', sortOrder: 0, isActive: true };

function ColourSwatch({ hex }: { hex?: string }) {
  if (!hex) return <div className="w-5 h-5 rounded-full border border-slate-300 bg-slate-100" title="No swatch" />;
  return (
    <div
      className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
      style={{ backgroundColor: hex }}
      title={hex}
    />
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ColourMasterPage() {
  const { colours, loading, refreshing, fetchColours, addColour, updateColour, deleteColour, toggleActive } =
    useColourMasterStore();
  const { user } = useAuthStore();          // to check role
  const isAdmin = user?.role === 'Admin';

  const [showInactive, setShowInactive] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFormatHelp, setShowFormatHelp] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addNameError, setAddNameError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addServerError, setAddServerError] = useState('');

  // Edit state (admin only)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editNameError, setEditNameError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editServerError, setEditServerError] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchColours(); }, [fetchColours]);

  // ── filtered list ──────────────────────────────────────────────────────────
  const displayed = showInactive ? colours : colours.filter((c) => c.isActive);

  // ── add handlers ───────────────────────────────────────────────────────────
  const handleAddNameChange = (val: string) => {
    setAddForm((p) => ({ ...p, name: val }));
    setAddNameError(val.trim() ? validateColourName(val) || '' : '');
    setAddServerError('');
  };

  const handleAddSubmit = async () => {
    const err = validateColourName(addForm.name);
    if (err) { setAddNameError(err); return; }
    setAddSubmitting(true); setAddServerError('');
    try {
      await addColour(addForm.name.trim(), addForm.hexCode !== '#cccccc' ? addForm.hexCode : undefined);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      setShowFormatHelp(false);
    } catch (e) {
      setAddServerError(e instanceof Error ? e.message : 'Failed to add colour');
    } finally {
      setAddSubmitting(false);
    }
  };

  // ── edit handlers (admin only) ─────────────────────────────────────────────
  const startEdit = (id: string) => {
    const c = colours.find((x) => x.id === id)!;
    setEditForm({ name: c.name, hexCode: c.hexCode || '#cccccc', sortOrder: c.sortOrder, isActive: c.isActive });
    setEditNameError(''); setEditServerError('');
    setEditingId(id);
  };

  const handleEditNameChange = (val: string) => {
    setEditForm((p) => ({ ...p, name: val }));
    setEditNameError(val.trim() ? validateColourName(val) || '' : '');
    setEditServerError('');
  };

  const handleEditSubmit = async (id: string) => {
    const err = validateColourName(editForm.name);
    if (err) { setEditNameError(err); return; }
    setEditSubmitting(true); setEditServerError('');
    try {
      await updateColour(id, {
        name: editForm.name.trim(),
        hexCode: editForm.hexCode !== '#cccccc' ? editForm.hexCode : undefined,
        sortOrder: editForm.sortOrder,
        isActive: editForm.isActive,
      });
      setEditingId(null);
    } catch (e) {
      setEditServerError(e instanceof Error ? e.message : 'Failed to update colour');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── delete (admin only) ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try { await deleteColour(id); } catch (e) { alert('Failed to delete colour'); }
    setDeletingId(null);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Palette className="w-6 h-6 text-indigo-700" /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Colour Master</h2>
            <p className="text-slate-500 text-sm">
              {isAdmin ? 'Manage the approved colour list used across all development jobs.' : 'View and add colours to the approved list.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Subtle refresh indicator */}
          {refreshing && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <RefreshCw className="w-3 h-3 animate-spin" /> Refreshing…
            </span>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowInactive((p) => !p)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
            >
              {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </button>
          )}
          <button
            onClick={() => { setShowAddForm((p) => !p); setShowFormatHelp(false); setAddForm(EMPTY_FORM); setAddNameError(''); setAddServerError(''); }}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Colour
          </button>
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-indigo-800">New Colour Entry</p>
                <button
                  onClick={() => setShowFormatHelp((p) => !p)}
                  className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700"
                >
                  <Info className="w-3 h-3" /> Format guide
                </button>
              </div>

              {/* Format guide */}
              <AnimatePresence>
                {showFormatHelp && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-lg border border-indigo-200 bg-white px-4 py-3 space-y-2">
                      <p className="text-xs font-bold text-slate-700">Required format:</p>
                      <code className="block text-xs font-mono bg-slate-100 px-2 py-1 rounded text-indigo-700">
                        CODE-#-Name
                      </code>
                      <ul className="space-y-0.5">
                        {COLOUR_FORMAT_RULES.map((r, i) => (
                          <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1">
                            <span className="text-indigo-400 font-bold shrink-0">•</span> {r}
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-slate-100 pt-2">
                        <p className="text-[11px] font-semibold text-slate-600 mb-1">Click to use example:</p>
                        <div className="flex flex-wrap gap-2">
                          {['R-1-Bright Red', 'N-4-Navy Blue', 'GR-2-Grey Melange', 'W-1-White'].map((ex) => (
                            <button key={ex} type="button"
                              onClick={() => handleAddNameChange(ex)}
                              className="text-[11px] font-mono text-indigo-600 hover:text-indigo-800 hover:underline">
                              {ex}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row gap-3 items-start">
                {/* Name input */}
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => handleAddNameChange(e.target.value)}
                    placeholder='e.g. R-1-Bright Red'
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubmit(); } }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
                      addNameError
                        ? 'border-red-400 bg-red-50 focus:ring-1 focus:ring-red-400'
                        : addForm.name && !addNameError
                          ? 'border-emerald-400 bg-emerald-50 focus:ring-1 focus:ring-emerald-400'
                          : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  {addForm.name && addNameError && (
                    <p className="text-[11px] text-red-600 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {addNameError}
                    </p>
                  )}
                  {addForm.name && !addNameError && (
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Valid format
                    </p>
                  )}
                  {!addForm.name && (
                    <p className="text-[11px] text-slate-400">{COLOUR_FORMAT_HINT}</p>
                  )}
                  {addServerError && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {addServerError}
                    </p>
                  )}
                </div>

                {/* Sort order (admin only) */}
                {isAdmin && (
                  <div className="space-y-1 w-28">
                    <input
                      type="number"
                      value={addForm.sortOrder}
                      onChange={(e) => setAddForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Sort order"
                    />
                    <p className="text-[11px] text-slate-400">Sort order</p>
                  </div>
                )}

                {/* Colour swatch */}
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="color"
                    value={addForm.hexCode}
                    onChange={(e) => setAddForm((p) => ({ ...p, hexCode: e.target.value }))}
                    title="Optional swatch colour"
                    className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] text-slate-400">Swatch</span>
                </div>

                <button
                  onClick={handleAddSubmit}
                  disabled={addSubmitting || !!addNameError || !addForm.name.trim()}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm self-start"
                >
                  {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {addSubmitting ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          // First-time load only — no data yet
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading colours…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Palette className="w-10 h-10 opacity-30" />
            <p className="text-sm">No colours yet. Add the first one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-semibold w-12">#</th>
                <th className="px-5 py-3 font-semibold">Swatch</th>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Hex</th>
                {isAdmin && <th className="px-5 py-3 font-semibold">Sort</th>}
                <th className="px-5 py-3 font-semibold">Status</th>
                {isAdmin && <th className="px-5 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {displayed.map((colour, idx) => (
                  <motion.tr
                    key={colour.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`hover:bg-slate-50 transition-colors ${!colour.isActive ? 'opacity-50' : ''}`}
                  >
                    {editingId === colour.id ? (
                      // ── EDIT ROW (admin only) ────────────────────────────
                      <>
                        <td className="px-5 py-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-5 py-3">
                          <input type="color" value={editForm.hexCode}
                            onChange={(e) => setEditForm((p) => ({ ...p, hexCode: e.target.value }))}
                            className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5" />
                        </td>
                        <td className="px-5 py-3" colSpan={2}>
                          <div className="space-y-1">
                            <input type="text" value={editForm.name}
                              onChange={(e) => handleEditNameChange(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit(colour.id); if (e.key === 'Escape') setEditingId(null); }}
                              className={`w-full rounded border px-3 py-1.5 text-sm outline-none transition-all ${
                                editNameError
                                  ? 'border-red-400 bg-red-50'
                                  : editForm.name && !editNameError
                                    ? 'border-emerald-400 bg-emerald-50'
                                    : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                              }`}
                              autoFocus
                            />
                            {editNameError && (
                              <p className="text-[11px] text-red-600 flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {editNameError}
                              </p>
                            )}
                            {editForm.name && !editNameError && (
                              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Valid format
                              </p>
                            )}
                            {editServerError && (
                              <p className="text-[11px] text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {editServerError}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" value={editForm.sortOrder}
                            onChange={(e) => setEditForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                            className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        </td>
                        <td className="px-5 py-3">
                          <select value={editForm.isActive ? 'active' : 'inactive'}
                            onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === 'active' }))}
                            className="rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right space-x-1">
                          <button onClick={() => handleEditSubmit(colour.id)}
                            disabled={editSubmitting || !!editNameError || !editForm.name.trim()}
                            className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                            {editSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 border border-slate-300 text-slate-600 text-xs px-3 py-1.5 rounded hover:bg-slate-50 transition-colors">
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      // ── READ ROW ─────────────────────────────────────────
                      <>
                        <td className="px-5 py-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-5 py-3"><ColourSwatch hex={colour.hexCode} /></td>
                        <td className="px-5 py-3 font-medium text-slate-900">{colour.name}</td>
                        <td className="px-5 py-3 text-slate-400 font-mono text-xs">{colour.hexCode || '—'}</td>
                        {isAdmin && <td className="px-5 py-3 text-slate-500">{colour.sortOrder}</td>}
                        <td className="px-5 py-3">
                          {colour.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-full border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3 text-right space-x-1">
                            <button onClick={() => startEdit(colour.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => toggleActive(colour.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title={colour.isActive ? 'Deactivate' : 'Activate'}>
                              {colour.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            {deletingId === colour.id ? (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                Sure?
                                <button onClick={() => handleDelete(colour.id)} className="font-bold hover:underline">Yes</button>
                                <button onClick={() => setDeletingId(null)} className="text-slate-400 hover:underline">No</button>
                              </span>
                            ) : (
                              <button onClick={() => setDeletingId(colour.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 text-right">{colours.filter(c => c.isActive).length} active colour{colours.filter(c => c.isActive).length !== 1 ? 's' : ''}</p>
    </motion.div>
  );
}