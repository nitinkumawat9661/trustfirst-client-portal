"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@trustfirst/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileUp,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";
import {
  defaultRequirementWizardValues,
  requirementWizardSchema,
  type RequirementAttachment,
  type RequirementWizardInput,
} from "./schema";
import {
  requirementSections,
  reviewStepIndex,
  type RequirementField,
} from "./sections";
import { useRequirementDraft } from "./use-requirement-draft";

export function RequirementWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<RequirementWizardInput>({
    resolver: zodResolver(requirementWizardSchema),
    defaultValues: defaultRequirementWizardValues,
    mode: "onBlur",
  });
  const draft = useRequirementDraft({
    control: form.control,
    reset: form.reset,
  });

  const currentSection =
    currentStep < reviewStepIndex ? requirementSections[currentStep] ?? null : null;
  const progress = Math.round(((currentStep + 1) / (reviewStepIndex + 1)) * 100);
  const attachments =
    useWatch({ control: form.control, name: "files.attachments" }) ?? [];
  const savedLabel = draft.savedAt
    ? new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(draft.savedAt))
    : "Not saved yet";

  const stepOptions = useMemo(
    () =>
      requirementSections.map((section, index) => ({
        label: `${index + 1}. ${section.title}`,
        value: index,
      })),
    [],
  );

  async function goNext() {
    if (!currentSection) {
      setCurrentStep(reviewStepIndex);
      return;
    }

    const isValid = await form.trigger(
      currentSection.fields.map((field) => field.name),
      { shouldFocus: true },
    );

    if (isValid) {
      setCurrentStep((step) => Math.min(step + 1, reviewStepIndex));
    }
  }

  function goBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function addAttachments(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? []).map<RequirementAttachment>(
      (file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified,
      }),
    );

    if (nextFiles.length === 0) {
      return;
    }

    form.setValue("files.attachments", [...attachments, ...nextFiles], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function removeAttachment(id: string) {
    form.setValue(
      "files.attachments",
      attachments.filter((attachment) => attachment.id !== id),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function resetDraft() {
    draft.clearDraft();
    form.reset(defaultRequirementWizardValues);
    setCurrentStep(0);
    setSubmitted(false);
  }

  function finalSubmit() {
    draft.clearDraft();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <WizardShell progress={100} savedLabel="Submitted locally">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Complete</Badge>
            <CardTitle>Requirement draft is ready</CardTitle>
            <CardDescription>
              The frontend flow reached final submit. No business workflow or
              API submission was executed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={resetDraft} type="button" variant="outline">
              <RotateCcw className="size-4" />
              Start new draft
            </Button>
          </CardContent>
        </Card>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      progress={progress}
      restored={draft.restored}
      savedLabel={savedLabel}
    >
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="wizard-step">
          Jump to section
        </label>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          id="wizard-step"
          onChange={(event) => setCurrentStep(Number(event.target.value))}
          value={Math.min(currentStep, reviewStepIndex)}
        >
          {stepOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value={reviewStepIndex}>19. Review</option>
        </select>
        <Button onClick={resetDraft} type="button" variant="outline">
          <Trash2 className="size-4" />
          Clear draft
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(finalSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            initial={{ opacity: 0, x: 12 }}
            key={currentStep}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {currentSection ? (
              <SectionStep
                attachments={attachments}
                fields={currentSection.fields}
                form={form}
                onAddAttachments={addAttachments}
                onRemoveAttachment={removeAttachment}
                section={{
                  description: currentSection.description,
                  eyebrow: currentSection.eyebrow,
                  title: currentSection.title,
                }}
              />
            ) : (
              <ReviewStep values={form.getValues()} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            disabled={currentStep === 0}
            onClick={goBack}
            type="button"
            variant="outline"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {currentStep < reviewStepIndex ? (
            <Button onClick={goNext} type="button">
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit">
              <Send className="size-4" />
              Final submit
            </Button>
          )}
        </div>
      </form>
    </WizardShell>
  );
}

function WizardShell({
  children,
  progress,
  restored,
  savedLabel,
}: {
  children: React.ReactNode;
  progress: number;
  restored?: boolean;
  savedLabel: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="mb-4 w-fit">Requirement Wizard</Badge>
        <h1 className="text-3xl font-semibold">New requirement draft</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Capture requirement context across 18 guided sections, review it, and
          prepare it for a future submission workflow.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">{progress}% complete</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Save className="size-4" />
              Draft: {savedLabel}
              {restored ? <span className="text-primary">Restored</span> : null}
            </span>
          </div>
          <div
            aria-label="Wizard progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}

function SectionStep({
  attachments,
  fields,
  form,
  onAddAttachments,
  onRemoveAttachment,
  section,
}: {
  attachments: RequirementAttachment[];
  fields: RequirementField[];
  form: UseFormReturn<RequirementWizardInput>;
  onAddAttachments: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  section: {
    description: string;
    eyebrow: string;
    title: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">{section.eyebrow}</Badge>
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {fields.map((field) => (
          <FieldControl field={field} form={form} key={field.name} />
        ))}
        {section.title === "Files" ? (
          <FileUpload
            attachments={attachments}
            onAddAttachments={onAddAttachments}
            onRemoveAttachment={onRemoveAttachment}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function FieldControl({
  field,
  form,
}: {
  field: RequirementField;
  form: UseFormReturn<RequirementWizardInput>;
}) {
  const fieldState = form.getFieldState(field.name, form.formState);
  const id = field.name.replaceAll(".", "-");

  if (field.type === "checkbox") {
    return (
      <div className="rounded-md border border-border p-4">
        <label className="flex items-start gap-3 text-sm font-medium" htmlFor={id}>
          <input
            className="mt-1 size-4 rounded border-input accent-primary"
            id={id}
            type="checkbox"
            {...form.register(field.name)}
          />
          {field.label}
        </label>
        {fieldState.error ? (
          <p className="mt-2 text-sm text-red-600">{fieldState.error.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {field.label}
      </label>
      {field.multiline ? (
        <Textarea id={id} {...form.register(field.name)} />
      ) : (
        <Input id={id} {...form.register(field.name)} />
      )}
      {field.description ? (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      ) : null}
      {fieldState.error ? (
        <p className="text-sm text-red-600">{fieldState.error.message}</p>
      ) : null}
    </div>
  );
}

function FileUpload({
  attachments,
  onAddAttachments,
  onRemoveAttachment,
}: {
  attachments: RequirementAttachment[];
  onAddAttachments: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-md border border-dashed border-border p-4">
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md bg-muted p-6 text-center transition-colors hover:bg-secondary"
        htmlFor="requirement-files"
      >
        <FileUp className="size-6 text-primary" />
        <span className="text-sm font-medium">Upload supporting files</span>
        <span className="text-xs text-muted-foreground">
          Files are held in browser memory as metadata only for this frontend
          foundation.
        </span>
      </label>
      <input
        className="sr-only"
        id="requirement-files"
        multiple
        onChange={(event) => onAddAttachments(event.currentTarget.files)}
        type="file"
      />
      {attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
              key={attachment.id}
            >
              <span className="min-w-0 truncate">{attachment.name}</span>
              <Button
                aria-label={`Remove ${attachment.name}`}
                onClick={() => onRemoveAttachment(attachment.id)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ReviewStep({ values }: { values: RequirementWizardInput }) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">Review</Badge>
        <CardTitle>Review requirement draft</CardTitle>
        <CardDescription>
          Check the captured sections before final submit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requirementSections.map((section) => (
          <div className="rounded-md border border-border p-4" key={section.id}>
            <h3 className="font-semibold">{section.title}</h3>
            <dl className="mt-3 space-y-3">
              {section.fields.map((field) => (
                <ReviewRow
                  key={field.name}
                  label={field.label}
                  value={readValue(values, field.name)}
                />
              ))}
            </dl>
            {section.id === "files" ? (
              <ReviewRow
                label="Attachments"
                value={
                  values.files.attachments.length > 0
                    ? values.files.attachments
                        .map((attachment) => attachment.name)
                        .join(", ")
                    : "No files attached"
                }
              />
            ) : null}
          </div>
        ))}
        <div className="flex items-start gap-2 rounded-md bg-secondary p-4 text-sm text-secondary-foreground">
          <Check className="mt-0.5 size-4" />
          Final submit validates all required sections and stops at this
          frontend boundary.
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm">{formatValue(value)}</dd>
    </div>
  );
}

function readValue(
  values: RequirementWizardInput,
  path: FieldPath<RequirementWizardInput>,
) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, values);
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Confirmed" : "Not confirmed";
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return "Not provided";
}
