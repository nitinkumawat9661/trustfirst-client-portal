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
  cn,
} from "@trustfirst/ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileUp,
  Keyboard,
  ListChecks,
  Loader2,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldErrors,
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
  type RequirementField,
} from "./sections";
import { useRequirementDraft } from "./use-requirement-draft";

type WizardPhase = "welcome" | "overview" | "section" | "review" | "summary" | "success";

type ValidationIssue = {
  label: string;
  path: FieldPath<RequirementWizardInput>;
  sectionIndex: number;
  sectionTitle: string;
  message: string;
};

const allFields: RequirementField[] = requirementSections.flatMap(
  (section) => section.fields,
);

export function RequirementWizard() {
  const [phase, setPhase] = useState<WizardPhase>("welcome");
  const [currentStep, setCurrentStep] = useState(0);
  const [manualSaveMessage, setManualSaveMessage] = useState<string | null>(null);
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useForm<RequirementWizardInput>({
    resolver: zodResolver(requirementWizardSchema),
    defaultValues: defaultRequirementWizardValues,
    mode: "onBlur",
  });
  const draft = useRequirementDraft({
    control: form.control,
    reset: form.reset,
  });
  const attachments =
    useWatch({ control: form.control, name: "files.attachments" }) ?? [];
  const currentSection = requirementSections[currentStep] ?? requirementSections[0]!;
  const completedSections = requirementSections.filter((section) =>
    isSectionComplete(form.getValues(), section.fields),
  ).length;
  const progress =
    phase === "success"
      ? 100
      : Math.round((completedSections / requirementSections.length) * 100);
  const validationIssues = getValidationIssues(form.formState.errors);
  const sectionCompletion = requirementSections.map((section) =>
    isSectionComplete(form.getValues(), section.fields),
  );
  const savedLabel = draft.savedAt
    ? new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(draft.savedAt))
    : "Not saved yet";

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: "easeOut" as const };

  const motionProps = shouldReduceMotion
    ? { animate: { opacity: 1 }, exit: { opacity: 0 }, initial: { opacity: 0 } }
    : {
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        initial: { opacity: 0, y: 8 },
      };

  useEffect(() => {
    headingRef.current?.focus();
  }, [phase, currentStep]);

  useEffect(() => {
    function warnBeforeLeave(event: BeforeUnloadEvent) {
      if (form.formState.isDirty && phase !== "success") {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", warnBeforeLeave);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeave);
    };
  }, [form.formState.isDirty, phase]);

  useEffect(() => {
    if (!manualSaveMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setManualSaveMessage(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [manualSaveMessage]);

  function startWizard() {
    setPhase("overview");
  }

  function beginSections() {
    setPhase("section");
    setCurrentStep(0);
  }

  async function goNext() {
    const isValid = await form.trigger(
      currentSection.fields.map((field) => field.name),
      { shouldFocus: true },
    );

    if (!isValid) {
      setPhase("summary");
      return;
    }

    if (currentStep === requirementSections.length - 1) {
      setPhase("review");
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, requirementSections.length - 1));
  }

  function goBack() {
    if (phase === "overview") {
      setPhase("welcome");
      return;
    }

    if (phase === "review" || phase === "summary") {
      setPhase("section");
      return;
    }

    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function jumpToSection(index: number) {
    setCurrentStep(index);
    setPhase("section");
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

  function saveDraft() {
    const saved = draft.saveDraftNow(form.getValues());
    setManualSaveMessage(
      saved ? "Draft saved in this browser." : "Draft could not be saved.",
    );
  }

  function resetDraft() {
    draft.clearDraft();
    form.reset(defaultRequirementWizardValues);
    setCurrentStep(0);
    setPhase("welcome");
    setRequirementId(null);
  }

  async function finalSubmit() {
    const isValid = await form.trigger(undefined, { shouldFocus: true });

    if (!isValid) {
      setPhase("summary");
      return;
    }

    draft.clearDraft();
    setRequirementId(generateRequirementId());
    setPhase("success");
  }

  function renderActiveScreen() {
    if (phase === "welcome") {
      return (
        <WelcomeScreen
          headingRef={headingRef}
          onResume={beginSections}
          onStart={startWizard}
          restored={draft.restored}
        />
      );
    }

    if (phase === "overview") {
      return (
        <SectionOverview
          headingRef={headingRef}
          onBack={goBack}
          onStart={beginSections}
        />
      );
    }

    if (phase === "section") {
      return (
        <form onSubmit={(event) => event.preventDefault()}>
          <SectionStep
            attachments={attachments}
            fields={currentSection.fields}
            form={form}
            headingRef={headingRef}
            onAddAttachments={addAttachments}
            onNext={goNext}
            onRemoveAttachment={removeAttachment}
            section={{
              description: currentSection.description,
              eyebrow: currentSection.eyebrow,
              title: currentSection.title,
            }}
          />
          <WizardActions
            canGoBack={currentStep > 0}
            nextLabel={
              currentStep === requirementSections.length - 1
                ? "Review"
                : "Continue"
            }
            onBack={goBack}
            onNext={goNext}
          />
        </form>
      );
    }

    if (phase === "review") {
      return (
        <ReviewStep
          headingRef={headingRef}
          onBack={goBack}
          onFinalSubmit={finalSubmit}
          values={form.getValues()}
        />
      );
    }

    if (phase === "summary") {
      return (
        <ValidationSummary
          headingRef={headingRef}
          issues={validationIssues}
          onBack={goBack}
          onJumpToSection={jumpToSection}
        />
      );
    }

    if (phase === "success" && requirementId) {
      return (
        <SuccessScreen
          headingRef={headingRef}
          onReset={resetDraft}
          requirementId={requirementId}
        />
      );
    }

    return null;
  }

  if (!draft.hydrated) {
    return <LoadingState />;
  }

  if (draft.error) {
    return (
      <WizardChrome
        activeStep={currentStep}
        completedSections={completedSections}
        onJumpToSection={jumpToSection}
        progress={progress}
        savedLabel={savedLabel}
        sectionCompletion={sectionCompletion}
      >
        <ErrorState message={draft.error} onReset={resetDraft} />
      </WizardChrome>
    );
  }

  return (
    <WizardChrome
      activeStep={currentStep}
      completedSections={completedSections}
      manualSaveMessage={manualSaveMessage}
      onJumpToSection={jumpToSection}
      onSaveDraft={saveDraft}
      progress={progress}
      restored={draft.restored}
      savedLabel={savedLabel}
      sectionCompletion={sectionCompletion}
    >
      <AnimatePresence mode="wait">
        <motion.div
          {...motionProps}
          key={`${phase}-${currentStep}`}
          transition={transition}
        >
          {renderActiveScreen()}
        </motion.div>
      </AnimatePresence>
    </WizardChrome>
  );
}

function WizardChrome({
  activeStep,
  children,
  completedSections,
  manualSaveMessage,
  onJumpToSection,
  onSaveDraft,
  progress,
  restored,
  savedLabel,
  sectionCompletion,
}: {
  activeStep: number;
  children: React.ReactNode;
  completedSections: number;
  manualSaveMessage?: string | null;
  onJumpToSection: (index: number) => void;
  onSaveDraft?: () => void;
  progress: number;
  restored?: boolean;
  savedLabel: string;
  sectionCompletion: boolean[];
}) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="sticky top-20 z-10 -mx-4 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:top-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge>Requirement Wizard</Badge>
              <span className="text-muted-foreground">
                {completedSections} of {requirementSections.length} sections complete
              </span>
            </div>
            <div
              aria-label="Wizard progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
            {manualSaveMessage ? (
              <span aria-live="polite" className="text-primary">
                {manualSaveMessage}
              </span>
            ) : null}
            <span className="flex items-center gap-2 text-muted-foreground">
              <Save className="size-4" />
              Draft: {savedLabel}
              {restored ? <span className="text-primary">Restored</span> : null}
            </span>
            {onSaveDraft ? (
              <Button onClick={onSaveDraft} size="sm" type="button" variant="outline">
                <Save className="size-4" />
                Save draft
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {restored ? (
        <div
          className="rounded-md border border-primary/30 bg-secondary p-4 text-sm text-secondary-foreground"
          role="status"
        >
          A previous draft was restored on this device.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="order-1 min-w-0 lg:order-2">{children}</div>
        <SectionSidebar
          activeStep={activeStep}
          onJumpToSection={onJumpToSection}
          sectionCompletion={sectionCompletion}
        />
      </div>
    </div>
  );
}

function SectionSidebar({
  activeStep,
  onJumpToSection,
  sectionCompletion,
}: {
  activeStep: number;
  onJumpToSection: (index: number) => void;
  sectionCompletion: boolean[];
}) {
  return (
    <aside className="order-2 lg:sticky lg:top-36 lg:order-1 lg:self-start">
      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>Jump between sections at any time.</CardDescription>
        </CardHeader>
        <CardContent>
          <nav aria-label="Requirement sections" className="max-h-72 overflow-auto lg:max-h-[60vh]">
            <ol className="space-y-1">
              {requirementSections.map((section, index) => (
                <li key={section.id}>
                  <button
                    aria-current={activeStep === index ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeStep === index
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground",
                    )}
                    onClick={() => onJumpToSection(index)}
                    type="button"
                    >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{section.title}</span>
                    {sectionCompletion[index] ? (
                      <CheckCircle2
                        aria-label="Complete"
                        className="size-4 text-primary"
                      />
                    ) : (
                      <span
                        aria-label="Incomplete"
                        className="size-4 rounded-full border border-border"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </CardContent>
      </Card>
    </aside>
  );
}

function FocusableTitle({
  children,
  headingRef,
}: {
  children: React.ReactNode;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <h2
      className="text-base font-semibold leading-none"
      ref={headingRef}
      tabIndex={-1}
    >
      {children}
    </h2>
  );
}

function WelcomeScreen({
  headingRef,
  onResume,
  onStart,
  restored,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onResume: () => void;
  onStart: () => void;
  restored?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">Welcome</Badge>
        <FocusableTitle headingRef={headingRef}>
          Start a requirement draft
        </FocusableTitle>
        <CardDescription>
          This guided setup helps collect the information needed for a future
          requirement intake workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile icon={<Clock3 className="size-5" />} label="Estimated time" value="12-18 min" />
          <InfoTile icon={<ListChecks className="size-5" />} label="Sections" value="18 guided steps" />
          <InfoTile icon={<Keyboard className="size-5" />} label="Keyboard" value="Tab and Enter ready" />
        </div>
        <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          No API calls, authentication, or database persistence are performed in
          this frontend foundation.
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onStart} type="button">
            View section overview
            <ArrowRight className="size-4" />
          </Button>
          {restored ? (
            <Button onClick={onResume} type="button" variant="outline">
              Resume previous draft
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SectionOverview({
  headingRef,
  onBack,
  onStart,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">Overview</Badge>
        <FocusableTitle headingRef={headingRef}>
          What you will complete
        </FocusableTitle>
        <CardDescription>
          Review the sections before starting the requirement draft.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="grid gap-2 sm:grid-cols-2">
          {requirementSections.map((section, index) => (
            <li
              className="rounded-md border border-border p-3 text-sm"
              key={section.id}
            >
              <span className="text-muted-foreground">Section {index + 1}</span>
              <p className="font-medium">{section.title}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button onClick={onBack} type="button" variant="outline">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={onStart} type="button">
            Start sections
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionStep({
  attachments,
  fields,
  form,
  headingRef,
  onAddAttachments,
  onNext,
  onRemoveAttachment,
  section,
}: {
  attachments: RequirementAttachment[];
  fields: RequirementField[];
  form: UseFormReturn<RequirementWizardInput>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onAddAttachments: (files: FileList | null) => void;
  onNext: () => void;
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
        <FocusableTitle headingRef={headingRef}>
          {section.title}
        </FocusableTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {fields.map((field) => (
          <FieldControl field={field} form={form} key={field.name} onNext={onNext} />
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
  onNext,
}: {
  field: RequirementField;
  form: UseFormReturn<RequirementWizardInput>;
  onNext: () => void;
}) {
  const fieldState = form.getFieldState(field.name, form.formState);
  const id = field.name.replaceAll(".", "-");

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onNext();
    }
  }

  if (field.type === "checkbox") {
    return (
      <div className="rounded-md border border-border p-4">
        <label className="flex items-start gap-3 text-sm font-medium" htmlFor={id}>
          <input
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? `${id}-error` : undefined}
            className="mt-1 size-4 rounded border-input accent-primary"
            id={id}
            type="checkbox"
            {...form.register(field.name)}
          />
          {field.label}
        </label>
        {fieldState.error ? (
          <p className="mt-2 text-sm text-red-600" id={`${id}-error`} role="alert">
            {fieldState.error.message}
          </p>
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
        <Textarea
          aria-invalid={fieldState.invalid}
          aria-describedby={fieldState.error ? `${id}-error` : undefined}
          id={id}
          {...form.register(field.name)}
        />
      ) : (
        <Input
          aria-invalid={fieldState.invalid}
          aria-describedby={fieldState.error ? `${id}-error` : undefined}
          id={id}
          onKeyDown={handleKeyDown}
          {...form.register(field.name)}
        />
      )}
      {fieldState.error ? (
        <p className="text-sm text-red-600" id={`${id}-error`} role="alert">
          {fieldState.error.message}
        </p>
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
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md bg-muted p-5 text-center transition-colors hover:bg-secondary motion-reduce:transition-none"
        htmlFor="requirement-files"
      >
        <FileUp className="size-6 text-primary" />
        <span className="text-sm font-medium">Upload supporting files</span>
        <span className="text-xs text-muted-foreground">
          Files are held in browser memory as metadata only.
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
      ) : (
        <EmptyState message="No files attached yet." />
      )}
    </div>
  );
}

function WizardActions({
  canGoBack,
  nextLabel,
  onBack,
  onNext,
}: {
  canGoBack: boolean;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
      <Button disabled={!canGoBack} onClick={onBack} type="button" variant="outline">
        <ArrowLeft className="size-4" />
        Back
      </Button>
      <Button onClick={onNext} type="button">
        {nextLabel}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function ReviewStep({
  headingRef,
  onBack,
  onFinalSubmit,
  values,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onFinalSubmit: () => void;
  values: RequirementWizardInput;
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">Review</Badge>
        <FocusableTitle headingRef={headingRef}>
          Review requirement draft
        </FocusableTitle>
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
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={onBack} type="button" variant="outline">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={onFinalSubmit} type="button">
            <Send className="size-4" />
            Final submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationSummary({
  headingRef,
  issues,
  onBack,
  onJumpToSection,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  issues: ValidationIssue[];
  onBack: () => void;
  onJumpToSection: (index: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">Validation</Badge>
        <FocusableTitle headingRef={headingRef}>
          Review required fields
        </FocusableTitle>
        <CardDescription>
          Complete the items below before final submit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.length > 0 ? (
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li
                className="rounded-md border border-border p-3 text-sm"
                key={issue.path}
              >
                <p className="font-medium">{issue.sectionTitle}</p>
                <p className="text-muted-foreground">
                  {issue.label}: {issue.message}
                </p>
                <Button
                  className="mt-3"
                  onClick={() => onJumpToSection(issue.sectionIndex)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Fix section
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No validation issues are currently visible." />
        )}
        <Button onClick={onBack} type="button" variant="outline">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </CardContent>
    </Card>
  );
}

function SuccessScreen({
  headingRef,
  onReset,
  requirementId,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onReset: () => void;
  requirementId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">Complete</Badge>
        <FocusableTitle headingRef={headingRef}>
          Requirement draft is ready
        </FocusableTitle>
        <CardDescription>
          Placeholder Requirement ID generated on the frontend only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground">Requirement ID</p>
          <p className="mt-1 font-mono text-lg font-semibold">{requirementId}</p>
        </div>
        <div className="flex items-start gap-2 rounded-md bg-secondary p-4 text-sm text-secondary-foreground">
          <Check className="mt-0.5 size-4" />
          No API call, authentication check, or database persistence was run.
        </div>
        <Button onClick={onReset} type="button" variant="outline">
          <RotateCcw className="size-4" />
          Start new draft
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card>
      <CardContent className="flex min-h-64 items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
          Loading draft state...
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">Draft error</Badge>
        <CardTitle>Draft could not be restored</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onReset} type="button" variant="outline">
          <Trash2 className="size-4" />
          Clear local draft
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm">{formatValue(value)}</dd>
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

function isSectionComplete(
  values: RequirementWizardInput,
  fields: RequirementField[],
) {
  return fields.every((field) => {
    const value = readValue(values, field.name);

    if (typeof value === "boolean") {
      return value;
    }

    return typeof value === "string" && value.trim().length > 0;
  });
}

function getValidationIssues(
  errors: FieldErrors<RequirementWizardInput>,
): ValidationIssue[] {
  return allFields.flatMap((field) => {
    const error = readError(errors, field.name);

    if (!error) {
      return [];
    }

    const sectionIndex = requirementSections.findIndex((section) =>
      section.fields.some((sectionField) => sectionField.name === field.name),
    );
    const section = requirementSections[sectionIndex] ?? requirementSections[0]!;

    return [
      {
        label: field.label,
        message: error,
        path: field.name,
        sectionIndex: Math.max(sectionIndex, 0),
        sectionTitle: section.title,
      },
    ];
  });
}

function readError(
  errors: FieldErrors<RequirementWizardInput>,
  path: FieldPath<RequirementWizardInput>,
) {
  const leaf = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, errors);

  if (
    leaf &&
    typeof leaf === "object" &&
    "message" in leaf &&
    typeof leaf.message === "string"
  ) {
    return leaf.message;
  }

  return null;
}

function generateRequirementId() {
  const segment =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `REQ-${segment.toUpperCase()}`;
}
