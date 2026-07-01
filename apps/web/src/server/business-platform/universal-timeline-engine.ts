import type {
  BusinessActorId,
  BusinessEntityId,
  BusinessExecutionContext,
  BusinessReference,
} from "./common";

export type ActivityEventVerb =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "commented"
  | "uploaded"
  | "approved"
  | "rejected"
  | "status_changed"
  | "custom";

export type ActivityEvent = {
  actorId?: BusinessActorId;
  entity: BusinessReference;
  id: BusinessEntityId;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  summary: string;
  verb: ActivityEventVerb;
};

export type BusinessTimelineQuery = {
  entity?: BusinessReference;
  entityTypes?: string[];
  from?: Date;
  limit: number;
  to?: Date;
};

export type TimelineAggregation = {
  events: ActivityEvent[];
  groupedByDay: Array<{
    date: string;
    eventIds: BusinessEntityId[];
  }>;
};

export interface UniversalTimelineEngine {
  aggregate(
    context: BusinessExecutionContext,
    query: BusinessTimelineQuery,
  ): Promise<TimelineAggregation>;
}
