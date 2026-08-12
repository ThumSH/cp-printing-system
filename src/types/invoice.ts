export interface TaxInvoiceItemInput {
  id?: string;
  rowOrder?: number;
  reference: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amountExcludingVat: string;
}

export interface TaxInvoicePayload {
  invoiceNumber: string;
  invoiceDate: string;

  supplierTin: string;
  supplierName: string;
  supplierAddress: string;
  supplierTelephone: string;

  purchaserTin: string;
  purchaserName: string;
  purchaserAddress: string;
  purchaserTelephone: string;

  deliveryDate: string;
  placeOfSupply: string;
  additionalInformation: string;

  vatPercentage: string;
  totalValueOfSupply: string;
  vatAmount: string;
  totalAmountIncludingVat: string;

  exchangeRate: string;
  totalValueOfSupplyLkr: string;
  vatAmountLkr: string;
  totalAmountIncludingVatLkr: string;

  totalAmountInWords: string;
  modeOfPayment: string;

  items: TaxInvoiceItemInput[];
}

export interface TaxInvoice extends TaxInvoicePayload {
  id: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string | null;
}

export interface TaxInvoiceSummary {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  purchaserName: string;
  totalAmountIncludingVat: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface TaxInvoiceSearchResponse {
  items: TaxInvoiceSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TaxInvoiceSearchFilters {
  invoiceNumber: string;
  supplierName: string;
  purchaserName: string;
  dateFrom: string;
  dateTo: string;
}

export interface TaxInvoiceFilterOptions {
  invoiceNumbers: string[];
  supplierNames: string[];
  purchaserNames: string[];
}

export interface InvoiceSecurityStatus {
  hasPassword: boolean;
  updatedBy: string;
  updatedAt: string | null;
}

const getLocalDateString = (): string => {
  const now = new Date();

  const local = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60_000
  );

  return local.toISOString().slice(0, 10);
};

export const createBlankInvoiceItem =
  (): TaxInvoiceItemInput => ({
    reference: '',
    description: '',
    quantity: '',
    unitPrice: '',
    amountExcludingVat: '',
  });

export const DEFAULT_SUPPLIER = {
  tin: '174996555',
  name: 'COLOUR PLUS PRINTING SYSTEMS (PVT) LTD',
  address:
    'NO 564, ATHURUGIYARA ROAD, KOTTAWA, SRI LANKA',
  telephone: '0112781525',
} as const;

export const DEFAULT_MODE_OF_PAYMENT =
  'CREDIT - NET 30 DAYS';

export const createBlankInvoice = (
  rowCount = 8
): TaxInvoicePayload => ({
  invoiceNumber: '',
  invoiceDate: getLocalDateString(),

  supplierTin: DEFAULT_SUPPLIER.tin,
  supplierName: DEFAULT_SUPPLIER.name,
  supplierAddress: DEFAULT_SUPPLIER.address,
  supplierTelephone: DEFAULT_SUPPLIER.telephone,

  purchaserTin: '',
  purchaserName: '',
  purchaserAddress: '',
  purchaserTelephone: '',

  deliveryDate: '',
  placeOfSupply: DEFAULT_SUPPLIER.name,
  additionalInformation: '',

  vatPercentage: '18',
  totalValueOfSupply: '0.00',
  vatAmount: '0.00',
  totalAmountIncludingVat: '0.00',

  exchangeRate: '',
  totalValueOfSupplyLkr: '',
  vatAmountLkr: '',
  totalAmountIncludingVatLkr: '',

  totalAmountInWords: '',
  modeOfPayment: DEFAULT_MODE_OF_PAYMENT,

  items: Array.from(
    { length: rowCount },
    createBlankInvoiceItem
  ),
});

export const toInvoicePayload = (
  invoice: TaxInvoice
): TaxInvoicePayload => ({
  invoiceNumber: invoice.invoiceNumber,
  invoiceDate: invoice.invoiceDate,

  supplierTin: invoice.supplierTin,
  supplierName: invoice.supplierName,
  supplierAddress: invoice.supplierAddress,
  supplierTelephone:
    invoice.supplierTelephone,

  purchaserTin: invoice.purchaserTin,
  purchaserName: invoice.purchaserName,
  purchaserAddress: invoice.purchaserAddress,
  purchaserTelephone:
    invoice.purchaserTelephone,

  deliveryDate: invoice.deliveryDate,
  placeOfSupply: invoice.placeOfSupply,
  additionalInformation:
    invoice.additionalInformation,

  // Existing invoices created before this update
  // safely use the former default VAT rate.
  vatPercentage:
    invoice.vatPercentage?.trim() || '18',

  totalValueOfSupply:
    invoice.totalValueOfSupply,

  vatAmount: invoice.vatAmount,

  totalAmountIncludingVat:
    invoice.totalAmountIncludingVat,

  exchangeRate:
    invoice.exchangeRate?.trim() || '',

  totalValueOfSupplyLkr:
    invoice.totalValueOfSupplyLkr?.trim() || '',

  vatAmountLkr:
    invoice.vatAmountLkr?.trim() || '',

  totalAmountIncludingVatLkr:
    invoice.totalAmountIncludingVatLkr?.trim() || '',

  totalAmountInWords:
    invoice.totalAmountInWords,

  modeOfPayment: invoice.modeOfPayment,

  items: invoice.items.map((item) => ({
    ...item,
  })),
});