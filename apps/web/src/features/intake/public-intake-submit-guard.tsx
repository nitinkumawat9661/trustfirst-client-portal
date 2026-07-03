"use client";

import { useEffect } from "react";

const draftKey = "trustfirst.public-intake.manglam-trading-demo.native";

export function PublicIntakeSubmitGuard({ formId }: { formId: string }) {
  useEffect(() => {
    const formElement = document.getElementById(formId);
    if (!(formElement instanceof HTMLFormElement)) return;
    const form: HTMLFormElement = formElement;

    restoreDraft(form);

    function persistDraft() {
      window.localStorage.setItem(draftKey, JSON.stringify(formDataToDraft(new FormData(form))));
    }

    function handleSubmit() {
      persistDraft();
      const submitButton = form.querySelector("[data-public-intake-submit]");
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }
    }

    form.addEventListener("input", persistDraft);
    form.addEventListener("change", persistDraft);
    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("input", persistDraft);
      form.removeEventListener("change", persistDraft);
      form.removeEventListener("submit", handleSubmit);
    };
  }, [formId]);

  return null;
}

export function PublicIntakeReceiptDraftCleanup() {
  useEffect(() => {
    window.localStorage.removeItem(draftKey);
  }, []);

  return null;
}

function restoreDraft(form: HTMLFormElement) {
  const stored = window.localStorage.getItem(draftKey);
  if (!stored) return;

  try {
    const values = JSON.parse(stored) as Record<string, string | string[]>;
    for (const [key, value] of Object.entries(values)) {
      const fields = form.elements.namedItem(key);
      if (!fields) continue;

      if (fields instanceof RadioNodeList) {
        for (const field of Array.from(fields)) {
          if (field instanceof HTMLInputElement && field.type === "checkbox") {
            field.checked = Array.isArray(value) ? value.includes(field.value) : field.value === value;
          } else if (field instanceof HTMLInputElement && field.type === "radio") {
            field.checked = field.value === value;
          }
        }
        continue;
      }

      if (
        !Array.isArray(value) &&
        (fields instanceof HTMLInputElement ||
          fields instanceof HTMLTextAreaElement ||
          fields instanceof HTMLSelectElement)
      ) {
        fields.value = value;
      }
    }
  } catch {
    window.localStorage.removeItem(draftKey);
  }
}

function formDataToDraft(formData: FormData) {
  const draft: Record<string, string | string[]> = {};

  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key).filter((value): value is string => typeof value === "string");
    draft[key] = values.length > 1 ? values : (values[0] ?? "");
  }

  return draft;
}
