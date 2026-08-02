import {
  TaxInvoiceItemInput,
  TaxInvoicePayload,
} from '../types/invoice';

const NUMBER_PATTERN = /^\d*(?:\.\d*)?$/;

export const sanitiseDecimalInput = (
  value: string
): string => {
  const cleaned = value.replace(/,/g, '').trim();

  if (!cleaned) return '';
  if (!NUMBER_PATTERN.test(cleaned)) return '';

  return cleaned;
};

export const parseInvoiceNumber = (
  value: string
): number => {
  const cleaned = value.replace(/,/g, '').trim();
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
};

const roundToTwo = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const formatMoney = (
  value: number
): string => {
  if (!Number.isFinite(value)) return '0.00';
  return roundToTwo(value).toFixed(2);
};

export const calculateLineAmount = (
  item: TaxInvoiceItemInput
): string => {
  const quantity = item.quantity.trim();
  const unitPrice = item.unitPrice.trim();

  if (!quantity || !unitPrice) return '';

  return formatMoney(
    parseInvoiceNumber(quantity) *
      parseInvoiceNumber(unitPrice)
  );
};

export const recalculateInvoice = (
  invoice: TaxInvoicePayload
): TaxInvoicePayload => {
  const items = invoice.items.map((item) => ({
    ...item,
    amountExcludingVat: calculateLineAmount(item),
  }));

  const totalValue = roundToTwo(
    items.reduce(
      (sum, item) =>
        sum +
        parseInvoiceNumber(item.amountExcludingVat),
      0
    )
  );

  const parsedVatPercentage =
    parseInvoiceNumber(invoice.vatPercentage);

  const vatPercentage =
    Number.isFinite(parsedVatPercentage) &&
    parsedVatPercentage >= 0
      ? parsedVatPercentage
      : 18;

  // VAT follows the requested whole-number rounding:
  // 88.75 -> 89 and 88.01 -> 88.
  const vatAmount = Math.round(
    totalValue * (vatPercentage / 100) +
      Number.EPSILON
  );

  const totalIncludingVat = roundToTwo(
    totalValue + vatAmount
  );

  return {
    ...invoice,
    items,
    vatPercentage: String(vatPercentage),
    totalValueOfSupply: formatMoney(totalValue),
    vatAmount: String(vatAmount),
    totalAmountIncludingVat:
      formatMoney(totalIncludingVat),
  };
};

export const formatInvoiceDate = (
  value?: string | null
): string => {
  const trimmed = value?.trim() || '';

  const isoMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1].slice(-2)}`;
  }

  const displayMatch =
    /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(trimmed);

  if (displayMatch) return trimmed;

  return trimmed;
};

export const parseInvoiceDate = (
  value: string
): string | null => {
  const trimmed = value.trim();

  if (!trimmed) return '';

  const isoMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (isoMatch) {
    return isValidDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    )
      ? trimmed
      : null;
  }

  const displayMatch =
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(
      trimmed
    );

  if (!displayMatch) return null;

  const month = Number(displayMatch[1]);
  const day = Number(displayMatch[2]);
  const suppliedYear = Number(displayMatch[3]);

  const year =
    displayMatch[3].length === 2
      ? 2000 + suppliedYear
      : suppliedYear;

  if (!isValidDate(year, month, day)) return null;

  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
};

const isValidDate = (
  year: number,
  month: number,
  day: number
): boolean => {
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const ONES = [
  '',
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
  'ELEVEN',
  'TWELVE',
  'THIRTEEN',
  'FOURTEEN',
  'FIFTEEN',
  'SIXTEEN',
  'SEVENTEEN',
  'EIGHTEEN',
  'NINETEEN',
];

const TENS = [
  '',
  '',
  'TWENTY',
  'THIRTY',
  'FORTY',
  'FIFTY',
  'SIXTY',
  'SEVENTY',
  'EIGHTY',
  'NINETY',
];

const SCALES = [
  '',
  'THOUSAND',
  'MILLION',
  'BILLION',
  'TRILLION',
  'QUADRILLION',
];

const underThousandToWords = (
  value: number
): string => {
  const words: string[] = [];
  let remaining = value;

  if (remaining >= 100) {
    words.push(
      `${ONES[Math.floor(remaining / 100)]} HUNDRED`
    );

    remaining %= 100;

    if (remaining > 0) {
      words.push('AND');
    }
  }

  if (remaining >= 20) {
    const tensWord =
      TENS[Math.floor(remaining / 10)];

    const onesWord = ONES[remaining % 10];

    words.push(
      onesWord
        ? `${tensWord}-${onesWord}`
        : tensWord
    );
  } else if (remaining > 0) {
    words.push(ONES[remaining]);
  }

  return words.join(' ');
};

const integerToWords = (
  value: number
): string => {
  if (value === 0) return 'ZERO';

  const groups: string[] = [];
  let remaining = value;
  let scaleIndex = 0;

  while (remaining > 0) {
    const group = remaining % 1000;

    if (group > 0) {
      const groupWords =
        underThousandToWords(group);

      const scale = SCALES[scaleIndex];

      groups.unshift(
        scale
          ? `${groupWords} ${scale}`
          : groupWords
      );
    }

    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }

  return groups.join(' ');
};

export const amountToWords = (
  amount: string
): string => {
  const parsed = parseInvoiceNumber(amount);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > Number.MAX_SAFE_INTEGER
  ) {
    return '';
  }

  const rounded = roundToTwo(parsed);
  const whole = Math.floor(rounded);

  const cents = Math.round(
    (rounded - whole) * 100
  );

  const dollarLabel =
    whole === 1 ? 'DOLLAR' : 'DOLLARS';

  const parts = [
    `${integerToWords(whole)} ${dollarLabel}`,
  ];

  if (cents > 0) {
    const centLabel =
      cents === 1 ? 'CENT' : 'CENTS';

    parts.push(
      `${integerToWords(cents)} ${centLabel}`
    );
  }

  return `${parts.join(' AND ')} ONLY`.toUpperCase();
};
