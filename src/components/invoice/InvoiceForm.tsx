import { FormEvent } from 'react';
import {
  CirclePlus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  TaxInvoiceItemInput,
  TaxInvoicePayload,
  createBlankInvoiceItem,
} from '../../types/invoice';

interface InvoiceFormProps {
  value: TaxInvoicePayload;
  onChange: (value: TaxInvoicePayload) => void;
  onSubmit: () => Promise<void> | void;
  submitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

const inputClass =
  'w-full border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:bg-blue-50/50';

const labelClass =
  'block text-[10px] font-bold uppercase tracking-wider text-slate-500';

function LabeledField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      />
    </label>
  );
}

export default function InvoiceForm({
  value,
  onChange,
  onSubmit,
  submitting = false,
  submitLabel = 'Save Tax Invoice',
  onCancel,
}: InvoiceFormProps) {
  const updateField = (
    field: keyof TaxInvoicePayload,
    fieldValue: string
  ) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  const updateItem = (
    index: number,
    field: keyof TaxInvoiceItemInput,
    fieldValue: string
  ) => {
    const items = value.items.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, [field]: fieldValue }
        : item
    );

    onChange({ ...value, items });
  };

  const addRow = () => {
    onChange({
      ...value,
      items: [...value.items, createBlankInvoiceItem()],
    });
  };

  const removeRow = (index: number) => {
    if (value.items.length <= 1) return;

    onChange({
      ...value,
      items: value.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
        <div className="border-b-2 border-slate-700 px-5 py-4 text-center">
          <h2 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">
            Tax Invoice
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            All values, including quantities and totals, are entered manually.
          </p>
        </div>

        <div className="grid grid-cols-1 border-b border-slate-300 md:grid-cols-2">
          <div className="border-b border-slate-300 p-4 md:border-b-0 md:border-r">
            <LabeledField
              label="Date of Invoice"
              type="date"
              value={value.invoiceDate}
              onChange={(next) =>
                updateField('invoiceDate', next)
              }
            />
          </div>

          <div className="p-4">
            <LabeledField
              label="Tax Invoice No."
              value={value.invoiceNumber}
              onChange={(next) =>
                updateField('invoiceNumber', next)
              }
              placeholder="Enter invoice number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 border-b border-slate-300 lg:grid-cols-2">
          <section className="border-b border-slate-300 lg:border-b-0 lg:border-r">
            <div className="bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700">
              Supplier Details
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <LabeledField
                label="Supplier's TIN"
                value={value.supplierTin}
                onChange={(next) =>
                  updateField('supplierTin', next)
                }
              />

              <LabeledField
                label="Telephone No."
                value={value.supplierTelephone}
                onChange={(next) =>
                  updateField('supplierTelephone', next)
                }
              />

              <div className="sm:col-span-2">
                <LabeledField
                  label="Supplier's Name"
                  value={value.supplierName}
                  onChange={(next) =>
                    updateField('supplierName', next)
                  }
                />
              </div>

              <label className="block space-y-1 sm:col-span-2">
                <span className={labelClass}>
                  Supplier's Address
                </span>
                <textarea
                  rows={3}
                  value={value.supplierAddress}
                  onChange={(event) =>
                    updateField(
                      'supplierAddress',
                      event.target.value
                    )
                  }
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </label>
            </div>
          </section>

          <section>
            <div className="bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700">
              Purchaser Details
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <LabeledField
                label="Purchaser's TIN"
                value={value.purchaserTin}
                onChange={(next) =>
                  updateField('purchaserTin', next)
                }
              />

              <LabeledField
                label="Telephone No."
                value={value.purchaserTelephone}
                onChange={(next) =>
                  updateField('purchaserTelephone', next)
                }
              />

              <div className="sm:col-span-2">
                <LabeledField
                  label="Purchaser's Name"
                  value={value.purchaserName}
                  onChange={(next) =>
                    updateField('purchaserName', next)
                  }
                />
              </div>

              <label className="block space-y-1 sm:col-span-2">
                <span className={labelClass}>
                  Purchaser's Address
                </span>
                <textarea
                  rows={3}
                  value={value.purchaserAddress}
                  onChange={(event) =>
                    updateField(
                      'purchaserAddress',
                      event.target.value
                    )
                  }
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </label>
            </div>
          </section>
        </div>

        <div className="grid gap-3 border-b border-slate-300 p-4 md:grid-cols-2">
          <LabeledField
            label="Date of Delivery"
            type="date"
            value={value.deliveryDate}
            onChange={(next) =>
              updateField('deliveryDate', next)
            }
          />

          <LabeledField
            label="Place of Supply"
            value={value.placeOfSupply}
            onChange={(next) =>
              updateField('placeOfSupply', next)
            }
          />

          <label className="block space-y-1 md:col-span-2">
            <span className={labelClass}>
              Additional Information
            </span>
            <textarea
              rows={2}
              value={value.additionalInformation}
              onChange={(event) =>
                updateField(
                  'additionalInformation',
                  event.target.value
                )
              }
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-225 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="w-12 border-r border-slate-600 px-2 py-3 text-center text-[10px] uppercase">
                  No.
                </th>
                <th className="w-36 border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                  Reference
                </th>
                <th className="border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                  Description of Goods or Services
                </th>
                <th className="w-28 border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                  Quantity
                </th>
                <th className="w-36 border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                  Unit Price
                </th>
                <th className="w-48 border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                  Amount Excluding VAT (Rs.)
                </th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>

            <tbody>
              {value.items.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="border-b border-slate-300"
                >
                  <td className="border-r border-slate-300 text-center text-xs font-bold text-slate-500">
                    {index + 1}
                  </td>

                  <td className="border-r border-slate-300">
                    <input
                      value={item.reference}
                      onChange={(event) =>
                        updateItem(
                          index,
                          'reference',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className="border-r border-slate-300">
                    <input
                      value={item.description}
                      onChange={(event) =>
                        updateItem(
                          index,
                          'description',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className="border-r border-slate-300">
                    <input
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(
                          index,
                          'quantity',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className="border-r border-slate-300">
                    <input
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(
                          index,
                          'unitPrice',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className="border-r border-slate-300">
                    <input
                      value={item.amountExcludingVat}
                      onChange={(event) =>
                        updateItem(
                          index,
                          'amountExcludingVat',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={value.items.length <= 1}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-b border-slate-300 p-3">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            <CirclePlus className="h-4 w-4" />
            Add Invoice Row
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="border-b border-slate-300 p-4 lg:border-b-0 lg:border-r">
            <label className="block space-y-1">
              <span className={labelClass}>
                Total Amount in Words
              </span>
              <textarea
                rows={3}
                value={value.totalAmountInWords}
                onChange={(event) =>
                  updateField(
                    'totalAmountInWords',
                    event.target.value
                  )
                }
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </label>

            <div className="mt-3">
              <LabeledField
                label="Mode of Payment"
                value={value.modeOfPayment}
                onChange={(next) =>
                  updateField('modeOfPayment', next)
                }
              />
            </div>
          </div>

          <div className="divide-y divide-slate-300">
            {[
              {
                label: 'Total Value of Supply',
                field: 'totalValueOfSupply' as const,
              },
              {
                label: 'VAT Amount',
                field: 'vatAmount' as const,
              },
              {
                label: 'Total Amount Including VAT',
                field: 'totalAmountIncludingVat' as const,
              },
            ].map(({ label, field }) => (
              <label
                key={field}
                className="grid grid-cols-[1fr_180px] items-center"
              >
                <span className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                  {label}
                </span>
                <input
                  value={value[field]}
                  onChange={(event) =>
                    updateField(field, event.target.value)
                  }
                  className="h-full border-l border-slate-300 px-3 py-3 text-right text-sm font-bold outline-none focus:bg-blue-50"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}