import type { CommercialContext, JsonRecord } from "./common";

export type ReportVisualization = "table" | "bar" | "line" | "pie" | "metric";

export type ReportFilter = {
  key: string;
  label: string;
  operator: "equals" | "contains" | "between" | "in";
  type: "text" | "number" | "date" | "select";
};

export type ReportDefinition = {
  dataSource: string;
  exports: Array<"csv" | "xlsx" | "pdf">;
  filters: ReportFilter[];
  id: string;
  name: string;
  visualization: ReportVisualization;
};

export type SavedReport = {
  definitionId: string;
  filters: JsonRecord;
  id: string;
  name: string;
  ownerId?: string;
};

export type ReportExecutionPlan = {
  columns: string[];
  dataSource: string;
  filters: JsonRecord;
  visualization: ReportVisualization;
};

export interface ReportEngine {
  planReport(
    context: CommercialContext,
    definition: ReportDefinition,
    filters: JsonRecord,
  ): Promise<ReportExecutionPlan>;
}

