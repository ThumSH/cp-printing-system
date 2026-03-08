import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DevRecord } from "../types";


const emptyFormState: Omit<DevRecord, 'id'> = {
  customerName: "", styleNo: "", season: "", printTechnique: "",
  washingStandard: "", bodyColour: "", printColour: "", printColourQty: "",
  sampleOrderedDate: "", sampleDeliveryDate: "", artworkName: null,
  components: { front: false, back: false, sleeve: false, waistBand: false, pocket: false, other: false }
};

export default function DevelopmentModule() {
  const [formData, setFormData] = useState(emptyFormState);
  const [records, setRecords] = useState<DevRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Updated to handle both inputs and selects
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, components: { ...prev.components, [name]: checked } }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, artworkName: e.target.files![0].name }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setRecords(prev => prev.map(rec => rec.id === editingId ? { ...formData, id: editingId } : rec));
      setEditingId(null);
    } else {
      setRecords(prev => [...prev, { ...formData, id: Date.now().toString() }]);
    }
    setFormData(emptyFormState);
  };

  const handleEdit = (record: DevRecord) => {
    const { id, ...rest } = record;
    setFormData(rest);
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      setRecords(prev => prev.filter(rec => rec.id !== id));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold mb-6 border-b pb-4 text-cplus-dark">
          {editingId ? "Update Development Record" : "New Development Entry"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">


            {/* Standard Inputs */}
            {[
              { label: "Customer Name", name: "customerName", type: "text" },
              { label: "Style No.", name: "styleNo", type: "text", placeholder: "e.g. STY-90210" },
              { label: "Season", name: "season", type: "text", placeholder: "e.g. SS26" },
              { label: "Print Technique", name: "printTechnique", type: "text", placeholder: "e.g. High Density" },
              { label: "Washing Standard", name: "washingStandard", type: "text", placeholder: "e.g. Machine Wash Cold" },
              { label: "Body Colour", name: "bodyColour", type: "text", placeholder: "e.g. Navy Blue" },
              { label: "Print Colour", name: "printColour", type: "text", placeholder: "e.g. White, Red" },
              { label: "Print Colour Qty", name: "printColourQty", type: "number", placeholder: "e.g. 2" },
              { label: "Sample Ordered Date", name: "sampleOrderedDate", type: "date", placeholder: "" },
              { label: "Sample Delivery Date", name: "sampleDeliveryDate", type: "date", placeholder: "" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-bold text-gray-700 mb-2">{field.label}</label>
                <input 
                  type={field.type} name={field.name} required placeholder={field.placeholder}
                  value={(formData as any)[field.name]} onChange={handleInputChange}
                  className="w-full bg-gray-50 border border-gray-300 py-2.5 px-4 rounded-lg focus:bg-white focus:ring-2 focus:ring-cplus-primary transition-all text-cplus-dark"
                />
              </div>
            ))}

            {/* Artwork Attachment */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Artwork Attachment</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-white border-2 border-dashed border-gray-300 hover:border-cplus-primary py-2.5 px-6 rounded-lg text-sm font-medium text-gray-600 transition-colors">
                  Choose Image File
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                {formData.artworkName && <span className="text-sm text-green-600 font-medium">Attached: {formData.artworkName}</span>}
              </div>
            </div>
          </div>

          {/* Components Checkboxes */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-4">Components Required</label>
            <div className="flex flex-wrap gap-6">
              {Object.keys(formData.components).map((comp) => (
                <label key={comp} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" name={comp} checked={(formData.components as any)[comp]} onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-gray-300 text-cplus-primary focus:ring-cplus-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize group-hover:text-cplus-primary transition-colors">
                    {comp.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            {editingId && (
              <button type="button" onClick={() => { setFormData(emptyFormState); setEditingId(null); }} className="px-6 py-2.5 rounded-lg border border-gray-300 font-bold text-gray-600 hover:bg-gray-50">
                Cancel Edit
              </button>
            )}
            <button type="submit" className="bg-cplus-primary text-white px-8 py-2.5 rounded-lg font-bold hover:bg-sky-600 shadow-md shadow-cplus-primary/20 transition-all">
              {editingId ? "Update Record" : "Submit Data"}
            </button>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {records.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-cplus-dark">Recent Submissions</h2>
              <span className="bg-gray-200 text-gray-700 py-1 px-3 rounded-full text-xs font-bold">Total: {records.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 border-b border-gray-200">
                    <th className="p-4 font-bold">Customer / Style</th>
                    <th className="p-4 font-bold">Dates (Ord / Del)</th>
                    <th className="p-4 font-bold">Tech / Colours</th>
                    <th className="p-4 font-bold">Components</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {records.map((rec) => (
                      <motion.tr key={rec.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-cplus-dark">{rec.customerName}</div>
                          <div className="text-gray-500 text-xs">Style: {rec.styleNo} | Season: {rec.season}</div>
                        </td>
                        <td className="p-4 text-gray-600 text-xs space-y-1">
                          <div>O: {rec.sampleOrderedDate}</div>
                          <div className="font-bold text-cplus-accent">D: {rec.sampleDeliveryDate}</div>
                        </td>
                        <td className="p-4 text-gray-600 text-xs space-y-1">
                          <div>{rec.printTechnique}</div>
                          <div>Body: {rec.bodyColour} | Print: {rec.printColour} ({rec.printColourQty})</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(rec.components).map(([key, val]) => val && (
                              <span key={key} className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-3">
                          <button onClick={() => handleEdit(rec)} className="text-cplus-primary font-bold hover:underline">Edit</button>
                          <button onClick={() => handleDelete(rec.id)} className="text-cplus-secondary font-bold hover:underline">Delete</button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}