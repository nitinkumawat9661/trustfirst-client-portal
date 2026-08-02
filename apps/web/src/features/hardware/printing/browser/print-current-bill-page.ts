import {
  BILL_PRINT_ROOT_SELECTOR,
  type PrintPreparationResult,
} from "../core/print-contract";

export interface PrintCurrentBillPageInput {
  rootSelector?: string | undefined;
  sourceWindow: Window;
}

/**
 * Prints the bill from the currently open preview page.
 *
 * The page's print stylesheet hides the ERP shell and non-print controls, so
 * the browser print dialog receives the existing `.print-sheet` without
 * opening, cloning, or navigating to another tab.
 */
export async function printCurrentBillPage(
  input: PrintCurrentBillPageInput,
): Promise<PrintPreparationResult> {
  const sourceDocument = input.sourceWindow.document;
  const rootSelector = input.rootSelector ?? BILL_PRINT_ROOT_SELECTOR;
  const printRoot = sourceDocument.querySelector<HTMLElement>(rootSelector);

  if (!printRoot) {
    return { ok: false, message: "Printable bill was not found." };
  }

  try {
    await waitForPrintAssets(sourceDocument, printRoot);
    sourceDocument.documentElement.dataset.printReady = "true";
    sourceDocument.documentElement.dataset.printInvoked = "true";
    sourceDocument.documentElement.dataset.printMode = "same-page";
    input.sourceWindow.focus();
    input.sourceWindow.print();

    return {
      ok: true,
      message: "Print dialog opened on this page. Save as PDF or print on A4.",
    };
  } catch {
    return {
      ok: false,
      message: "Print could not be prepared. Try again.",
    };
  }
}

async function waitForPrintAssets(sourceDocument: Document, printRoot: HTMLElement) {
  const images = Array.from(printRoot.querySelectorAll("img"));
  await Promise.all(images.map((image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      })));

  await sourceDocument.fonts?.ready;
}
