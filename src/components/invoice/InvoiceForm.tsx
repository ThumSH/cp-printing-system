import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useState,
} from 'react';

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

import type {
  Customer,
} from '../../types/customer';

import {
  amountToWords,
  recalculateInvoice,
  sanitiseDecimalInput,
} from '../../utils/invoiceCalculations';

interface InvoiceFormProps {
  value: TaxInvoicePayload;
  onChange: (value: TaxInvoicePayload) => void;
  onSubmit: () => Promise<void> | void;
  customers?: Customer[];
  customersLoading?: boolean;
  submitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

const inputClass =
  'w-full border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:bg-blue-50/50';

const calculatedInputClass =
  'h-full w-full border-l border-slate-300 bg-slate-50 px-3 py-3 text-right text-sm font-bold text-slate-800 outline-none';

const labelClass =
  'block text-[10px] font-bold uppercase tracking-wider text-slate-500';

const normaliseCurrencyAmount = (
  value: string
): string =>
  value.replace(/,/g, '').trim();

const formatCurrencyAmount = (
  value: string
): string => {
  const normalised =
    normaliseCurrencyAmount(value);

  if (!normalised) {
    return '';
  }

  const parsed = Number(normalised);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const convertDollarWordsToRupees = (
  words: string
): string =>
  words
    .replace(/\bDOLLARS\b/g, 'RUPEES')
    .replace(/\bDOLLAR\b/g, 'RUPEE');

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
      <span className={labelClass}>
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      />
    </label>
  );
}

function CalendarField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>
        {label}
      </span>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      />
    </label>
  );
}

function ReviewItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-lg border border-blue-200 bg-blue-50 px-3 py-2'
          : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'
      }
    >
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p
        className={
          highlight
            ? 'mt-1 text-base font-black text-blue-800'
            : 'mt-1 text-sm font-bold text-slate-800'
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function InvoiceForm({
  value,
  onChange,
  onSubmit,
  customers = [],
  customersLoading = false,
  submitting = false,
  submitLabel = 'Save Tax Invoice',
  onCancel,
}: InvoiceFormProps) {
  const [vatModalOpen, setVatModalOpen] =
    useState(false);

  const [vatDraft, setVatDraft] =
    useState(value.vatPercentage || '18');

  const [vatError, setVatError] =
    useState('');

  const [rupeeAmount, setRupeeAmount] =
    useState('');

  const [rupeeError, setRupeeError] =
    useState('');

  const [reviewModalOpen, setReviewModalOpen] =
    useState(false);

  useEffect(() => {
    if (
      !value.totalAmountIncludingVat.trim() &&
      !value.totalAmountInWords.trim()
    ) {
      setRupeeAmount('');
      setRupeeError('');
    }
  }, [
    value.totalAmountIncludingVat,
    value.totalAmountInWords,
  ]);

  const updateField = (
    field: keyof TaxInvoicePayload,
    fieldValue: string
  ) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  const matchingCustomer =
    customers.find(
      (customer) =>
        customer.customerName ===
          value.purchaserName &&
        customer.tinNumber ===
          value.purchaserTin
    ) ??
    customers.find(
      (customer) =>
        customer.customerName ===
        value.purchaserName
    );

  const purchaserSelectValue =
    matchingCustomer?.id ??
    (value.purchaserName.trim()
      ? '__existing__'
      : '');

  const selectPurchaser = (
    customerId: string
  ) => {
    if (customerId === '__existing__') {
      return;
    }

    if (!customerId) {
      onChange({
        ...value,
        purchaserName: '',
        purchaserTin: '',
        purchaserAddress: '',
        purchaserTelephone: '',
      });

      return;
    }

    const customer = customers.find(
      (item) => item.id === customerId
    );

    if (!customer) return;

    onChange({
      ...value,
      purchaserName: customer.customerName,
      purchaserTin: customer.tinNumber,
      purchaserAddress: customer.address,
      purchaserTelephone:
        customer.telephoneNumber,
    });
  };

  const updateItem = (
    index: number,
    field: keyof TaxInvoiceItemInput,
    fieldValue: string
  ) => {
    let nextValue = fieldValue;

    if (
      field === 'quantity' ||
      field === 'unitPrice'
    ) {
      nextValue =
        sanitiseDecimalInput(fieldValue);

      // Allow the user to clear the value while
      // rejecting unsupported characters.
      if (
        fieldValue.trim() &&
        !nextValue
      ) {
        return;
      }
    }

    const items = value.items.map(
      (item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: nextValue,
            }
          : item
    );

    const nextInvoice = {
      ...value,
      items,
    };

    onChange(
      field === 'quantity' ||
        field === 'unitPrice'
        ? recalculateInvoice(nextInvoice)
        : nextInvoice
    );
  };

  const addRow = () => {
    onChange({
      ...value,
      items: [
        ...value.items,
        createBlankInvoiceItem(),
      ],
    });
  };

  const removeRow = (index: number) => {
    if (value.items.length <= 1) return;

    onChange(
      recalculateInvoice({
        ...value,
        items: value.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      })
    );
  };

  const openVatModal = () => {
    setVatDraft(
      value.vatPercentage || '18'
    );

    setVatError('');
    setVatModalOpen(true);
  };

  const applyVatPercentage = () => {
    const trimmed = vatDraft.trim();
    const parsed = Number(trimmed);

    if (
      !trimmed ||
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > 100
    ) {
      setVatError(
        'Enter a VAT percentage from 0 to 100.'
      );

      return;
    }

    onChange(
      recalculateInvoice({
        ...value,
        vatPercentage: String(parsed),
      })
    );

    setVatModalOpen(false);
    setVatError('');
  };

  const updateRupeeAmount = (
    input: string
  ) => {
    const withoutCommas =
      input.replace(/,/g, '');

    const validCurrencyPattern =
      /^\d*(?:\.\d{0,2})?$/;

    if (
      input === '' ||
      validCurrencyPattern.test(
        withoutCommas
      )
    ) {
      setRupeeAmount(input);
      setRupeeError('');
    }
  };

  const formatRupeeAmount = () => {
    if (!rupeeAmount.trim()) {
      return;
    }

    setRupeeAmount(
      formatCurrencyAmount(rupeeAmount)
    );
  };

  const convertTotalToWords = () => {
    const usdWords = amountToWords(
      value.totalAmountIncludingVat
    );

    if (!usdWords) {
      return;
    }

    const normalisedRupeeAmount =
      normaliseCurrencyAmount(
        rupeeAmount
      );

    const parsedRupeeAmount = Number(
      normalisedRupeeAmount
    );

    if (
      !normalisedRupeeAmount ||
      !Number.isFinite(parsedRupeeAmount) ||
      parsedRupeeAmount < 0
    ) {
      setRupeeError(
        'Enter a valid amount in Sri Lankan Rupees.'
      );

      return;
    }

    const rupeeWords =
      convertDollarWordsToRupees(
        amountToWords(
          normalisedRupeeAmount
        )
      );

    if (!rupeeWords) {
      setRupeeError(
        'The rupee amount could not be converted.'
      );

      return;
    }

    updateField(
      'totalAmountInWords',
      [
        `USD: ${usdWords}`,
        `LKR: ${rupeeWords}`,
      ].join('\n')
    );

    setRupeeAmount(
      formatCurrencyAmount(
        normalisedRupeeAmount
      )
    );

    setRupeeError('');
  };

  const handleFormKeyDown = (
    event: ReactKeyboardEvent<HTMLFormElement>
  ) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    const target = event.target as HTMLElement;

    // Textareas keep their normal Enter behaviour so
    // the user can add another line without submitting.
    if (target instanceof HTMLTextAreaElement) {
      return;
    }

    // Buttons keep their normal keyboard behaviour.
    if (target instanceof HTMLButtonElement) {
      return;
    }

    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      (target.readOnly || target.disabled)
    ) {
      return;
    }

    event.preventDefault();

    const editableFields = (
      Array.from(
        event.currentTarget.querySelectorAll(
          [
            'input:not([type="hidden"]):not([disabled]):not([readonly])',
            'select:not([disabled])',
            'textarea:not([disabled]):not([readonly])',
          ].join(',')
        )
      ) as HTMLElement[]
    ).filter(
      (field) =>
        field.tabIndex !== -1 &&
        field.offsetParent !== null
    );

    const currentIndex =
      editableFields.indexOf(target);

    const nextField =
      editableFields[currentIndex + 1];

    nextField?.focus();

    if (
      nextField instanceof HTMLInputElement &&
      nextField.type !== 'date'
    ) {
      nextField.select();
    }
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setReviewModalOpen(true);
  };

  const confirmSubmission = async () => {
    setReviewModalOpen(false);
    await onSubmit();
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className="space-y-5"
      >
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <div className="border-b-2 border-slate-700 px-5 py-4 text-center">
            <h2 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">
              Tax Invoice
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Enter quantity and unit price.
              Line amounts, totals, and VAT are
              calculated automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 border-b border-slate-300 md:grid-cols-2">
            <div className="border-b border-slate-300 p-4 md:border-b-0 md:border-r">
              <CalendarField
                label="Date of Invoice"
                value={value.invoiceDate}
                onChange={(next) =>
                  updateField(
                    'invoiceDate',
                    next
                  )
                }
              />
            </div>

            <div className="p-4">
              <LabeledField
                label="Tax Invoice No."
                value={value.invoiceNumber}
                onChange={(next) =>
                  updateField(
                    'invoiceNumber',
                    next
                  )
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
                    updateField(
                      'supplierTin',
                      next
                    )
                  }
                />

                <LabeledField
                  label="Telephone No."
                  value={
                    value.supplierTelephone
                  }
                  onChange={(next) =>
                    updateField(
                      'supplierTelephone',
                      next
                    )
                  }
                />

                <div className="sm:col-span-2">
                  <LabeledField
                    label="Supplier's Name"
                    value={value.supplierName}
                    onChange={(next) =>
                      updateField(
                        'supplierName',
                        next
                      )
                    }
                  />
                </div>

                <label className="block space-y-1 sm:col-span-2">
                  <span className={labelClass}>
                    Supplier's Address
                  </span>

                  <textarea
                    rows={3}
                    value={
                      value.supplierAddress
                    }
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
                    updateField(
                      'purchaserTin',
                      next
                    )
                  }
                />

                <LabeledField
                  label="Telephone No."
                  value={
                    value.purchaserTelephone
                  }
                  onChange={(next) =>
                    updateField(
                      'purchaserTelephone',
                      next
                    )
                  }
                />

                <label className="block space-y-1 sm:col-span-2">
                  <span className={labelClass}>
                    Purchaser's Name
                  </span>

                  <select
                    value={
                      purchaserSelectValue
                    }
                    onChange={(event) =>
                      selectPurchaser(
                        event.target.value
                      )
                    }
                    disabled={customersLoading}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-wait disabled:bg-slate-50"
                  >
                    <option value="">
                      {customersLoading
                        ? 'Loading registered customers...'
                        : 'Select a registered customer'}
                    </option>

                    {purchaserSelectValue ===
                      '__existing__' && (
                      <option value="__existing__">
                        Existing purchaser:{' '}
                        {value.purchaserName}
                      </option>
                    )}

                    {customers.map(
                      (customer) => (
                        <option
                          key={customer.id}
                          value={customer.id}
                        >
                          {
                            customer.customerName
                          }
                        </option>
                      )
                    )}
                  </select>

                  {!customersLoading &&
                    customers.length === 0 &&
                    !value.purchaserName && (
                      <span className="block text-xs text-amber-600">
                        No customers are registered
                        yet. Register a customer from
                        the Admin section first.
                      </span>
                    )}
                </label>

                <label className="block space-y-1 sm:col-span-2">
                  <span className={labelClass}>
                    Purchaser's Address
                  </span>

                  <textarea
                    rows={3}
                    value={
                      value.purchaserAddress
                    }
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
            <CalendarField
              label="Date of Delivery"
              value={value.deliveryDate}
              onChange={(next) =>
                updateField(
                  'deliveryDate',
                  next
                )
              }
            />

            <LabeledField
              label="Place of Supply"
              value={value.placeOfSupply}
              onChange={(next) =>
                updateField(
                  'placeOfSupply',
                  next
                )
              }
            />

            <label className="block space-y-1 md:col-span-2">
              <span className={labelClass}>
                Additional Information
              </span>

              <textarea
                rows={2}
                value={
                  value.additionalInformation
                }
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
            <table className="w-full min-w-225 border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="w-12 border-r border-slate-600 px-2 py-3 text-center text-[10px] uppercase">
                    No.
                  </th>

                  <th className="w-36 border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                    PO/SOD No
                  </th>

                  <th className="border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                    Description of Goods or
                    Services
                  </th>

                  <th className="w-28 border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                    Quantity
                  </th>

                  <th className="w-36 border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                    Unit Price
                  </th>

                  <th className="w-48 border-r border-slate-600 px-2 py-3 text-left text-[10px] uppercase">
                    Amount Excluding VAT (USD)
                  </th>

                  <th className="w-12 px-2 py-3" />
                </tr>
              </thead>

              <tbody>
                {value.items.map(
                  (item, index) => (
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
                          value={
                            item.description
                          }
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
                          inputMode="decimal"
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
                          inputMode="decimal"
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

                      <td className="border-r border-slate-300 bg-slate-50">
                        <input
                          value={
                            item.amountExcludingVat
                          }
                          readOnly
                          tabIndex={-1}
                          className={`${inputClass} cursor-default bg-slate-50 text-right font-bold`}
                        />
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() =>
                            removeRow(index)
                          }
                          disabled={
                            value.items.length <= 1
                          }
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
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
                  rows={5}
                  value={
                    value.totalAmountInWords
                  }
                  onChange={(event) =>
                    updateField(
                      'totalAmountInWords',
                      event.target.value.toUpperCase()
                    )
                  }
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </label>

              <div className="mt-3">
                <LabeledField
                  label="Mode of Payment"
                  value={value.modeOfPayment}
                  onChange={(next) =>
                    updateField(
                      'modeOfPayment',
                      next
                    )
                  }
                />
              </div>
            </div>

            <div className="divide-y divide-slate-300">
              <label className="grid grid-cols-[1fr_180px] items-center">
                <span className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                  Total Value of Supply
                </span>

                <input
                  value={
                    value.totalValueOfSupply
                  }
                  readOnly
                  tabIndex={-1}
                  className={
                    calculatedInputClass
                  }
                />
              </label>

              <div className="grid grid-cols-[1fr_180px] items-stretch">
                <div className="flex items-center px-4 py-3 text-xs font-bold uppercase text-slate-600">
                  VAT Amount (
                  {value.vatPercentage || '18'}
                  %)
                </div>

                <div className="border-l border-slate-300 bg-slate-50 p-2">
                  <input
                    value={value.vatAmount}
                    readOnly
                    tabIndex={-1}
                    className="w-full bg-transparent px-1 py-1 text-right text-sm font-bold text-slate-800 outline-none"
                  />

                  <button
                    type="button"
                    onClick={openVatModal}
                    className="mt-1 w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 hover:bg-blue-50"
                  >
                    Change VAT %
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_220px] items-stretch">
                <div className="flex items-center px-4 py-3 text-xs font-bold uppercase text-slate-600">
                  Total Amount Including VAT
                </div>

                <div className="border-l border-slate-300 bg-slate-50 p-2">
                  <input
                    value={
                      value.totalAmountIncludingVat
                    }
                    readOnly
                    tabIndex={-1}
                    className="w-full bg-transparent px-1 py-1 text-right text-sm font-black text-slate-900 outline-none"
                  />

                  <label className="mt-2 block">
                    <span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">
                      Converted Amount in LKR
                    </span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={rupeeAmount}
                      onChange={(event) =>
                        updateRupeeAmount(
                          event.target.value
                        )
                      }
                      onBlur={
                        formatRupeeAmount
                      }
                      placeholder="193,211.16"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </label>

                  {rupeeError && (
                    <p className="mt-1 text-[10px] font-medium leading-tight text-red-600">
                      {rupeeError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={
                      convertTotalToWords
                    }
                    className="mt-2 w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 hover:bg-emerald-50"
                  >
                    Convert USD & LKR
                  </button>
                </div>
              </div>
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

            {submitting
              ? 'Saving...'
              : submitLabel}
          </button>
        </div>
      </form>

      {reviewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onKeyDown={(event) => {
            // Confirmation must be an intentional button
            // click, not another accidental Enter press.
            if (event.key === 'Enter') {
              event.preventDefault();
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-black text-slate-900">
                  Recheck Tax Invoice
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Please verify the invoice details,
                  purchaser, amounts, VAT, dates, and
                  total before saving.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setReviewModalOpen(false)
                }
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close review"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <ReviewItem
                label="Invoice No."
                value={
                  value.invoiceNumber || '—'
                }
              />

              <ReviewItem
                label="Invoice Date"
                value={
                  value.invoiceDate || '—'
                }
              />

              <ReviewItem
                label="Purchaser"
                value={
                  value.purchaserName || '—'
                }
              />

              <ReviewItem
                label="Delivery Date"
                value={
                  value.deliveryDate || '—'
                }
              />

              <ReviewItem
                label="Total Value of Supply"
                value={
                  value.totalValueOfSupply ||
                  '0.00'
                }
              />

              <ReviewItem
                label={`VAT Amount (${
                  value.vatPercentage || '18'
                }%)`}
                value={
                  value.vatAmount || '0'
                }
              />

              <div className="sm:col-span-2">
                <ReviewItem
                  label="Total Amount Including VAT"
                  value={
                    value.totalAmountIncludingVat ||
                    '0.00'
                  }
                  highlight
                />
              </div>

              <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Saving will write this invoice to the
                database. Select Back to Invoice to
                make corrections.
              </div>
            </div>

            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                autoFocus
                onClick={() =>
                  setReviewModalOpen(false)
                }
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Back to Invoice
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmSubmission()
                }
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />

                {submitting
                  ? 'Saving...'
                  : 'Confirm & Save'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {vatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-black text-slate-900">
                  Change VAT Percentage
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  The VAT amount and grand total
                  will be recalculated
                  automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setVatModalOpen(false)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="p-5">
              <label className="block space-y-1">
                <span className={labelClass}>
                  VAT Percentage
                </span>

                <div className="relative">
                  <input
                    autoFocus
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.01"
                    value={vatDraft}
                    onChange={(event) =>
                      setVatDraft(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter'
                      ) {
                        event.preventDefault();
                        applyVatPercentage();
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />

                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-bold text-slate-400">
                    %
                  </span>
                </div>
              </label>

              {vatError && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {vatError}
                </p>
              )}
            </div>

            <footer className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setVatModalOpen(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={applyVatPercentage}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Apply VAT
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}