import {
  TaxInvoice,
  TaxInvoicePayload,
  createBlankInvoiceItem,
} from '../../types/invoice';

interface InvoiceDocumentProps {
  invoice: TaxInvoice | TaxInvoicePayload;
}

const displayValue = (value?: string | null): string =>
  value?.trim() || '\u00A0';

const INVOICE_STYLES = `
  .invoice-sheet {
    box-sizing: border-box;
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    background: #ffffff;
    color: #000000;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.25;
  }

  .invoice-frame {
    width: 100%;
    border: 3px solid #000000;
    box-sizing: border-box;
  }

  .invoice-title {
    margin: 0;
    padding: 14px 12px;
    border-bottom: 2px solid #000000;
    text-align: center;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .invoice-two-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .invoice-cell {
    box-sizing: border-box;
    min-height: 34px;
    padding: 8px 10px;
  }

  .invoice-border-bottom {
    border-bottom: 1.5px solid #000000;
  }

  .invoice-border-right {
    border-right: 1.5px solid #000000;
  }

  .invoice-section-title {
    margin: 0;
    padding: 6px 10px;
    border-bottom: 1.5px solid #000000;
    background: #eef2f7;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .invoice-party-content {
    min-height: 112px;
    padding: 8px 10px;
  }

  .invoice-party-content p {
    margin: 0 0 7px;
  }

  .invoice-party-content p:last-child {
    margin-bottom: 0;
  }

  .invoice-address {
    min-height: 28px;
    white-space: pre-wrap;
  }

  .invoice-additional {
    box-sizing: border-box;
    min-height: 44px;
    padding: 8px 10px;
    border-bottom: 1.5px solid #000000;
    white-space: pre-wrap;
  }

  .invoice-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .invoice-table th,
  .invoice-table td {
    box-sizing: border-box;
    border-right: 1.25px solid #000000;
    border-bottom: 1.25px solid #000000;
    padding: 5px 6px;
    vertical-align: middle;
    overflow-wrap: anywhere;
  }

  .invoice-table th:last-child,
  .invoice-table td:last-child {
    border-right: 0;
  }

  .invoice-table th {
    height: 42px;
    background: #f8fafc;
    text-align: center;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .invoice-table td {
    height: 29px;
  }

  .invoice-number-column {
    width: 6%;
    text-align: center;
  }

  .invoice-reference-column {
    width: 14%;
  }

  .invoice-description-column {
    width: 36%;
  }

  .invoice-quantity-column {
    width: 11%;
  }

  .invoice-unit-price-column {
    width: 14%;
    text-align: right;
  }

  .invoice-amount-column {
    width: 19%;
    text-align: right;
  }

  .invoice-bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .invoice-words-panel {
    border-right: 1.5px solid #000000;
  }

  .invoice-words {
    box-sizing: border-box;
    min-height: 82px;
    padding: 8px 10px;
    border-bottom: 1.5px solid #000000;
    white-space: pre-wrap;
  }

  .invoice-payment {
    min-height: 34px;
    padding: 8px 10px;
  }

  .invoice-total-row {
    display: grid;
    grid-template-columns: 1fr 145px;
    min-height: 38px;
    border-bottom: 1.5px solid #000000;
  }

  .invoice-total-row:last-child {
    border-bottom: 0;
  }

  .invoice-total-label {
    display: flex;
    align-items: center;
    padding: 7px 10px;
    border-right: 1.5px solid #000000;
    font-weight: 900;
    text-transform: uppercase;
  }

  .invoice-total-value {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 7px 10px;
    text-align: right;
  }

  .invoice-grand-total {
    font-weight: 900;
  }

  @media screen {
    .invoice-sheet {
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.15);
    }
  }
`;

const PRINT_STYLES = `
  ${INVOICE_STYLES}

  @page {
    size: A4 portrait;
    margin: 8mm;
  }

  html,
  body {
    width: 100%;
    margin: 0;
    padding: 0;
    background: #ffffff;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .invoice-sheet {
    width: 100%;
    max-width: none;
    margin: 0;
    box-shadow: none;
    page-break-after: avoid;
    break-after: avoid-page;
  }

  .invoice-frame,
  .invoice-two-column,
  .invoice-party-content,
  .invoice-table,
  .invoice-bottom,
  .invoice-total-row {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

export function printInvoiceDocument(): void {
  const invoiceElement = document.getElementById(
    'tax-invoice-print'
  );

  if (!invoiceElement) {
    throw new Error(
      'The Tax Invoice print document was not found.'
    );
  }

  const invoiceNumber =
    invoiceElement.getAttribute('data-invoice-number') ||
    'Tax-Invoice';

  // Remove an older print frame if one is still present.
  document
    .getElementById('tax-invoice-print-frame')
    ?.remove();

  const printFrame = document.createElement('iframe');

  printFrame.id = 'tax-invoice-print-frame';
  printFrame.title = `Tax Invoice ${invoiceNumber}`;

  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  printFrame.style.opacity = '0';
  printFrame.style.pointerEvents = 'none';

  document.body.appendChild(printFrame);

  const frameWindow = printFrame.contentWindow;
  const frameDocument = printFrame.contentDocument;

  if (!frameWindow || !frameDocument) {
    printFrame.remove();

    throw new Error(
      'The browser could not create the invoice print view.'
    );
  }

  frameDocument.open();
  frameDocument.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>Tax Invoice - ${invoiceNumber}</title>
        <style>${PRINT_STYLES}</style>
      </head>

      <body>
        ${invoiceElement.outerHTML}
      </body>
    </html>
  `);
  frameDocument.close();

  const removeFrame = () => {
    window.setTimeout(() => {
      printFrame.remove();
    }, 500);
  };

  const startPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      removeFrame();
    }
  };

  // The invoice has no remote images, but waiting for the iframe
  // document ensures its styles and layout are ready before printing.
  if (frameDocument.readyState === 'complete') {
    window.setTimeout(startPrint, 100);
  } else {
    printFrame.onload = () => {
      window.setTimeout(startPrint, 100);
    };
  }
}

export default function InvoiceDocument({
  invoice,
}: InvoiceDocumentProps) {
  const minimumRows = 8;
  const items = [...invoice.items];

  while (items.length < minimumRows) {
    items.push(createBlankInvoiceItem());
  }

  return (
    <>
      <style>{INVOICE_STYLES}</style>

      <article
        id="tax-invoice-print"
        data-invoice-number={invoice.invoiceNumber}
        className="invoice-sheet"
      >
        <div className="invoice-frame">
          <header>
            <h1 className="invoice-title">
              Tax Invoice
            </h1>
          </header>

          <div className="invoice-two-column invoice-border-bottom">
            <div className="invoice-cell invoice-border-right">
              <strong>Date of Invoice:</strong>{' '}
              {displayValue(invoice.invoiceDate)}
            </div>

            <div className="invoice-cell">
              <strong>Tax Invoice No.:</strong>{' '}
              {displayValue(invoice.invoiceNumber)}
            </div>
          </div>

          <div className="invoice-two-column invoice-border-bottom">
            <section className="invoice-border-right">
              <h2 className="invoice-section-title">
                Supplier
              </h2>

              <div className="invoice-party-content">
                <p>
                  <strong>TIN:</strong>{' '}
                  {displayValue(invoice.supplierTin)}
                </p>

                <p>
                  <strong>Name:</strong>{' '}
                  {displayValue(invoice.supplierName)}
                </p>

                <p className="invoice-address">
                  <strong>Address:</strong>{' '}
                  {displayValue(invoice.supplierAddress)}
                </p>

                <p>
                  <strong>Telephone:</strong>{' '}
                  {displayValue(invoice.supplierTelephone)}
                </p>
              </div>
            </section>

            <section>
              <h2 className="invoice-section-title">
                Purchaser
              </h2>

              <div className="invoice-party-content">
                <p>
                  <strong>TIN:</strong>{' '}
                  {displayValue(invoice.purchaserTin)}
                </p>

                <p>
                  <strong>Name:</strong>{' '}
                  {displayValue(invoice.purchaserName)}
                </p>

                <p className="invoice-address">
                  <strong>Address:</strong>{' '}
                  {displayValue(invoice.purchaserAddress)}
                </p>

                <p>
                  <strong>Telephone:</strong>{' '}
                  {displayValue(invoice.purchaserTelephone)}
                </p>
              </div>
            </section>
          </div>

          <div className="invoice-two-column invoice-border-bottom">
            <div className="invoice-cell invoice-border-right">
              <strong>Date of Delivery:</strong>{' '}
              {displayValue(invoice.deliveryDate)}
            </div>

            <div className="invoice-cell">
              <strong>Place of Supply:</strong>{' '}
              {displayValue(invoice.placeOfSupply)}
            </div>
          </div>

          <div className="invoice-additional">
            <strong>Additional Information:</strong>{' '}
            {displayValue(invoice.additionalInformation)}
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th className="invoice-number-column">
                  No.
                </th>
                <th className="invoice-reference-column">
                  Reference
                </th>
                <th className="invoice-description-column">
                  Description of Goods or Services
                </th>
                <th className="invoice-quantity-column">
                  Quantity
                </th>
                <th className="invoice-unit-price-column">
                  Unit Price
                </th>
                <th className="invoice-amount-column">
                  Amount Excluding VAT (USD)
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="invoice-number-column">
                    {index + 1}
                  </td>

                  <td className="invoice-reference-column">
                    {displayValue(item.reference)}
                  </td>

                  <td className="invoice-description-column">
                    {displayValue(item.description)}
                  </td>

                  <td className="invoice-quantity-column">
                    {displayValue(item.quantity)}
                  </td>

                  <td className="invoice-unit-price-column">
                    {displayValue(item.unitPrice)}
                  </td>

                  <td className="invoice-amount-column">
                    {displayValue(item.amountExcludingVat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-bottom">
            <div className="invoice-words-panel">
              <div className="invoice-words">
                <strong>Total Amount in Words:</strong>

                <div style={{ marginTop: 6 }}>
                  {displayValue(invoice.totalAmountInWords)}
                </div>
              </div>

              <div className="invoice-payment">
                <strong>Mode of Payment:</strong>{' '}
                {displayValue(invoice.modeOfPayment)}
              </div>
            </div>

            <div>
              <div className="invoice-total-row">
                <div className="invoice-total-label">
                  Total Value of Supply
                </div>

                <div className="invoice-total-value">
                  {displayValue(invoice.totalValueOfSupply)}
                </div>
              </div>

              <div className="invoice-total-row">
                <div className="invoice-total-label">
                  VAT Amount
                  <span style={{ marginLeft: 4, fontWeight: 700 }}>
                    (Total Value of Supply 18%)
                  </span>
                </div>

                <div className="invoice-total-value">
                  {displayValue(invoice.vatAmount)}
                </div>
              </div>

              <div className="invoice-total-row">
                <div className="invoice-total-label">
                  Total Amount Including VAT
                </div>

                <div className="invoice-total-value invoice-grand-total">
                  {displayValue(
                    invoice.totalAmountIncludingVat
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}