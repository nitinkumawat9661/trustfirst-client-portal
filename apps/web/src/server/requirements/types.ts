import type { RequirementPriority, RequirementStatus } from "@trustfirst/database";
import type { RequirementFormSchema } from "./dynamic-forms";

export type RequirementSummary = {
  clientId: string | null;
  currentVersion: number;
  dueAt: Date | null;
  id: string;
  priority: RequirementPriority;
  reviewerId: string | null;
  status: RequirementStatus;
  title: string;
  updatedAt: Date;
};

export type RequirementWorkspace = RequirementSummary & {
  attachments: Array<{ id: string; name: string; version: number | null }>;
  comments: Array<{ body: string; id: string; parentId: string | null; resolvedAt: Date | null }>;
  draftHistory: Array<{ createdAt: Date; id: string; revision: number; source: string }>;
  formSchema: RequirementFormSchema;
  timeline: Array<{ id: string; occurredAt: Date; summary: string; verb: string }>;
  versions: Array<{ createdAt: Date; id: string; version: number }>;
};

export type RequirementDashboard = {
  drafts: number;
  pendingReview: number;
  recentlyUpdated: RequirementSummary[];
  total: number;
};

export type VersionComparison = {
  added: string[];
  changed: string[];
  fromVersion: number;
  removed: string[];
  toVersion: number;
};

