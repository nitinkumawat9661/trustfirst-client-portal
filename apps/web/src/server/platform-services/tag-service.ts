import type { PlatformReference, PlatformServiceContext } from "./common";

export type TagDescriptor = {
  color?: string;
  id: string;
  name: string;
  slug: string;
};

export interface TagService {
  listAvailable(context: PlatformServiceContext): Promise<TagDescriptor[]>;
  listForTarget(
    context: PlatformServiceContext,
    target: PlatformReference,
  ): Promise<TagDescriptor[]>;
}
