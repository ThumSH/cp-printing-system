// src/pages/development/DevelopmentPage.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Upload, Plus, Trash2, Edit2, CheckCircle2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';

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

export default function DevelopmentPage() {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const { jobs: submissions, addJob, updateJob, deleteJob } = useDevelopmentStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // NEW: State to hold our validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear the specific error when the user starts typing again
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckboxChange = (placement: string) => {
    setFormData((prev) => {
      const isSelected = prev.placements.includes(placement);
      return {
        ...prev,
        placements: isSelected
          ? prev.placements.filter((p) => p !== placement)
          : [...prev.placements, placement],
      };
    });
    if (errors.placements) setErrors((prev) => ({ ...prev, placements: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ 
        ...prev, 
        artworkFileName: file.name,
        artworkPreviewUrl: previewUrl 
      }));
      if (errors.artwork) setErrors((prev) => ({ ...prev, artwork: '' }));
    }
  };

  // NEW: The core validation engine
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Check basic text fields
    if (!formData.customer.trim()) newErrors.customer = 'Customer name is required';
    if (!formData.styleNo.trim()) newErrors.styleNo = 'Style number is required';
    if (!formData.season.trim()) newErrors.season = 'Season is required';
    if (!formData.printingTechnique.trim()) newErrors.printingTechnique = 'Printing technique is required';
    if (!formData.washingStandard.trim()) newErrors.washingStandard = 'Washing standard is required';
    if (!formData.bodyColour.trim()) newErrors.bodyColour = 'Body colour is required';
    if (!formData.printColour.trim()) newErrors.printColour = 'Print colours are required';

    // 2. Validate Numbers
    const qty = parseInt(formData.printColourQty);
    if (!formData.printColourQty || isNaN(qty) || qty < 1) {
      newErrors.printColourQty = 'Must be at least 1';
    }

    // 3. Validate Dates
    if (!formData.sampleOrderedDate) newErrors.sampleOrderedDate = 'Order date is required';
    if (!formData.sampleDeliveryDate) {
      newErrors.sampleDeliveryDate = 'Delivery date is required';
    } else if (formData.sampleOrderedDate && formData.sampleDeliveryDate) {
      const orderDate = new Date(formData.sampleOrderedDate);
      const deliveryDate = new Date(formData.sampleDeliveryDate);
      if (deliveryDate < orderDate) {
        newErrors.sampleDeliveryDate = 'Delivery cannot be before order date';
      }
    }

    // 4. Validate Attachments & Arrays
    if (!formData.artworkPreviewUrl) {
      newErrors.artwork = 'Artwork attachment is required';
    }
    if (formData.placements.length === 0) {
      newErrors.placements = 'Select at least one placement';
    }

    setErrors(newErrors);
    
    // If the object has no keys, there are no errors (returns true)
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    if (editingId) {
      updateJob(editingId, { ...formData, id: editingId } as any);
      setEditingId(null);
    } else {
      addJob({ ...formData, id: Math.random().toString(36).substr(2, 9) } as any);
    }
    setFormData(INITIAL_FORM_STATE);
  };

  const handleEdit = (submission: DevelopmentForm) => {
    setFormData(submission);
    setEditingId(submission.id);
    setErrors({}); // Clear any existing errors when entering edit mode
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this development record?')) {
      deleteJob(id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      
      {/* HEADER */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Code className="w-6 h-6 text-indigo-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Development Workspace</h2>
          <p className="text-slate-500 text-sm">Create and manage new print formulas, screens, and artwork.</p>
        </div>
      </div>

      {/* FORM SECTION */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">
            {editingId ? 'Edit Development Job' : 'New Development Job'}
          </h3>
          {editingId && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full animate-pulse">
              EDIT MODE ACTIVE
            </span>
          )}
        </div>

        {/* Removed generic browser 'required' tags to use our custom validation engine */}
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Standard Text Inputs */}
            {[
              { label: 'Customer', name: 'customer', type: 'text', placeholder: 'e.g. Nike' },
              { label: 'Style No', name: 'styleNo', type: 'text', placeholder: 'e.g. NK-2026-X' },
              { label: 'Season', name: 'season', type: 'text', placeholder: 'e.g. Summer 26' },
              { label: 'Printing Technique', name: 'printingTechnique', type: 'text', placeholder: 'e.g. High Density' },
              { label: 'Washing Standard', name: 'washingStandard', type: 'text', placeholder: 'e.g. 40°C Machine Wash' },
              { label: 'Body Colour', name: 'bodyColour', type: 'text', placeholder: 'e.g. Navy Blue' },
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
                  <input
                    type={field.type}
                    name={field.name}
                    value={(formData as any)[field.name]}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm ${
                      errors[field.name] 
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50' 
                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600'
                    }`}
                  />
                  {/* Validation Error Message */}
                  {errors[field.name] && (
                    <div className="absolute -bottom-5 left-0 flex items-center text-[11px] text-red-600 font-medium">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors[field.name]}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* FILE UPLOAD WITH VALIDATION */}
            <div className="space-y-1 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Artwork Attachment <span className="text-red-500">*</span>
              </label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors relative overflow-hidden ${
                errors.artwork ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:bg-slate-50'
              }`}>
                {formData.artworkPreviewUrl ? (
                  <div className="flex flex-col items-center">
                    <img src={formData.artworkPreviewUrl} alt="Preview" className="h-24 object-contain mb-2 rounded border border-slate-200 shadow-sm" />
                    <label className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      <span>Change File</span>
                      <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    <Upload className={`mx-auto h-8 w-8 ${errors.artwork ? 'text-red-400' : 'text-slate-400'}`} />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                        <span>Upload an image</span>
                        <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className={`text-xs ${errors.artwork ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      {errors.artwork || 'PNG, JPG up to 10MB'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CHECKBOX SECTION WITH VALIDATION */}
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
                    formData.placements.includes(placement) 
                      ? 'bg-indigo-600 border-indigo-600' 
                      : errors.placements 
                        ? 'border-red-400 bg-white' 
                        : 'border-slate-300 group-hover:border-indigo-400'
                  }`}>
                    {formData.placements.includes(placement) && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-sm text-slate-700 font-medium select-none">{placement}</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.placements.includes(placement)}
                    onChange={() => handleCheckboxChange(placement)}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 space-x-3">
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setFormData(INITIAL_FORM_STATE); setErrors({}); }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center shadow-sm"
            >
              {editingId ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {editingId ? 'Update Submission' : 'Submit Development'}
            </button>
          </div>
        </form>
      </div>

      {/* SUMMARY TABLE (Remains unchanged) */}
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
                  {submissions.map((sub) => (
                    <motion.tr 
                      key={sub.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {sub.artworkPreviewUrl ? (
                          <img src={sub.artworkPreviewUrl} alt="Artwork" className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 rounded-lg border flex items-center justify-center"><ImageIcon className="w-6 h-6 opacity-50" /></div>
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
                          {sub.placements.map(p => <span key={p} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-medium border border-indigo-100">{p}</span>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs space-y-1">
                        <p>Ord: <span className="font-medium text-slate-900">{sub.sampleOrderedDate}</span></p>
                        <p>Del: <span className="font-medium text-slate-900">{sub.sampleDeliveryDate}</span></p>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEdit(sub)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(sub.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}