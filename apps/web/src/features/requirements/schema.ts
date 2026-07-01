import { z } from "zod";

const requiredText = z.string().trim().min(2, "This field is required.");
const optionalText = z.string().trim().optional();

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().nonnegative(),
  type: z.string(),
  lastModified: z.number(),
});

export const requirementWizardSchema = z.object({
  company: z.object({
    organizationName: requiredText,
    industry: requiredText,
    primaryContact: requiredText,
  }),
  objectives: z.object({
    businessGoal: requiredText,
    successMetrics: requiredText,
  }),
  stakeholders: z.object({
    decisionMakers: requiredText,
    approvalProcess: requiredText,
  }),
  users: z.object({
    userGroups: requiredText,
    estimatedUsers: requiredText,
  }),
  workflow: z.object({
    currentProcess: requiredText,
    desiredWorkflow: requiredText,
  }),
  data: z.object({
    dataSources: requiredText,
    migrationNeeds: optionalText,
  }),
  integrations: z.object({
    requiredSystems: requiredText,
    integrationNotes: optionalText,
  }),
  documents: z.object({
    documentTypes: requiredText,
    retentionNeeds: optionalText,
  }),
  permissions: z.object({
    accessRoles: requiredText,
    approvalRules: requiredText,
  }),
  notifications: z.object({
    channels: requiredText,
    escalationRules: optionalText,
  }),
  reporting: z.object({
    dashboardNeeds: requiredText,
    exportNeeds: optionalText,
  }),
  compliance: z.object({
    regulatoryNeeds: requiredText,
    securityNotes: requiredText,
  }),
  timeline: z.object({
    targetLaunch: requiredText,
    milestones: requiredText,
  }),
  budget: z.object({
    budgetRange: requiredText,
    procurementNotes: optionalText,
  }),
  support: z.object({
    supportModel: requiredText,
    trainingNeeds: optionalText,
  }),
  files: z.object({
    uploadNotes: optionalText,
    attachments: z.array(attachmentSchema),
  }),
  risks: z.object({
    knownRisks: requiredText,
    dependencies: optionalText,
  }),
  confirmation: z.object({
    submitterName: requiredText,
    accuracyConfirmed: z.boolean().refine(Boolean, {
      message: "Confirm the information is ready for review.",
    }),
  }),
});

export const requirementWizardDraftSchema = z.object({
  company: z.object({
    organizationName: z.string(),
    industry: z.string(),
    primaryContact: z.string(),
  }),
  objectives: z.object({
    businessGoal: z.string(),
    successMetrics: z.string(),
  }),
  stakeholders: z.object({
    decisionMakers: z.string(),
    approvalProcess: z.string(),
  }),
  users: z.object({
    userGroups: z.string(),
    estimatedUsers: z.string(),
  }),
  workflow: z.object({
    currentProcess: z.string(),
    desiredWorkflow: z.string(),
  }),
  data: z.object({
    dataSources: z.string(),
    migrationNeeds: z.string().optional(),
  }),
  integrations: z.object({
    requiredSystems: z.string(),
    integrationNotes: z.string().optional(),
  }),
  documents: z.object({
    documentTypes: z.string(),
    retentionNeeds: z.string().optional(),
  }),
  permissions: z.object({
    accessRoles: z.string(),
    approvalRules: z.string(),
  }),
  notifications: z.object({
    channels: z.string(),
    escalationRules: z.string().optional(),
  }),
  reporting: z.object({
    dashboardNeeds: z.string(),
    exportNeeds: z.string().optional(),
  }),
  compliance: z.object({
    regulatoryNeeds: z.string(),
    securityNotes: z.string(),
  }),
  timeline: z.object({
    targetLaunch: z.string(),
    milestones: z.string(),
  }),
  budget: z.object({
    budgetRange: z.string(),
    procurementNotes: z.string().optional(),
  }),
  support: z.object({
    supportModel: z.string(),
    trainingNeeds: z.string().optional(),
  }),
  files: z.object({
    uploadNotes: z.string().optional(),
    attachments: z.array(attachmentSchema),
  }),
  risks: z.object({
    knownRisks: z.string(),
    dependencies: z.string().optional(),
  }),
  confirmation: z.object({
    submitterName: z.string(),
    accuracyConfirmed: z.boolean(),
  }),
});

export type RequirementWizardInput = z.infer<typeof requirementWizardSchema>;
export type RequirementAttachment = z.infer<typeof attachmentSchema>;

export const defaultRequirementWizardValues: RequirementWizardInput = {
  company: {
    organizationName: "",
    industry: "",
    primaryContact: "",
  },
  objectives: {
    businessGoal: "",
    successMetrics: "",
  },
  stakeholders: {
    decisionMakers: "",
    approvalProcess: "",
  },
  users: {
    userGroups: "",
    estimatedUsers: "",
  },
  workflow: {
    currentProcess: "",
    desiredWorkflow: "",
  },
  data: {
    dataSources: "",
    migrationNeeds: "",
  },
  integrations: {
    requiredSystems: "",
    integrationNotes: "",
  },
  documents: {
    documentTypes: "",
    retentionNeeds: "",
  },
  permissions: {
    accessRoles: "",
    approvalRules: "",
  },
  notifications: {
    channels: "",
    escalationRules: "",
  },
  reporting: {
    dashboardNeeds: "",
    exportNeeds: "",
  },
  compliance: {
    regulatoryNeeds: "",
    securityNotes: "",
  },
  timeline: {
    targetLaunch: "",
    milestones: "",
  },
  budget: {
    budgetRange: "",
    procurementNotes: "",
  },
  support: {
    supportModel: "",
    trainingNeeds: "",
  },
  files: {
    uploadNotes: "",
    attachments: [],
  },
  risks: {
    knownRisks: "",
    dependencies: "",
  },
  confirmation: {
    submitterName: "",
    accuracyConfirmed: false,
  },
};
