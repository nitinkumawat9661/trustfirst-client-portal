export type FeatureFlagKey = string;

export type FeatureFlagContext = {
  tenantId: string;
  userId?: string;
};

export interface FeatureFlagProvider {
  isEnabled(key: FeatureFlagKey, context: FeatureFlagContext): Promise<boolean>;
}

class StaticFeatureFlagProvider implements FeatureFlagProvider {
  private readonly flags = new Map<FeatureFlagKey, boolean>();

  set(key: FeatureFlagKey, enabled: boolean) {
    this.flags.set(key, enabled);
  }

  async isEnabled(key: FeatureFlagKey) {
    return this.flags.get(key) ?? false;
  }
}

const provider = new StaticFeatureFlagProvider();

export function getFeatureFlags(): FeatureFlagProvider {
  return provider;
}
