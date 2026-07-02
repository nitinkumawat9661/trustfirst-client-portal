import type { CommercialContext, CommercialValidationResult, JsonRecord } from "./common";

export type PluginCategory =
  | "payment_provider"
  | "storage_provider"
  | "notification_provider"
  | "ai_provider"
  | "erp_module"
  | "crm_module"
  | string;

export type PluginCapability = {
  configSchema: JsonRecord;
  key: string;
  permissions: string[];
};

export type PluginManifest = {
  capabilities: PluginCapability[];
  category: PluginCategory;
  id: string;
  name: string;
  version: string;
};

export type PluginRegistration = {
  enabled: boolean;
  manifest: PluginManifest;
  tenantId: string;
};

export interface PluginRegistry {
  validateManifest(manifest: PluginManifest): CommercialValidationResult;
  listCapabilities(
    context: CommercialContext,
    category?: PluginCategory,
  ): Promise<PluginCapability[]>;
}

