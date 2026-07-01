"use client";

import { useEffect, useRef, useState } from "react";
import type { Control, UseFormReset } from "react-hook-form";
import { useWatch } from "react-hook-form";
import {
  type RequirementWizardInput,
  defaultRequirementWizardValues,
  requirementWizardDraftSchema,
} from "./schema";

const draftKey = "trustfirst.requirement-wizard.draft";

type StoredDraft = {
  values: RequirementWizardInput;
  updatedAt: string;
};

export type DraftState = {
  restored: boolean;
  savedAt: string | null;
  clearDraft: () => void;
};

export function useRequirementDraft({
  control,
  reset,
}: {
  control: Control<RequirementWizardInput>;
  reset: UseFormReset<RequirementWizardInput>;
}): DraftState {
  const values = useWatch({ control });
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrationComplete = useRef(false);

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(draftKey);

    if (rawDraft) {
      const parsedDraft = parseDraft(rawDraft);

      if (parsedDraft) {
        reset(parsedDraft.values);
        window.setTimeout(() => {
          setSavedAt(parsedDraft.updatedAt);
          setRestored(true);
        }, 0);
      }
    }

    hydrationComplete.current = true;
  }, [reset]);

  useEffect(() => {
    if (!hydrationComplete.current) {
      return;
    }

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      const parsed = requirementWizardDraftSchema.safeParse({
        ...defaultRequirementWizardValues,
        ...values,
      });

      if (!parsed.success) {
        return;
      }

      const updatedAt = new Date().toISOString();
      const draft: StoredDraft = {
        values: parsed.data,
        updatedAt,
      };

      window.localStorage.setItem(draftKey, JSON.stringify(draft));
      setSavedAt(updatedAt);
    }, 600);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [values]);

  function clearDraft() {
    window.localStorage.removeItem(draftKey);
    setSavedAt(null);
    setRestored(false);
  }

  return { restored, savedAt, clearDraft };
}

function parseDraft(rawDraft: string): StoredDraft | null {
  try {
    const parsed = JSON.parse(rawDraft) as Partial<StoredDraft>;
    const values = requirementWizardDraftSchema.safeParse(parsed.values);

    if (!values.success || !parsed.updatedAt) {
      return null;
    }

    return {
      values: values.data,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}
