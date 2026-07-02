import type { CommercialContext, JsonRecord } from "./common";

export type DashboardWidget = {
  config: JsonRecord;
  h: number;
  id: string;
  title: string;
  type: "metric" | "chart" | "table" | "timeline" | string;
  w: number;
  x: number;
  y: number;
};

export type DashboardDefinition = {
  id: string;
  name: string;
  tenantConfigurable: boolean;
  widgets: DashboardWidget[];
};

export type DashboardRenderPlan = {
  widgetIds: string[];
  widgets: DashboardWidget[];
};

export interface DashboardEngine {
  planDashboard(
    context: CommercialContext,
    definition: DashboardDefinition,
  ): Promise<DashboardRenderPlan>;
}

