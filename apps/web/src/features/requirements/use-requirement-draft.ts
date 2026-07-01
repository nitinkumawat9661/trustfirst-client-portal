"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  error: string | null;
  hydrated: boolean;
  restored: boolean;
  savedAt: string | null;
  clearDraft: () => void;
  saveDraftNow: (values: RequirementWizardInput) => boolean;
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
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrationComplete = useRef(false);

  const saveDraft = useCallback((valuesToSave: unknown) => {
    const parsed = requirementWizardDraftSchema.safeParse(valuesToSave);

    if (!parsed.success) {
      setError("Draft could not be saved in this browser.");
      return false;
    }

    try {
      const updatedAt = new Date().toISOString();
      const draft: StoredDraft = {
        values: parsed.data,
        updatedAt,
      };

      window.localStorage.setItem(draftKey, JSON.stringify(draft));
      setSavedAt(updatedAt);
      setError(null);
      return true;
    } catch {
      setError("Draft could not be saved in this browser.");
      return false;
    }
  }, []);

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
      } else {
        window.setTimeout(() => {
          setError("A previous draft could not be restored.");
        }, 0);
      }
    }

    hydrationComplete.current = true;
    window.setTimeout(() => {
      setHydrated(true);
    }, 0);
  }, [reset]);

  useEffect(() => {
    if (!hydrationComplete.current) {
      return;
    }

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      saveDraft({
        ...defaultRequirementWizardValues,
        ...values,
      });
    }, 600);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [saveDraft, values]);

  function clearDraft() {
    window.localStorage.removeItem(draftKey);
    setSavedAt(null);
    setRestored(false);
    setError(null);
  }

  function saveDraftNow(valuesToSave: RequirementWizardInput) {
    return saveDraft(valuesToSave);
  }

  return { error, hydrated, restored, savedAt, clearDraft, saveDraftNow };
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
