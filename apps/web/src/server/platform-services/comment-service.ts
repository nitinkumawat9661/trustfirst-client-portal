import type { CursorPage, CursorPaginationInput } from "../pagination/cursor";
import type { PlatformReference, PlatformServiceContext, PlatformVisibility } from "./common";

export type CommentDescriptor = {
  authorId: string;
  body: string;
  createdAt: Date;
  id: string;
  target: PlatformReference;
  visibility: PlatformVisibility;
};

export type CommentThreadQuery = CursorPaginationInput & {
  target: PlatformReference;
};

export interface CommentService {
  queryThread(
    context: PlatformServiceContext,
    input: CommentThreadQuery,
  ): Promise<CursorPage<CommentDescriptor>>;
  validateVisibility(
    context: PlatformServiceContext,
    visibility: PlatformVisibility,
  ): Promise<{ allowed: boolean; reason?: string }>;
}
