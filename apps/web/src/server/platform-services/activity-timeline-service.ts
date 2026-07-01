import type { CursorPage, CursorPaginationInput } from "../pagination/cursor";
import type { PlatformReference, PlatformServiceContext } from "./common";

export type TimelineEntry = {
  actorId?: string;
  id: string;
  message: string;
  occurredAt: Date;
  target?: PlatformReference;
  type: string;
};

export type TimelineQuery = CursorPaginationInput & {
  target?: PlatformReference;
};

export interface ActivityTimelineService {
  query(
    context: PlatformServiceContext,
    input: TimelineQuery,
  ): Promise<CursorPage<TimelineEntry>>;
}
