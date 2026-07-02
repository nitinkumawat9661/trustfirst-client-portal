import type {
  DeliverableReviewStatus,
  ProjectLifecycleStatus,
  ProjectPriority,
  ProjectTaskStatus,
} from "@trustfirst/database";

export type ProjectSummary = {
  clientId: string | null;
  id: string;
  name: string;
  priority: ProjectPriority;
  progress: number;
  slug: string;
  status: ProjectLifecycleStatus;
  targetDate: Date | null;
  updatedAt: Date;
};

export type ProjectDashboard = {
  activity: number;
  files: number;
  milestones: number;
  overdue: number;
  progress: number;
  tasks: number;
  team: number;
  upcoming: number;
};

export type ProjectWorkspace = ProjectSummary & {
  calendar: Record<string, unknown>;
  deliverables: Array<{
    id: string;
    requirementId: string | null;
    requirementVersion: number | null;
    reviewStatus: DeliverableReviewStatus;
    title: string;
  }>;
  gantt: {
    dependencies: Array<{ from: string; to: string }>;
    items: Array<{ end: Date | null; id: string; start: Date | null; title: string; type: string }>;
  };
  metrics: ProjectDashboard;
  milestones: Array<{ dueAt: Date | null; id: string; name: string; progress: number; status: string }>;
  tasks: Array<{
    assigneeId: string | null;
    dueAt: Date | null;
    id: string;
    parentId: string | null;
    priority: ProjectPriority;
    status: ProjectTaskStatus;
    title: string;
  }>;
  timeline: Array<{ id: string; occurredAt: Date; summary: string; verb: string }>;
};

export type ProjectSearchResult = {
  deliverables: Array<{ id: string; projectId: string; title: string }>;
  projects: ProjectSummary[];
  tasks: Array<{ id: string; projectId: string; title: string }>;
};

