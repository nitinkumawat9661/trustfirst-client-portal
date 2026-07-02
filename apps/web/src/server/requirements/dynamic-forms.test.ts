import { describe, expect, it } from "vitest";
import { validateRequirementPayload, type RequirementFormSchema } from "./dynamic-forms";

const schema: RequirementFormSchema = {
  sections: [
    {
      groups: [
        {
          fields: [
            { key: "title", label: "Title", required: true, type: "text" },
            {
              conditions: [{ fieldKey: "needsBudget", operator: "equals", value: true }],
              key: "budget",
              label: "Budget",
              rules: [{ message: "Budget must be at least 100.", type: "min", value: 100 }],
              type: "number",
            },
          ],
          key: "basics",
          label: "Basics",
        },
      ],
      key: "overview",
      label: "Overview",
    },
  ],
  version: 1,
};

describe("dynamic requirement forms", () => {
  it("validates required and conditional fields", () => {
    expect(validateRequirementPayload(schema, {}).valid).toBe(false);
    expect(
      validateRequirementPayload(schema, {
        budget: 50,
        needsBudget: true,
        title: "ERP rollout",
      }).issues,
    ).toEqual([
      {
        fieldKey: "budget",
        message: "Budget must be at least 100.",
        sectionKey: "overview",
      },
    ]);
    expect(
      validateRequirementPayload(schema, {
        needsBudget: false,
        title: "ERP rollout",
      }).valid,
    ).toBe(true);
  });
});

