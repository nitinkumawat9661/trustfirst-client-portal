import type { CommercialContext, JsonRecord } from "./common";

export type SettingDefinition = {
  defaultValue: unknown;
  key: string;
  scope: "tenant" | "user" | "module";
  type: "string" | "number" | "boolean" | "json";
};

export type LocalizationProfile = {
  currency: string;
  dateFormat: string;
  language: string;
  numberFormat: string;
  timezone: string;
};

export type MetricContract = {
  dimensions?: string[];
  name: string;
  unit: "count" | "ms" | "bytes" | "percent";
};

export type StructuredLogContract = {
  context: JsonRecord;
  level: "debug" | "info" | "warn" | "error";
  message: string;
};

export type TraceContract = {
  name: string;
  parentSpanId?: string;
  spanId: string;
  traceId: string;
};

export type HealthMetric = {
  checkedAt: Date;
  name: string;
  status: "healthy" | "degraded" | "down";
};

export interface SettingsEngine {
  resolveSetting(
    context: CommercialContext,
    definition: SettingDefinition,
  ): Promise<unknown>;
}

export interface LocalizationEngine {
  resolveProfile(context: CommercialContext): Promise<LocalizationProfile>;
}

export interface ObservabilityContracts {
  recordMetric(metric: MetricContract, value: number): void;
  writeLog(log: StructuredLogContract): void;
  startTrace(trace: TraceContract): void;
  readHealth(): HealthMetric[];
}

