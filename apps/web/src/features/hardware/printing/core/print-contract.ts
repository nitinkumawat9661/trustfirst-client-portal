export const A4_PRINT_PAGE_RULE = "@page { size: A4 portrait; margin: 5mm 6mm; }";
export const BILL_PRINT_ROOT_SELECTOR = ".print-sheet";
export const NON_PRINT_SELECTOR = ".no-print";
export const DEFAULT_PRINT_WINDOW_FEATURES = "width=1050,height=850";

export interface IsolatedPrintDocumentInput {
  baseHref: string;
  billHtml: string;
  nonce?: string | undefined;
  stylesHtml: string;
  title: string;
}

export type PrintPreparationResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };
