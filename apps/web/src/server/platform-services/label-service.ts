import type { PlatformReference, PlatformServiceContext } from "./common";

export type LabelDescriptor = {
  color?: string;
  id: string;
  name: string;
  namespace: string;
};

export interface LabelService {
  listAvailable(
    context: PlatformServiceContext,
    namespace?: string,
  ): Promise<LabelDescriptor[]>;
  listForTarget(
    context: PlatformServiceContext,
    target: PlatformReference,
  ): Promise<LabelDescriptor[]>;
}
