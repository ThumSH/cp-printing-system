// src/pages/development/DevelopmentPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code, Upload, Plus, Trash2, Edit2, CheckCircle2,
  Image as ImageIcon, AlertCircle, Loader2, X,
} from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';
import { useColourMasterStore } from '../../store/colourMasterStore';
import { API, getAuthHeaders } from '../../api/client';

interface DevelopmentForm {
  id: string;
  customer: string;
  styleNo: string;
  season: string;
  printingTechnique: string;
  artworkFileName: string;
  artworkPreviewUrl: string; // server path e.g. /uploads/artworks/artwork_123.png
  washingStandard: string;
  bodyColour: string;
  printColour: string;
  printColourQty: string;
  sampleOrderedDate: string;
  sampleDeliveryDate: string;
  placements: string[];
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
  placements: [],
};

const PLACEMENT_OPTIONS = ['Front', 'Back', 'Sleeve', 'Pocket', 'Waistband', 'Other'];

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
                  placeholder="e.g. R-1 — Bright Red"
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
              <p className="text-[10px] text-slate-400">Tip: use a code + description format, e.g. "N-4 — Navy Blue"</p>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DevelopmentPage() {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const { jobs: submissions, addJob, updateJob, deleteJob, fetchData } = useDevelopmentStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Artwork state — keep the File object so we can upload it
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  // Local blob URL for preview only (not saved — we upload to server on submit)
  const [artworkBlobUrl, setArtworkBlobUrl] = useState('');
  const [uploadingArtwork, setUploadingArtwork] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleBodyColourChange = (value: string) => {
    setFormData((prev) => ({ ...prev, bodyColour: value }));
    if (errors.bodyColour) setErrors((prev) => ({ ...prev, bodyColour: '' }));
  };

  const handleCheckboxChange = (placement: string) => {
    setFormData((prev) => {
      const isSelected = prev.placements.includes(placement);
      return { ...prev, placements: isSelected ? prev.placements.filter(p => p !== placement) : [...prev.placements, placement] };
    });
    if (errors.placements) setErrors((prev) => ({ ...prev, placements: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local blob URL as preview immediately
    const blob = URL.createObjectURL(file);
    setArtworkFile(file);
    setArtworkBlobUrl(blob);
    setFormData((prev) => ({ ...prev, artworkFileName: file.name, artworkPreviewUrl: '' }));
    if (errors.artwork) setErrors((prev) => ({ ...prev, artwork: '' }));
  };

  // Upload artwork to server, returns server path or throws
  const uploadArtworkToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = getAuthHeaders();
    delete (headers as any)['Content-Type'];

    const res = await fetch(`${API.BASE}/api/development/artwork`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.url; // e.g. /uploads/artworks/artwork_123.png
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.customer.trim()) newErrors.customer = 'Customer name is required';
    if (!formData.styleNo.trim()) newErrors.styleNo = 'Style number is required';
    if (!formData.season.trim()) newErrors.season = 'Season is required';
    if (!formData.printingTechnique.trim()) newErrors.printingTechnique = 'Printing technique is required';
    if (!formData.washingStandard.trim()) newErrors.washingStandard = 'Washing standard is required';
    if (!formData.bodyColour.trim()) newErrors.bodyColour = 'Body colour is required';
    if (!formData.printColour.trim()) newErrors.printColour = 'Print colours are required';
    const qty = parseInt(formData.printColourQty);
    if (!formData.printColourQty || isNaN(qty) || qty < 1) newErrors.printColourQty = 'Must be at least 1';
    if (!formData.sampleOrderedDate) newErrors.sampleOrderedDate = 'Order date is required';
    if (!formData.sampleDeliveryDate) {
      newErrors.sampleDeliveryDate = 'Delivery date is required';
    } else if (formData.sampleOrderedDate && new Date(formData.sampleDeliveryDate) < new Date(formData.sampleOrderedDate)) {
      newErrors.sampleDeliveryDate = 'Delivery cannot be before order date';
    }
    // Artwork is valid if either a new file is chosen OR an existing server URL is present
    if (!artworkFile && !formData.artworkPreviewUrl) newErrors.artwork = 'Artwork attachment is required';
    if (formData.placements.length === 0) newErrors.placements = 'Select at least one placement';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    let serverArtworkUrl = formData.artworkPreviewUrl;

    // If a new file was selected, upload it first
    if (artworkFile) {
      setUploadingArtwork(true);
      try {
        serverArtworkUrl = await uploadArtworkToServer(artworkFile);
      } catch (err) {
        setErrors((prev) => ({ ...prev, artwork: 'Failed to upload artwork. Please try again.' }));
        setUploadingArtwork(false);
        return;
      }
      setUploadingArtwork(false);
    }

    const jobData = {
      ...formData,
      artworkPreviewUrl: serverArtworkUrl, // real server path
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
  };

  const handleEdit = (submission: DevelopmentForm) => {
    setFormData(submission);
    setEditingId(submission.id);
    setArtworkFile(null);
    // Show existing server image as preview
    setArtworkBlobUrl(submission.artworkPreviewUrl ? `${API.BASE}${submission.artworkPreviewUrl}` : '');
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this development record?')) deleteJob(id);
  };

  // Preview URL: prefer blob (just picked) → server URL (existing) → nothing
  const previewUrl = artworkBlobUrl || (formData.artworkPreviewUrl ? `${API.BASE}${formData.artworkPreviewUrl}` : '');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">

      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-indigo-100 rounded-lg"><Code className="w-6 h-6 text-indigo-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Development Workspace</h2>
          <p className="text-slate-500 text-sm">Create and manage new print formulas, screens, and artwork.</p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">
            {editingId ? 'Edit Development Job' : 'New Development Job'}
          </h3>
          {editingId && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full animate-pulse">EDIT MODE ACTIVE</span>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {[
              { label: 'Customer', name: 'customer', type: 'text', placeholder: 'e.g. Nike' },
              { label: 'Style No', name: 'styleNo', type: 'text', placeholder: 'e.g. NK-2026-X' },
              { label: 'Season', name: 'season', type: 'text', placeholder: 'e.g. Summer 26' },
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
                    value={(formData as any)[field.name]} onChange={handleInputChange}
                    placeholder={field.placeholder}
                    className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm ${
                      errors[field.name]
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50'
                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600'
                    }`}
                  />
                  {errors[field.name] && (
                    <div className="absolute -bottom-5 left-0 flex items-center text-[11px] text-red-600 font-medium">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors[field.name]}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Body Colour <span className="text-red-500">*</span></label>
              <ColourMasterSelect value={formData.bodyColour} onChange={handleBodyColourChange} error={errors.bodyColour} />
            </div>

            {/* ARTWORK UPLOAD */}
            <div className="space-y-1 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Artwork Attachment <span className="text-red-500">*</span>
              </label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                errors.artwork ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:bg-slate-50'
              }`}>
                {previewUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={previewUrl} alt="Preview"
                      className="h-32 object-contain rounded border border-slate-200 shadow-sm" />
                    <p className="text-xs text-slate-500 font-medium">{formData.artworkFileName}</p>
                    <label className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      <span>Change File</span>
                      <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    {uploadingArtwork ? (
                      <Loader2 className="mx-auto h-8 w-8 text-indigo-500 animate-spin" />
                    ) : (
                      <Upload className={`mx-auto h-8 w-8 ${errors.artwork ? 'text-red-400' : 'text-slate-400'}`} />
                    )}
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

          {/* PLACEMENTS */}
          <div className="pt-6 mt-4 border-t border-slate-200">
            <div className="flex items-center mb-4">
              <h4 className="text-sm font-semibold text-slate-800">Print Placement <span className="text-red-500">*</span></h4>
              {errors.placements && (
                <span className="ml-3 flex items-center text-[12px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  <AlertCircle className="w-3 h-3 mr-1" /> {errors.placements}
                </span>
              )}
            </div>
            <div className={`flex flex-wrap gap-4 p-4 rounded-lg border ${errors.placements ? 'border-red-200 bg-red-50/50' : 'border-transparent'}`}>
              {PLACEMENT_OPTIONS.map((placement) => (
                <label key={placement} className="flex items-center space-x-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    formData.placements.includes(placement) ? 'bg-indigo-600 border-indigo-600'
                      : errors.placements ? 'border-red-400 bg-white' : 'border-slate-300 group-hover:border-indigo-400'
                  }`}>
                    {formData.placements.includes(placement) && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-sm text-slate-700 font-medium select-none">{placement}</span>
                  <input type="checkbox" className="sr-only"
                    checked={formData.placements.includes(placement)}
                    onChange={() => handleCheckboxChange(placement)} />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            {editingId && (
              <button type="button"
                onClick={() => { setEditingId(null); setFormData(INITIAL_FORM_STATE); setArtworkFile(null); setArtworkBlobUrl(''); setErrors({}); }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                Cancel Edit
              </button>
            )}
            <button type="submit" disabled={uploadingArtwork}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center shadow-sm disabled:opacity-60">
              {uploadingArtwork
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading artwork…</>
                : editingId
                  ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Update Submission</>
                  : <><Plus className="w-4 h-4 mr-2" /> Submit Development</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* SUMMARY TABLE */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Recent Submissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Artwork</th>
                  <th className="px-6 py-3 font-semibold">Customer Details</th>
                  <th className="px-6 py-3 font-semibold">Garment Spec</th>
                  <th className="px-6 py-3 font-semibold">Print Spec</th>
                  <th className="px-6 py-3 font-semibold">Placements</th>
                  <th className="px-6 py-3 font-semibold">Dates (Ord / Del)</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {submissions.map((sub) => {
                    const thumbUrl = sub.artworkPreviewUrl ? `${API.BASE}${sub.artworkPreviewUrl}` : '';
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
                          <p className="text-sm text-slate-900 font-medium">{sub.bodyColour}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-30">Wash: {sub.washingStandard}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{sub.printingTechnique}</p>
                          <p className="text-xs text-slate-700 mt-0.5">{sub.printColourQty} Colors</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-30">{sub.printColour}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-40">
                            {sub.placements.map(p => (
                              <span key={p} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-medium border border-indigo-100">{p}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs space-y-1">
                          <p>Ord: <span className="font-medium text-slate-900">{sub.sampleOrderedDate}</span></p>
                          <p>Del: <span className="font-medium text-slate-900">{sub.sampleDeliveryDate}</span></p>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleEdit(sub)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(sub.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}