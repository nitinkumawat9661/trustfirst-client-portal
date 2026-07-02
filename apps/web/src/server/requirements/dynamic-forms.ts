import type { z } from "zod";

export type RequirementFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multi_select"
  | "checkbox"
  | "date"
  | "attachment";

export type RequirementCondition = {
  fieldKey: string;
  operator: "equals" | "not_equals" | "contains" | "exists";
  value?: unknown;
};

export type RequirementValidationRule = {
  message: string;
  type: "required" | "min" | "max" | "minLength" | "maxLength" | "pattern";
  value?: number | string;
};

export type RequirementField = {
  conditions?: RequirementCondition[];
  helpText?: string;
  key: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  required?: boolean;
  rules?: RequirementValidationRule[];
  type: RequirementFieldType;
};

export type RequirementFieldGroup = {
  description?: string;
  fields: RequirementField[];
  key: string;
  label: string;
  repeatable?: boolean;
};

export type RequirementSection = {
  description?: string;
  groups: RequirementFieldGroup[];
  key: string;
  label: string;
};

export type RequirementFormSchema = {
  sections: RequirementSection[];
  version: number;
};

export type RequirementValidationIssue = {
  fieldKey: string;
  message: string;
  sectionKey: string;
};

export type RequirementValidationResult = {
  issues: RequirementValidationIssue[];
  valid: boolean;
};

export function validateRequirementPayload(
  schema: RequirementFormSchema,
  data: Record<string, unknown>,
): RequirementValidationResult {
  const issues: RequirementValidationIssue[] = [];

  for (const section of schema.sections) {
    for (const group of section.groups) {
      for (const field of group.fields) {
        if (!conditionsMet(field.conditions, data)) {
          continue;
        }
        const value = data[field.key];
        const required = field.required || field.rules?.some((rule) => rule.type === "required");

        if (required && isEmpty(value)) {
          issues.push({
            fieldKey: field.key,
            message: `${field.label} is required.`,
            sectionKey: section.key,
          });
          continue;
        }

        for (const rule of field.rules ?? []) {
          const message = validateRule(rule, value);
          if (message) {
            issues.push({ fieldKey: field.key, message, sectionKey: section.key });
          }
        }
      }
    }
  }

  return { issues, valid: issues.length === 0 };
}

function conditionsMet(
  conditions: RequirementCondition[] | undefined,
  data: Record<string, unknown>,
) {
  return (conditions ?? []).every((condition) => {
    const value = data[condition.fieldKey];
    if (condition.operator === "exists") return !isEmpty(value);
    if (condition.operator === "equals") return value === condition.value;
    if (condition.operator === "not_equals") return value !== condition.value;
    if (condition.operator === "contains") {
      return Array.isArray(value)
        ? value.includes(condition.value)
        : String(value ?? "").includes(String(condition.value ?? ""));
    }
    return false;
  });
}

function validateRule(rule: RequirementValidationRule, value: unknown) {
  if (isEmpty(value)) return null;
  if (rule.type === "min" && Number(value) < Number(rule.value)) return rule.message;
  if (rule.type === "max" && Number(value) > Number(rule.value)) return rule.message;
  if (rule.type === "minLength" && String(value).length < Number(rule.value)) {
    return rule.message;
  }
  if (rule.type === "maxLength" && String(value).length > Number(rule.value)) {
    return rule.message;
  }
  if (rule.type === "pattern" && !new RegExp(String(rule.value)).test(String(value))) {
    return rule.message;
  }
  return null;
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "";
}

export type InferRequirementForm<TSchema extends z.ZodType> = z.infer<TSchema>;

