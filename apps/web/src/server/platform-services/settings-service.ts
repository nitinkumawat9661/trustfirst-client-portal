import type { PlatformServiceContext } from "./common";

export type SettingValue = string | number | boolean | null | Record<string, unknown>;

export type SettingsNamespace = "tenant" | "security" | "notifications" | "appearance";

export type SettingDescriptor = {
  key: string;
  namespace: SettingsNamespace;
  readonly: boolean;
  value: SettingValue;
};

export interface SettingsService {
  describeNamespace(
    context: PlatformServiceContext,
    namespace: SettingsNamespace,
  ): Promise<SettingDescriptor[]>;
  resolveSetting(
    context: PlatformServiceContext,
    namespace: SettingsNamespace,
    key: string,
  ): Promise<SettingDescriptor | null>;
}
