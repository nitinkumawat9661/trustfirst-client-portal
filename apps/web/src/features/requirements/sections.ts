import type { FieldPath } from "react-hook-form";
import type { RequirementWizardInput } from "./schema";

export type RequirementField = {
  name: FieldPath<RequirementWizardInput>;
  label: string;
  description?: string;
  multiline?: boolean;
  type?: "text" | "checkbox";
};

export type RequirementSection = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  fields: RequirementField[];
};

export const requirementSections: RequirementSection[] = [
  {
    id: "company",
    eyebrow: "Section 01",
    title: "Company profile",
    description: "Capture the organization and primary contact context.",
    fields: [
      { name: "company.organizationName", label: "Organization name" },
      { name: "company.industry", label: "Industry or operating segment" },
      { name: "company.primaryContact", label: "Primary contact" },
    ],
  },
  {
    id: "objectives",
    eyebrow: "Section 02",
    title: "Objectives",
    description: "Define the outcomes the portal should support.",
    fields: [
      { name: "objectives.businessGoal", label: "Primary business goal", multiline: true },
      { name: "objectives.successMetrics", label: "Success metrics", multiline: true },
    ],
  },
  {
    id: "stakeholders",
    eyebrow: "Section 03",
    title: "Stakeholders",
    description: "Identify decision makers and approval expectations.",
    fields: [
      { name: "stakeholders.decisionMakers", label: "Decision makers", multiline: true },
      { name: "stakeholders.approvalProcess", label: "Approval process", multiline: true },
    ],
  },
  {
    id: "users",
    eyebrow: "Section 04",
    title: "Users",
    description: "Document expected user groups and scale.",
    fields: [
      { name: "users.userGroups", label: "User groups", multiline: true },
      { name: "users.estimatedUsers", label: "Estimated users" },
    ],
  },
  {
    id: "workflow",
    eyebrow: "Section 05",
    title: "Workflow",
    description: "Compare the current process with the desired future flow.",
    fields: [
      { name: "workflow.currentProcess", label: "Current process", multiline: true },
      { name: "workflow.desiredWorkflow", label: "Desired workflow", multiline: true },
    ],
  },
  {
    id: "data",
    eyebrow: "Section 06",
    title: "Data",
    description: "Capture source data and migration considerations.",
    fields: [
      { name: "data.dataSources", label: "Data sources", multiline: true },
      { name: "data.migrationNeeds", label: "Migration needs", multiline: true },
    ],
  },
  {
    id: "integrations",
    eyebrow: "Section 07",
    title: "Integrations",
    description: "List connected tools and system touchpoints.",
    fields: [
      { name: "integrations.requiredSystems", label: "Required systems", multiline: true },
      { name: "integrations.integrationNotes", label: "Integration notes", multiline: true },
    ],
  },
  {
    id: "documents",
    eyebrow: "Section 08",
    title: "Documents",
    description: "Outline document types and lifecycle needs.",
    fields: [
      { name: "documents.documentTypes", label: "Document types", multiline: true },
      { name: "documents.retentionNeeds", label: "Retention needs", multiline: true },
    ],
  },
  {
    id: "permissions",
    eyebrow: "Section 09",
    title: "Permissions",
    description: "Define access roles and approval rules.",
    fields: [
      { name: "permissions.accessRoles", label: "Access roles", multiline: true },
      { name: "permissions.approvalRules", label: "Approval rules", multiline: true },
    ],
  },
  {
    id: "notifications",
    eyebrow: "Section 10",
    title: "Notifications",
    description: "Capture messaging channels and escalation rules.",
    fields: [
      { name: "notifications.channels", label: "Notification channels", multiline: true },
      { name: "notifications.escalationRules", label: "Escalation rules", multiline: true },
    ],
  },
  {
    id: "reporting",
    eyebrow: "Section 11",
    title: "Reporting",
    description: "Define dashboards, exports, and reporting expectations.",
    fields: [
      { name: "reporting.dashboardNeeds", label: "Dashboard needs", multiline: true },
      { name: "reporting.exportNeeds", label: "Export needs", multiline: true },
    ],
  },
  {
    id: "compliance",
    eyebrow: "Section 12",
    title: "Compliance",
    description: "Document regulatory and security requirements.",
    fields: [
      { name: "compliance.regulatoryNeeds", label: "Regulatory needs", multiline: true },
      { name: "compliance.securityNotes", label: "Security notes", multiline: true },
    ],
  },
  {
    id: "timeline",
    eyebrow: "Section 13",
    title: "Timeline",
    description: "Capture target launch and milestone expectations.",
    fields: [
      { name: "timeline.targetLaunch", label: "Target launch" },
      { name: "timeline.milestones", label: "Milestones", multiline: true },
    ],
  },
  {
    id: "budget",
    eyebrow: "Section 14",
    title: "Budget",
    description: "Capture budget and procurement notes.",
    fields: [
      { name: "budget.budgetRange", label: "Budget range" },
      { name: "budget.procurementNotes", label: "Procurement notes", multiline: true },
    ],
  },
  {
    id: "support",
    eyebrow: "Section 15",
    title: "Support",
    description: "Define support and enablement expectations.",
    fields: [
      { name: "support.supportModel", label: "Support model", multiline: true },
      { name: "support.trainingNeeds", label: "Training needs", multiline: true },
    ],
  },
  {
    id: "files",
    eyebrow: "Section 16",
    title: "Files",
    description: "Attach supporting files and explain their purpose.",
    fields: [
      { name: "files.uploadNotes", label: "Upload notes", multiline: true },
    ],
  },
  {
    id: "risks",
    eyebrow: "Section 17",
    title: "Risks",
    description: "Surface risks, dependencies, and blockers.",
    fields: [
      { name: "risks.knownRisks", label: "Known risks", multiline: true },
      { name: "risks.dependencies", label: "Dependencies", multiline: true },
    ],
  },
  {
    id: "confirmation",
    eyebrow: "Section 18",
    title: "Confirmation",
    description: "Confirm the draft is ready for final review.",
    fields: [
      { name: "confirmation.submitterName", label: "Submitter name" },
      {
        name: "confirmation.accuracyConfirmed",
        label: "I confirm this requirement draft is ready for review.",
        type: "checkbox",
      },
    ],
  },
] ;

export const reviewStepIndex = requirementSections.length;
