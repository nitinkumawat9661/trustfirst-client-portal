"use client";

import { useInsertionEffect } from "react";
import { REFERENCE_BILL_PDF_OVERRIDES } from "./reference-bill-pdf-overrides";
import { REFERENCE_BILL_PRINT_CSS } from "./reference-bill-styles";

const STYLE_ELEMENT_ID = "reference-bill-preview-styles";

export function ReferenceBillPreviewStyles() {
  useInsertionEffect(() => {
    if (document.getElementById(STYLE_ELEMENT_ID)) return;

    const nonceSource = document.querySelector<HTMLElement & { nonce?: string }>(
      "script[nonce], style[nonce], link[nonce]",
    );
    const style = document.createElement("style");
    const nonce = nonceSource?.nonce?.trim();

    style.id = STYLE_ELEMENT_ID;
    if (nonce) style.nonce = nonce;
    style.textContent = `${REFERENCE_BILL_PRINT_CSS}\n${REFERENCE_BILL_PDF_OVERRIDES}`;
    document.head.append(style);

    return () => style.remove();
  }, []);

  return null;
}
