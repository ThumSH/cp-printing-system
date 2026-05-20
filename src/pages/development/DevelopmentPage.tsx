// src/pages/development/DevelopmentPage.tsx
// One DevelopmentJob = one style + one component + one body colour.
// Use "Copy from existing style" to pre-fill shared fields when adding a
// second component (e.g. Back) to a style that already has Front.
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code, Upload, Plus, Trash2, Edit2, CheckCircle2,
  Image as ImageIcon, AlertCircle, Loader2, X, Copy,
} from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';
import { useSampleStyleStore } from '../../store/sampleStyleStore';
import { useColourMasterStore } from '../../store/colourMasterStore';
import { API, getAuthHeaders } from '../../api/client';

const COMPONENT_OPTIONS = ['Front', 'Back', 'Sleeve', 'Pocket', 'Waistband', 'Other'];

interface DevelopmentForm {
  id: string;
  customer: string;
  styleNo: string;
  season: string;
  printingTechnique: string;
  artworkFileName: string;
  artworkPreviewUrl: string;
  washingStandard: string;
  bodyColour: string;
  printColour: string;
  printColourQty: string;
  sampleOrderedDate: string;
  sampleDeliveryDate: string;
  component: string;
}

const INITIAL_FORM_STATE: Omit<DevelopmentForm, 'id'> = {
  customer: '',
  styleNo: '',
  season: '',
  printingTechnique: '',
  artworkFileName: '',
  artworkPreviewUrl: '',
  washingStandard: '',
  bodyColour: '',
  printColour: '',
  printColourQty: '',
  sampleOrderedDate: '',
  sampleDeliveryDate: '',
  component: '',
};

// ── Colour Master Select ──────────────────────────────────────────────────────
function ColourMasterSelect({
  value, onChange, error,
}: { value: string; onChange: (val: string) => void; error?: string }) {
  const { colours, loading, fetchColours, addColour } = useColourMasterStore();
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => { fetchColours(); }, [fetchColours]);

  const handleAddNew = async () => {
    if (!newName.trim()) { setAddError('Name is required'); return; }
    setAdding(true); setAddError('');
    try {
      const saved = await addColour(newName.trim(), newHex.trim() || undefined);
      onChange(saved.name);
      setNewName(''); setNewHex(''); setShowAddNew(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add colour');
    } finally { setAdding(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex-1 relative">
        {value && colours.find(c => c.name === value)?.hexCode && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-300 shrink-0 z-10"
            style={{ backgroundColor: colours.find(c => c.name === value)?.hexCode || undefined }} />
        )}
        <select value={value}
          onChange={(e) => {
            if (e.target.value === '__add_new__') { setShowAddNew(true); }
            else { onChange(e.target.value); setShowAddNew(false); }
          }}
          className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm ${
            value && colours.find(c => c.name === value)?.hexCode ? 'pl-9' : ''
          } ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600'}`}
        >
          <option value="">Select body colour...</option>
          {loading && <option disabled>Loading colours...</option>}
          {colours.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          <option value="__add_new__">＋ Add new colour...</option>
        </select>
      </div>

      <AnimatePresence>
        {showAddNew && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Add New Colour</p>
              <div className="flex gap-2">
                <input type="text" value={newName}
                  onChange={(e) => { setNewName(e.target.value); setAddError(''); }}
                  placeholder="e.g. R-1-Bright Red"
                  className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') setShowAddNew(false); }}
                />
                <input type="color" value={newHex || '#ffffff'} onChange={(e) => setNewHex(e.target.value)}
                  className="w-10 h-9 rounded border border-slate-300 cursor-pointer p-0.5" />
                <button type="button" onClick={handleAddNew} disabled={adding}
                  className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  {adding ? 'Adding...' : 'Add'}
                </button>
                <button type="button" onClick={() => { setShowAddNew(false); setNewName(''); setNewHex(''); setAddError(''); }}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {addError && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{addError}</p>}
              <p className="text-[10px] text-slate-400">Format: CODE-#-Name e.g. "R-1-Bright Red" or "N-4-Navy Blue"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && !showAddNew && (
        <div className="flex items-center text-[11px] text-red-600 font-medium">
          <AlertCircle className="w-3 h-3 mr-1" /> {error}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function DevelopmentPage() {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const { jobs: submissions, addJob, updateJob, deleteJob, fetchData } = useDevelopmentStore();
  const { styles: sampleStyles, fetchStyles } = useSampleStyleStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Table filter/pagination
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterComponent, setFilterComponent] = useState('');

  // Copy-from feature
  const [copyFromId, setCopyFromId] = useState('');
  const [copyApplied, setCopyApplied] = useState(false);

  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkBlobUrl, setArtworkBlobUrl] = useState('');
  const [uploadingArtwork, setUploadingArtwork] = useState(false);

  useEffect(() => { fetchData(); fetchStyles(true); }, []);

  // Unique styles for the copy-from dropdown
  // Group by StyleNo + Customer to avoid duplicates
  const uniqueStyleOptions = useMemo(() => {
    const seen = new Set<string>();
    return submissions.filter(s => {
      const key = `${s.styleNo}||${s.customer}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [submissions]);

  const handleCopyFrom = (jobId: string) => {
    setCopyFromId(jobId);
    if (!jobId) { setCopyApplied(false); return; }

    const source = submissions.find(s => s.id === jobId);
    if (!source) return;

    // Copy all shared fields — leave component and bodyColour blank for user to fill
    setFormData({
      ...INITIAL_FORM_STATE,
      customer:          source.customer,
      styleNo:           source.styleNo,
      season:            source.season,
      printingTechnique: source.printingTechnique,
      washingStandard:   source.washingStandard,
      printColour:       source.printColour,
      printColourQty:    source.printColourQty,
      sampleOrderedDate: source.sampleOrderedDate,
      sampleDeliveryDate: source.sampleDeliveryDate,
      artworkFileName:   source.artworkFileName,
      artworkPreviewUrl: source.artworkPreviewUrl,
      // bodyColour and component intentionally left blank
      bodyColour: '',
      component:  '',
    });

    // Restore artwork preview from server URL
    setArtworkBlobUrl(source.artworkPreviewUrl
      ? source.artworkPreviewUrl.startsWith('http')
        ? source.artworkPreviewUrl
        : `${API.BASE}/api/development/image?path=${encodeURIComponent(source.artworkPreviewUrl)}`
      : '');
    setArtworkFile(null);
    setCopyApplied(true);
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleBodyColourChange = (value: string) => {
    setFormData((prev) => ({ ...prev, bodyColour: value }));
    if (errors.bodyColour) setErrors((prev) => ({ ...prev, bodyColour: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = URL.createObjectURL(file);
    setArtworkFile(file);
    setArtworkBlobUrl(blob);
    setFormData((prev) => ({ ...prev, artworkFileName: file.name, artworkPreviewUrl: '' }));
    if (errors.artwork) setErrors((prev) => ({ ...prev, artwork: '' }));
  };

  const uploadArtworkToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = getAuthHeaders();
    delete (headers as any)['Content-Type'];
    const res = await fetch(`${API.BASE}/api/development/artwork`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    // Store full URL so it works as a plain <img src> everywhere
    return data.url.startsWith('http') ? data.url : `${API.BASE}${data.url}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.customer.trim())          newErrors.customer          = 'Customer name is required';
    if (!formData.styleNo.trim())           newErrors.styleNo           = 'Style number is required';
    if (!formData.season.trim())            newErrors.season            = 'Season is required';
    if (!formData.printingTechnique.trim()) newErrors.printingTechnique = 'Printing technique is required';
    if (!formData.washingStandard.trim())   newErrors.washingStandard   = 'Washing standard is required';
    if (!formData.bodyColour.trim())        newErrors.bodyColour        = 'Body colour is required';
    if (!formData.printColour.trim())       newErrors.printColour       = 'Print colours are required';
    if (!formData.component)               newErrors.component          = 'Select a component for this job';
    const qty = parseInt(formData.printColourQty);
    if (!formData.printColourQty || isNaN(qty) || qty < 1) newErrors.printColourQty = 'Must be at least 1';
    if (!formData.sampleOrderedDate)        newErrors.sampleOrderedDate  = 'Order date is required';
    if (!formData.sampleDeliveryDate) {
      newErrors.sampleDeliveryDate = 'Delivery date is required';
    } else if (formData.sampleOrderedDate && new Date(formData.sampleDeliveryDate) < new Date(formData.sampleOrderedDate)) {
      newErrors.sampleDeliveryDate = 'Delivery cannot be before order date';
    }
    if (!artworkFile && !formData.artworkPreviewUrl) newErrors.artwork = 'Artwork attachment is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    let serverArtworkUrl = formData.artworkPreviewUrl;
    if (artworkFile) {
      setUploadingArtwork(true);
      try {
        serverArtworkUrl = await uploadArtworkToServer(artworkFile);
      } catch {
        setErrors((prev) => ({ ...prev, artwork: 'Failed to upload artwork. Please try again.' }));
        setUploadingArtwork(false);
        return;
      }
      setUploadingArtwork(false);
    }

    const jobData = {
      ...formData,
      artworkPreviewUrl: serverArtworkUrl,
      id: editingId ?? Math.random().toString(36).substr(2, 9),
    };

    if (editingId) {
      await updateJob(editingId, jobData as any);
      setEditingId(null);
    } else {
      await addJob(jobData as any);
    }

    setFormData(INITIAL_FORM_STATE);
    setArtworkFile(null);
    setArtworkBlobUrl('');
    setCopyFromId('');
    setCopyApplied(false);
  };

  const handleEdit = (submission: DevelopmentForm) => {
    setFormData(submission);
    setEditingId(submission.id);
    setArtworkFile(null);
    setArtworkBlobUrl(submission.artworkPreviewUrl
      ? submission.artworkPreviewUrl.startsWith('http')
        ? submission.artworkPreviewUrl
        : `${API.BASE}/api/development/image?path=${encodeURIComponent(submission.artworkPreviewUrl)}`
      : '');
    setCopyFromId('');
    setCopyApplied(false);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this development job? This cannot be undone.')) return;
    try {
      await deleteJob(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete job.');
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setEditingId(null);
    setArtworkFile(null);
    setArtworkBlobUrl('');
    setCopyFromId('');
    setCopyApplied(false);
    setErrors({});
  };

  // Build image URL — full URLs used directly; relative paths go through image endpoint
  const buildImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API.BASE}/api/development/image?path=${encodeURIComponent(path)}`;
  };
  const previewUrl = artworkBlobUrl || buildImageUrl(formData.artworkPreviewUrl);

  // A job is locked if any of its linked SampleStyles are client-approved or submitted to admin
  const isJobLocked = (jobId: string): boolean => {
    return sampleStyles.some(
      s => s.developmentJobId === jobId && (s.clientApproved || s.submittedToAdmin)
    );
  };

  // Fields that are locked when copied (shared across components of same style)
  const lockedFields = copyApplied && !editingId;

  // Filter + paginate jobs table
  const filteredJobs = useMemo(() => {
    let list = [...submissions];
    if (filterCustomer) list = list.filter(s => s.customer.toLowerCase().includes(filterCustomer.toLowerCase()));
    if (filterStyle)    list = list.filter(s => s.styleNo.toLowerCase().includes(filterStyle.toLowerCase()));
    if (filterComponent) list = list.filter(s => ((s as any).component || '').toLowerCase() === filterComponent.toLowerCase());
    return list;
  }, [submissions, filterCustomer, filterStyle, filterComponent]);

  const displayedJobs = showAllJobs ? filteredJobs : filteredJobs.slice(0, 10);
  const hasMore = filteredJobs.length > 10;
  const isFiltered = !!(filterCustomer || filterStyle || filterComponent);

  // Unique customers and components for dropdowns

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">

      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-indigo-100 rounded-lg"><Code className="w-6 h-6 text-indigo-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Development Workspace</h2>
          <p className="text-slate-500 text-sm">
            One job per component. Adding Front + Back for the same style? Use "Copy from existing style".
          </p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-slate-800">
            {editingId ? 'Edit Development Job' : 'New Development Job'}
          </h3>
          {editingId && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full animate-pulse">EDIT MODE ACTIVE</span>
          )}
        </div>

        {/* ── COPY FROM EXISTING STYLE ─────────────────────────────────────── */}
        {!editingId && submissions.length > 0 && (
          <div className={`mb-6 rounded-xl border p-4 ${copyApplied ? 'border-emerald-300 bg-emerald-50/50' : 'border-indigo-200 bg-indigo-50/40'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Copy className={`h-4 w-4 ${copyApplied ? 'text-emerald-600' : 'text-indigo-600'}`} />
              <p className="text-sm font-semibold text-slate-800">
                Adding another component to an existing style?
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Select an existing job to copy all shared fields (Style No, Customer, Season, Technique, Dates, Artwork).
              Then just pick the new <strong>Component</strong> and <strong>Body Colour</strong>.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={copyFromId}
                onChange={e => handleCopyFrom(e.target.value)}
                className="flex-1 min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a style to copy from...</option>
                {uniqueStyleOptions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.styleNo} | {s.customer} | {s.season} | {(s as any).component}
                  </option>
                ))}
              </select>
              {copyApplied && (
                <button type="button" onClick={resetForm}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
            {copyApplied && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Shared fields copied. Now select the Component and Body Colour for this new job.
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-8"
          onKeyDown={(e) => {
            // Prevent Enter key from submitting — avoids accidental duplication
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
              e.preventDefault();
            }
          }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {[
              { label: 'Customer', name: 'customer', type: 'text', placeholder: 'e.g. Boss' },
              { label: 'Style No', name: 'styleNo', type: 'text', placeholder: 'e.g. BO-9090' },
              { label: 'Season', name: 'season', type: 'text', placeholder: 'e.g. SS26' },
              { label: 'Printing Technique', name: 'printingTechnique', type: 'text', placeholder: 'e.g. High Density' },
              { label: 'Washing Standard', name: 'washingStandard', type: 'text', placeholder: 'e.g. 40°C Machine Wash' },
              { label: 'Print Colour', name: 'printColour', type: 'text', placeholder: 'e.g. White & Red' },
              { label: 'Print Colour QTY', name: 'printColourQty', type: 'number', placeholder: 'e.g. 2' },
              { label: 'Sample Ordered Date', name: 'sampleOrderedDate', type: 'date' },
              { label: 'Sample Delivery', name: 'sampleDeliveryDate', type: 'date' },
            ].map((field) => (
              <div key={field.name} className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  {field.label} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input type={field.type} name={field.name}
                    value={(formData as any)[field.name]}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    readOnly={lockedFields}
                    className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm ${
                      errors[field.name]
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50'
                        : lockedFields
                          ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600'
                    }`}
                  />
                  {lockedFields && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300" title="Copied from existing style">
                      <Copy className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {errors[field.name] && (
                    <div className="absolute -bottom-5 left-0 flex items-center text-[11px] text-red-600 font-medium">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors[field.name]}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Body Colour — always editable (changes per component) */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Body Colour <span className="text-red-500">*</span>
                {copyApplied && <span className="ml-2 text-[10px] font-normal text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Pick new colour</span>}
              </label>
              <ColourMasterSelect value={formData.bodyColour} onChange={handleBodyColourChange} error={errors.bodyColour} />
            </div>

            {/* Artwork — locked if copied (reuses existing artwork) */}
            <div className="space-y-1 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Artwork Attachment <span className="text-red-500">*</span>
                {lockedFields && previewUrl && (
                  <span className="ml-2 text-[10px] font-normal text-slate-400">Copied from existing job —
                    <button type="button" onClick={() => { setArtworkFile(null); setArtworkBlobUrl(''); setFormData(p => ({ ...p, artworkFileName: '', artworkPreviewUrl: '' })); }}
                      className="ml-1 text-indigo-600 hover:underline">change</button>
                  </span>
                )}
              </label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                errors.artwork ? 'border-red-400 bg-red-50' : lockedFields && previewUrl ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-300 hover:bg-slate-50'
              }`}>
                {previewUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={previewUrl} alt="Preview" className="h-32 object-contain rounded border border-slate-200 shadow-sm" />
                    <p className="text-xs text-slate-500 font-medium">{formData.artworkFileName}</p>
                    {!lockedFields && (
                      <label className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        <span>Change File</span>
                        <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    {uploadingArtwork
                      ? <Loader2 className="mx-auto h-8 w-8 text-indigo-500 animate-spin" />
                      : <Upload className={`mx-auto h-8 w-8 ${errors.artwork ? 'text-red-400' : 'text-slate-400'}`} />
                    }
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                        <span>{uploadingArtwork ? 'Uploading…' : 'Upload an image'}</span>
                        <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" disabled={uploadingArtwork} />
                      </label>
                      {!uploadingArtwork && <p className="pl-1">or drag and drop</p>}
                    </div>
                    <p className={`text-xs ${errors.artwork ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      {errors.artwork || 'PNG, JPG up to 10MB'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── COMPONENT SELECTOR ─────────────────────────────────────────── */}
          <div className="pt-6 mt-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-800">
                Component <span className="text-red-500">*</span>
              </h4>
              {copyApplied && (
                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                  Pick the new component for this job
                </span>
              )}
              {!copyApplied && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  One component per job — create a separate job for each additional component
                </span>
              )}
              {errors.component && (
                <span className="flex items-center text-[12px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  <AlertCircle className="w-3 h-3 mr-1" /> {errors.component}
                </span>
              )}
            </div>
            <div className={`flex flex-wrap gap-3 p-4 rounded-lg border ${errors.component ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
              {COMPONENT_OPTIONS.map((opt) => (
                <button key={opt} type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, component: opt }));
                    if (errors.component) setErrors((prev) => ({ ...prev, component: '' }));
                  }}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                    formData.component === opt
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {formData.component === opt && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                  {opt}
                </button>
              ))}
            </div>
            {formData.component && (
              <p className="mt-2 text-xs text-slate-500">
                This job covers the <span className="font-bold text-indigo-700">{formData.component}</span> component only.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            {(editingId || copyApplied) && (
              <button type="button" onClick={resetForm}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                {editingId ? 'Cancel Edit' : 'Clear Form'}
              </button>
            )}
            <button type="submit" disabled={uploadingArtwork}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center shadow-sm disabled:opacity-60">
              {uploadingArtwork
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading artwork…</>
                : editingId
                  ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Update Job</>
                  : <><Plus className="w-4 h-4 mr-2" /> Create Development Job</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* ── JOBS TABLE ───────────────────────────────────────────────────────── */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Development Jobs</h3>
                <p className="text-xs text-slate-400 mt-0.5">Each row = one component of a style. Same Style No may appear multiple times with different components.</p>
              </div>
              <span className="text-xs text-slate-400">{filteredJobs.length} record{filteredJobs.length !== 1 ? 's' : ''}</span>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text" value={filterCustomer} onChange={e => { setFilterCustomer(e.target.value); setShowAllJobs(false); }}
                placeholder="Filter by customer…"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 w-40"
              />
              <input
                type="text" value={filterStyle} onChange={e => { setFilterStyle(e.target.value); setShowAllJobs(false); }}
                placeholder="Filter by style no…"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 w-40"
              />
              <select value={filterComponent} onChange={e => { setFilterComponent(e.target.value); setShowAllJobs(false); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">All components</option>
                {COMPONENT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {isFiltered && (
                <button onClick={() => { setFilterCustomer(''); setFilterStyle(''); setFilterComponent(''); setShowAllJobs(false); }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Artwork</th>
                  <th className="px-6 py-3 font-semibold">Customer / Style</th>
                  <th className="px-6 py-3 font-semibold">Component</th>
                  <th className="px-6 py-3 font-semibold">Body Colour</th>
                  <th className="px-6 py-3 font-semibold">Print Spec</th>
                  <th className="px-6 py-3 font-semibold">Dates (Ord / Del)</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {displayedJobs.map((sub) => {
                    const thumbUrl = sub.artworkPreviewUrl
                      ? sub.artworkPreviewUrl.startsWith('http')
                        ? sub.artworkPreviewUrl
                        : `${API.BASE}/api/development/image?path=${encodeURIComponent(sub.artworkPreviewUrl)}`
                      : '';
                    return (
                      <motion.tr key={sub.id}
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          {thumbUrl ? (
                            <img src={thumbUrl} alt="Artwork" className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 rounded-lg border flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 opacity-50" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{sub.customer}</p>
                          <p className="text-xs text-slate-600 mt-0.5">Style: <span className="font-medium text-slate-800">{sub.styleNo}</span></p>
                          <p className="text-xs text-slate-600 mt-0.5">Season: <span className="font-medium text-slate-800">{sub.season}</span></p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                            {(sub as any).component || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-900 font-medium">{sub.bodyColour}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Wash: {sub.washingStandard}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{sub.printingTechnique}</p>
                          <p className="text-xs text-slate-700 mt-0.5">{sub.printColourQty} Colors</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-30">{sub.printColour}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs space-y-1">
                          <p>Ord: <span className="font-medium text-slate-900">{sub.sampleOrderedDate}</span></p>
                          <p>Del: <span className="font-medium text-slate-900">{sub.sampleDeliveryDate}</span></p>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleEdit(sub as any)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          {isJobLocked(sub.id) ? (
                            <span title="Locked: sample style is client-approved or submitted to admin"
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-400 cursor-not-allowed">
                              🔒 Locked
                            </span>
                          ) : (
                            <button onClick={() => handleDelete(sub.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="Delete this job">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {/* Show more / show less */}
          {!showAllJobs && hasMore && (
            <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-400">Showing 10 of {filteredJobs.length} jobs</span>
              <button onClick={() => setShowAllJobs(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                Show all {filteredJobs.length} →
              </button>
            </div>
          )}
          {showAllJobs && filteredJobs.length > 10 && (
            <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-400">Showing all {filteredJobs.length} jobs</span>
              <button onClick={() => setShowAllJobs(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline">
                ↑ Show recent 10
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}