import { describe, expect, it } from "vitest";
import { CommercialPlatformService } from "./commercial-platform-service";

describe("CommercialPlatformService", () => {
  const service = new CommercialPlatformService();

  it("validates visual workflow edges", () => {
    expect(
      service.validateWorkflow({
        edges: [{ from: "lead", id: "edge_1", to: "missing" }],
        id: "workflow_1",
        name: "Lead to delivery",
        nodes: [{ id: "lead", kind: "start", label: "Lead" }],
        version: 1,
      }),
    ).toMatchObject({
      issues: [{ code: "UNKNOWN_TO_NODE" }],
      valid: false,
    });
  });

  it("requires automation triggers and actions", () => {
    expect(
      service.validateAutomation({
        actions: [],
        conditions: [],
        enabled: true,
        id: "automation_1",
        name: "Requirement submitted",
        trigger: { eventName: "" },
        version: 1,
      }).issues.map((issue) => issue.code),
    ).toEqual(["NO_ACTIONS", "NO_TRIGGER"]);
  });

  it("detects duplicate visual form field keys", () => {
    expect(
      service.validateFormTemplate({
        category: "requirement",
        id: "form_1",
        name: "Requirement intake",
        reusable: true,
        sections: [
          {
            fields: [
              { key: "summary", label: "Summary", type: "text" },
              { key: "summary", label: "Summary duplicate", type: "textarea" },
            ],
            key: "overview",
            label: "Overview",
          },
        ],
        version: 1,
      }),
    ).toMatchObject({
      issues: [{ code: "DUPLICATE_FIELD" }],
      valid: false,
    });
  });

  it("requires plugin capabilities", () => {
    expect(
      service.validatePluginManifest({
        capabilities: [],
        category: "payment_provider",
        id: "plugin_1",
        name: "Provider",
        version: "1.0.0",
      }),
    ).toMatchObject({
      issues: [{ code: "NO_CAPABILITIES" }],
      valid: false,
    });
  });
});

