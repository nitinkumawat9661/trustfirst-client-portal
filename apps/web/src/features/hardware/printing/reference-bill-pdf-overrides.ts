export const REFERENCE_BILL_PDF_OVERRIDES = `
  /* Keep short bills balanced instead of stretching a mostly empty item grid over full A4 height. */
  .bill-page { min-height: 245mm; }

  /* Customer-entered lowercase addresses should not print as raw lowercase text. */
  .bill-party-name + .bill-party-line { text-transform: capitalize; }

  /* The first summary amount is before discount, so label it accurately. */
  .bill-calculation-labels > div:first-child { font-size: 0; }
  .bill-calculation-labels > div:first-child::after {
    content: "Gross Total";
    font-size: 8.6px;
  }

  /* Keep the financial and signature sections readable in the saved PDF. */
  .bill-calculation { font-size: 8.6px; }
  .bill-calculation-labels,
  .bill-calculation-values { padding-top: 2mm; padding-bottom: 1.8mm; }
  .bill-grand-total { font-size: 10px; }
  .bill-grand-total-main,
  .bill-grand-total-value { padding-top: 1.8mm; padding-bottom: 1.8mm; }
  .bill-tax-summary-line { font-size: 8px; padding-top: 1.6mm; padding-bottom: 1.6mm; }
  .bill-words { font-size: 8.7px; padding-top: 1.8mm; padding-bottom: 1.8mm; }
  .bill-footer { font-size: 8px; }
  .bill-terms { padding-top: 1.8mm; padding-bottom: 1.8mm; }
  .bill-receiver { min-height: 9mm; }
  .bill-authorisation { min-height: 25mm; }

  @media print {
    .bill-page { min-height: 245mm !important; }
  }
`;
