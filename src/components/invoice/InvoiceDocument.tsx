import {
  TaxInvoice,
  TaxInvoicePayload,
  createBlankInvoiceItem,
} from '../../types/invoice';

interface InvoiceDocumentProps {
  invoice: TaxInvoice | TaxInvoicePayload;
}

const show = (value?: string | null) =>
  value?.trim() || ' ';

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
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 9mm;
          }

          body * {
            visibility: hidden !important;
          }

          #tax-invoice-print,
          #tax-invoice-print * {
            visibility: visible !important;
          }

          #tax-invoice-print {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
          }
        }
      `}</style>

      <article
        id="tax-invoice-print"
        className="mx-auto w-full max-w-5xl bg-white text-[11px] text-black shadow-sm"
      >
        <div className="border-2 border-black">
          <header className="border-b-2 border-black px-4 py-3 text-center">
            <h1 className="text-xl font-black uppercase tracking-[0.25em]">
              Tax Invoice
            </h1>
          </header>

          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black p-2">
              <b>Date of Invoice:</b>{' '}
              {show(invoice.invoiceDate)}
            </div>
            <div className="p-2">
              <b>Tax Invoice No.:</b>{' '}
              {show(invoice.invoiceNumber)}
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-black">
            <section className="border-r border-black">
              <h2 className="border-b border-black bg-slate-100 px-2 py-1 font-black uppercase">
                Supplier
              </h2>

              <div className="space-y-1 p-2">
                <p>
                  <b>TIN:</b> {show(invoice.supplierTin)}
                </p>
                <p>
                  <b>Name:</b>{' '}
                  {show(invoice.supplierName)}
                </p>
                <p className="min-h-8 whitespace-pre-wrap">
                  <b>Address:</b>{' '}
                  {show(invoice.supplierAddress)}
                </p>
                <p>
                  <b>Telephone:</b>{' '}
                  {show(invoice.supplierTelephone)}
                </p>
              </div>
            </section>

            <section>
              <h2 className="border-b border-black bg-slate-100 px-2 py-1 font-black uppercase">
                Purchaser
              </h2>

              <div className="space-y-1 p-2">
                <p>
                  <b>TIN:</b> {show(invoice.purchaserTin)}
                </p>
                <p>
                  <b>Name:</b>{' '}
                  {show(invoice.purchaserName)}
                </p>
                <p className="min-h-8 whitespace-pre-wrap">
                  <b>Address:</b>{' '}
                  {show(invoice.purchaserAddress)}
                </p>
                <p>
                  <b>Telephone:</b>{' '}
                  {show(invoice.purchaserTelephone)}
                </p>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black p-2">
              <b>Date of Delivery:</b>{' '}
              {show(invoice.deliveryDate)}
            </div>
            <div className="p-2">
              <b>Place of Supply:</b>{' '}
              {show(invoice.placeOfSupply)}
            </div>
          </div>

          <div className="min-h-10 border-b border-black p-2">
            <b>Additional Information:</b>{' '}
            <span className="whitespace-pre-wrap">
              {show(invoice.additionalInformation)}
            </span>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-10 border-b border-r border-black p-1">
                  No.
                </th>
                <th className="w-24 border-b border-r border-black p-1">
                  Reference
                </th>
                <th className="border-b border-r border-black p-1">
                  Description of Goods or Services
                </th>
                <th className="w-20 border-b border-r border-black p-1">
                  Quantity
                </th>
                <th className="w-24 border-b border-r border-black p-1">
                  Unit Price
                </th>
                <th className="w-32 border-b border-black p-1">
                  Amount Excluding VAT (Rs.)
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="h-8 border-b border-r border-black p-1 text-center">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-black p-1">
                    {show(item.reference)}
                  </td>
                  <td className="border-b border-r border-black p-1">
                    {show(item.description)}
                  </td>
                  <td className="border-b border-r border-black p-1">
                    {show(item.quantity)}
                  </td>
                  <td className="border-b border-r border-black p-1 text-right">
                    {show(item.unitPrice)}
                  </td>
                  <td className="border-b border-black p-1 text-right">
                    {show(item.amountExcludingVat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2">
            <div className="border-r border-black">
              <div className="min-h-20 border-b border-black p-2">
                <b>Total Amount in Words:</b>
                <p className="mt-1 whitespace-pre-wrap">
                  {show(invoice.totalAmountInWords)}
                </p>
              </div>

              <div className="p-2">
                <b>Mode of Payment:</b>{' '}
                {show(invoice.modeOfPayment)}
              </div>
            </div>

            <div>
              <div className="grid grid-cols-[1fr_135px] border-b border-black">
                <b className="border-r border-black p-2">
                  Total Value of Supply
                </b>
                <span className="p-2 text-right">
                  {show(invoice.totalValueOfSupply)}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_135px] border-b border-black">
                <b className="border-r border-black p-2">
                  VAT Amount
                </b>
                <span className="p-2 text-right">
                  {show(invoice.vatAmount)}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_135px]">
                <b className="border-r border-black p-2">
                  Total Amount Including VAT
                </b>
                <span className="p-2 text-right font-black">
                  {show(invoice.totalAmountIncludingVat)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {'createdBy' in invoice && (
          <footer className="mt-2 flex justify-between text-[9px] text-slate-500 print:text-black">
            <span>
              Created by: {invoice.createdBy || '—'}
            </span>
            <span>
              Created:{' '}
              {invoice.createdAt
                ? new Date(
                    invoice.createdAt
                  ).toLocaleString('en-GB')
                : '—'}
            </span>
          </footer>
        )}
      </article>
    </>
  );
}