import { buildIsolatedPrintDocument } from "../core/build-isolated-print-document";
import {
  BILL_PRINT_ROOT_SELECTOR,
  DEFAULT_PRINT_WINDOW_FEATURES,
  NON_PRINT_SELECTOR,
  type PrintPreparationResult,
} from "../core/print-contract";

export interface OpenIsolatedBillPrintInput {
  fileName?: string | undefined;
  printDelayMs?: number | undefined;
  rootSelector?: string | undefined;
  sourceWindow: Window;
}

type PrintAssets = {
  css: string;
  linksHtml: string;
};

/**
 * Browser adapter for the bill-only print flow.
 *
 * DOM access and window side effects live here instead of the React component
 * or the pure print-document builder. This separation keeps printing changes
 * from leaking into billing calculations, persistence, inventory, or routing.
 */
export async function openIsolatedBillPrint(
  input: OpenIsolatedBillPrintInput,
): Promise<PrintPreparationResult> {
  const sourceDocument = input.sourceWindow.document;
  const rootSelector = input.rootSelector ?? BILL_PRINT_ROOT_SELECTOR;
  const printRoot = sourceDocument.querySelector<HTMLElement>(rootSelector);

  if (!printRoot) {
    return { ok: false, message: "Printable bill was not found." };
  }

  const printWindow = input.sourceWindow.open(
    "",
    "_blank",
    DEFAULT_PRINT_WINDOW_FEATURES,
  );

  if (!printWindow) {
    return {
      ok: false,
      message: "Popup blocked. Allow popups for this site and try again.",
    };
  }

  try {
    const nonce = sourceDocument.querySelector<HTMLStyleElement>("style[nonce]")?.nonce;
    const documentAssets = collectPrintAssets(sourceDocument.head);
    const { billClone, embeddedAssets } = clonePrintableBill(printRoot);
    const title = input.fileName?.trim() || "Mangalam Sanitary Bill";

    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(buildIsolatedPrintDocument({
      baseHref: `${input.sourceWindow.location.origin}/`,
      billHtml: billClone.outerHTML,
      nonce,
      printCss: joinTextFragments(documentAssets.css, embeddedAssets.css),
      stylesHtml: joinTextFragments(
        documentAssets.linksHtml,
        embeddedAssets.linksHtml,
      ),
      title,
    }));
    printWindow.document.close();

    await waitForPrintAssets(printWindow);
    printWindow.document.documentElement.dataset.printReady = "true";

    input.sourceWindow.setTimeout(() => {
      if (printWindow.closed) return;
      printWindow.document.documentElement.dataset.printInvoked = "true";
      printWindow.focus();
      printWindow.print();
    }, input.printDelayMs ?? 150);

    return {
      ok: true,
      message: "Bill-only print dialog opened. Save as PDF or print on A4.",
    };
  } catch {
    printWindow.close();
    return {
      ok: false,
      message: "Print document could not be prepared. Try again.",
    };
  }
}

function clonePrintableBill(printRoot: HTMLElement) {
  const clone = printRoot.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(NON_PRINT_SELECTOR).forEach((node) => node.remove());
  const embeddedAssets = collectPrintAssets(clone);
  clone.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove());
  return { billClone: clone, embeddedAssets };
}

function collectPrintAssets(root: ParentNode): PrintAssets {
  const css = Array.from(root.querySelectorAll<HTMLStyleElement>("style"))
    .map((style) => style.textContent ?? "")
    .join(String.fromCharCode(10));
  const linksHtml = Array.from(root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map((link) => link.outerHTML)
    .join(String.fromCharCode(10));
  return { css, linksHtml };
}

function joinTextFragments(...fragments: string[]) {
  return fragments.filter((fragment) => fragment.trim()).join(String.fromCharCode(10));
}

async function waitForPrintAssets(printWindow: Window) {
  const images = Array.from(printWindow.document.images);
  await Promise.all(images.map((image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      })));

  await printWindow.document.fonts?.ready;
}
