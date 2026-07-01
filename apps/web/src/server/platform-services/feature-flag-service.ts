import type { FeatureFlagContext, FeatureFlagKey } from "../features/feature-flags";
import type { PlatformServiceContext } from "./common";

export type FeatureFlagDescriptor = {
  enabled: boolean;
  key: FeatureFlagKey;
  reason?: string;
};

export interface FeatureFlagService {
  evaluate(
    context: PlatformServiceContext,
    key: FeatureFlagKey,
    flagContext: FeatureFlagContext,
  ): Promise<FeatureFlagDescriptor>;
  list(context: PlatformServiceContext): Promise<FeatureFlagDescriptor[]>;
}
