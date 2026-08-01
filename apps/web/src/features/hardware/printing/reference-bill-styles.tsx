export const REFERENCE_BILL_PRINT_CSS = `
  .bill-page {
    box-sizing: border-box;
    display: flex;
    min-height: 285mm;
    width: 100%;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #18181b;
    background: #fff;
    box-shadow: 0 8px 30px rgb(0 0 0 / 12%);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    line-height: 1.15;
  }
  .bill-page + .bill-page { margin-top: 8mm; }
  .bill-header { border-bottom: 1px solid #18181b; padding: 2.5mm 2.5mm 2mm; }
  .bill-header-top {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: start;
    gap: 2mm;
    font-size: 8.5px;
    font-weight: 700;
  }
  .bill-copy-label { text-align: right; font-style: italic; font-weight: 500; }
  .bill-document-label {
    border-bottom: 1px solid #18181b;
    padding: 0 4mm 0.5mm;
    font-size: 10px;
    text-align: center;
  }
  .bill-brand-row {
    display: grid;
    grid-template-columns: 18mm minmax(0, 1fr) 18mm;
    align-items: center;
    margin-top: 0.5mm;
  }
  .bill-logo { height: 13mm; width: 13mm; object-fit: contain; }
  .bill-brand-copy { min-width: 0; text-align: center; }
  .bill-firm-name { font-size: 15px; font-weight: 800; letter-spacing: 0.2px; line-height: 1; }
  .bill-tagline { margin-top: 0.7mm; font-size: 7.5px; font-weight: 700; }
  .bill-address { margin-top: 0.8mm; font-size: 8px; }
  .bill-contact { margin-top: 0.5mm; font-size: 7.5px; font-style: italic; font-weight: 600; }
  .bill-party-document {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    border-bottom: 1px solid #18181b;
  }
  .bill-party-box,
  .bill-document-box { min-height: 31mm; padding: 2mm 2.5mm; }
  .bill-document-box { border-left: 1px solid #18181b; }
  .bill-box-title { font-size: 9px; font-style: italic; font-weight: 700; }
  .bill-party-name { margin-top: 0.7mm; font-size: 9px; font-weight: 700; }
  .bill-party-line { margin-top: 0.5mm; font-size: 8px; }
  .bill-party-spacer { height: 3mm; }
  .bill-detail-grid {
    display: grid;
    grid-template-columns: 27mm 3mm minmax(0, 1fr);
    gap: 0.35mm 0;
    font-size: 8px;
  }
  .bill-detail-grid dd { min-width: 0; overflow-wrap: anywhere; }
  .bill-cancelled {
    border-bottom: 1px solid #18181b;
    padding: 1.2mm 2mm;
    text-align: center;
    font-size: 8px;
    font-weight: 800;
  }
  .bill-table-wrap {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    overflow: hidden;
  }
  .bill-items-table {
    height: 100%;
    width: 100%;
    min-width: 0;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 7.35px;
    line-height: 1.05;
  }
  .bill-items-table th,
  .bill-items-table td {
    box-sizing: border-box;
    border-right: 1px solid #3f3f46;
    padding: 0.45mm 0.65mm;
    vertical-align: top;
  }
  .bill-items-table th:last-child,
  .bill-items-table td:last-child { border-right: 0; }
  .bill-items-table thead th {
    border-bottom: 1px solid #18181b;
    padding-top: 1mm;
    padding-bottom: 1mm;
    font-size: 7.6px;
    font-weight: 800;
    text-align: center;
    white-space: nowrap;
  }
  .bill-items-table tbody td { white-space: nowrap; }
  .bill-items-table .bill-description {
    overflow: hidden;
    text-overflow: clip;
    white-space: nowrap;
  }
  .bill-items-table .bill-description-long { font-size: 6.65px; letter-spacing: -0.08px; }
  .bill-number { text-align: right; font-variant-numeric: tabular-nums; }
  .bill-center { text-align: center; }
  .bill-carry-row td { padding-top: 0.8mm; padding-bottom: 0.8mm; font-weight: 800; }
  .bill-table-spacer { height: 100%; }
  .bill-table-spacer td { padding: 0; }
  .bill-items-table tfoot td {
    border-top: 1px solid #18181b;
    padding-top: 1.1mm;
    padding-bottom: 1.1mm;
    font-size: 8px;
    font-weight: 800;
  }
  .bill-calculation { border-top: 1px solid #18181b; font-size: 8px; }
  .bill-calculation-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 30mm;
  }
  .bill-calculation-labels {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 1mm 2mm;
    padding: 1.7mm 2mm 1.4mm;
    text-align: right;
  }
  .bill-calculation-values {
    border-left: 1px solid #18181b;
    padding: 1.7mm 2mm 1.4mm;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .bill-calculation-values div + div { margin-top: 0.6mm; }
  .bill-grand-total {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 30mm;
    border-top: 1px solid #18181b;
    font-size: 9px;
    font-weight: 800;
  }
  .bill-grand-total-main {
    display: flex;
    justify-content: center;
    gap: 8mm;
    padding: 1.4mm 2mm;
  }
  .bill-grand-total-value {
    border-left: 1px solid #18181b;
    padding: 1.4mm 2mm;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .bill-tax-summary-line {
    border-top: 1px solid #18181b;
    padding: 1.3mm 2mm;
    font-size: 7.2px;
    font-weight: 700;
  }
  .bill-words {
    border-top: 1px solid #18181b;
    padding: 1.6mm 2mm;
    font-size: 8.2px;
    font-weight: 700;
  }
  .bill-footer {
    display: grid;
    grid-template-columns: 1fr 1.35fr;
    border-top: 1px solid #18181b;
    font-size: 7.2px;
  }
  .bill-terms { padding: 1.5mm 2mm; }
  .bill-terms-title { border-bottom: 1px solid #18181b; display: inline-block; font-weight: 800; }
  .bill-terms ol { margin: 1mm 0 0; padding-left: 4mm; }
  .bill-terms li + li { margin-top: 0.45mm; }
  .bill-legal-name { margin-top: 1mm; font-weight: 600; }
  .bill-signature { border-left: 1px solid #18181b; display: flex; flex-direction: column; }
  .bill-receiver { min-height: 8mm; border-bottom: 1px solid #18181b; padding: 1.5mm 2mm; font-weight: 700; }
  .bill-authorisation {
    display: flex;
    min-height: 22mm;
    flex: 1;
    flex-direction: column;
    justify-content: space-between;
    padding: 2mm;
    text-align: right;
  }
  .bill-authorisation-firm { text-align: center; font-size: 8.5px; font-weight: 800; }
  .bill-signature-label { font-size: 8.5px; font-weight: 800; }

  @media print {
    @page { size: A4 portrait; margin: 5mm 6mm; }
    html, body {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body [class*="min-h-screen"] { min-height: 0 !important; }
    body header.sticky { display: none !important; }
    body aside.fixed { display: none !important; }
    body [class*="fixed"][class*="bottom-"] { display: none !important; }
    body .lg\\:pl-64 { padding-left: 0 !important; }
    body main.px-3.py-5 { padding: 0 !important; }
    .no-print { display: none !important; }
    .print-sheet { width: 100% !important; max-width: none !important; overflow: visible !important; }
    .bill-page {
      min-height: 285mm !important;
      width: 100% !important;
      margin: 0 !important;
      overflow: hidden !important;
      break-after: page;
      page-break-after: always;
      box-shadow: none !important;
    }
    .bill-page:last-child { break-after: auto; page-break-after: auto; }
    .bill-page + .bill-page { margin-top: 0 !important; }
    .bill-table-wrap { overflow: hidden !important; }
    .bill-items-table { width: 100% !important; min-width: 0 !important; }
    .bill-items-table thead { display: table-header-group; }
    .bill-items-table tr { break-inside: avoid; page-break-inside: avoid; }
    .bill-footer,
    .bill-calculation,
    .bill-grand-total,
    .bill-tax-summary-line,
    .bill-words { break-inside: avoid; page-break-inside: avoid; }
  }
`;

export function ReferenceBillStyles() {
  return <style>{REFERENCE_BILL_PRINT_CSS}</style>;
}
