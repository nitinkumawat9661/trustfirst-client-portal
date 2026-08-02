export const REFERENCE_BILL_PDF_OVERRIDES = `
  /* Final pages should use only the height needed by their content. */
  .bill-page-final { min-height: 0; }
  .bill-page-final .bill-table-wrap { flex: 0 0 auto; }
  .bill-page-final .bill-items-table,
  .bill-page-final .bill-items-table tbody { height: auto; }
  .bill-page-final .bill-table-spacer { display: none; }

  /* Customer-entered lowercase addresses should not print as raw lowercase text. */
  .bill-party-name + .bill-party-line { text-transform: capitalize; }

  /* Keep the financial summary readable and prevent GST from appearing twice. */
  .bill-calculation { font-size: 8.6px; }
  .bill-calculation-summary {
    width: 78mm;
    margin-left: auto;
    border-left: 1px solid #18181b;
  }
  .bill-calculation-summary-row {
    display: grid;
    min-height: 6mm;
    grid-template-columns: minmax(0, 1fr) 30mm;
    align-items: stretch;
  }
  .bill-calculation-summary-row + .bill-calculation-summary-row {
    border-top: 1px solid #a1a1aa;
  }
  .bill-calculation-summary-label {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 1.2mm 2mm;
    font-weight: 700;
    text-align: right;
  }
  .bill-calculation-summary-value {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    border-left: 1px solid #18181b;
    padding: 1.2mm 2mm;
    font-variant-numeric: tabular-nums;
  }
  .bill-tax-summary-line {
    border-top: 1px solid #18181b;
    padding: 1.7mm 2mm;
    font-size: 8.2px;
    font-weight: 700;
    line-height: 1.3;
  }
  .bill-roundoff-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 30mm;
    border-top: 1px solid #18181b;
    font-size: 8.6px;
  }
  .bill-roundoff-label {
    padding: 1.3mm 2mm;
    text-align: right;
    font-weight: 700;
  }
  .bill-roundoff-value {
    border-left: 1px solid #18181b;
    padding: 1.3mm 2mm;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .bill-grand-total { font-size: 10px; }
  .bill-grand-total-main,
  .bill-grand-total-value { padding-top: 1.8mm; padding-bottom: 1.8mm; }
  .bill-words { font-size: 8.7px; padding-top: 1.8mm; padding-bottom: 1.8mm; }
  .bill-footer { font-size: 8px; }
  .bill-terms { padding-top: 1.8mm; padding-bottom: 1.8mm; }
  .bill-receiver { min-height: 9mm; }
  .bill-authorisation { min-height: 25mm; }

  @media print {
    .bill-page-final { min-height: 0 !important; }
    .bill-page-final .bill-table-wrap { flex: 0 0 auto !important; }
    .bill-page-final .bill-items-table,
    .bill-page-final .bill-items-table tbody { height: auto !important; }
    .bill-page-final .bill-table-spacer { display: none !important; }
  }
`;
