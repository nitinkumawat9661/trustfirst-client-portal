import type { BusinessReference, BusinessScope } from "./common";

export type SearchIndexFieldType =
  | "text"
  | "keyword"
  | "number"
  | "date"
  | "boolean";

export type SearchIndexField = {
  boost?: number;
  filterable: boolean;
  key: string;
  sortable: boolean;
  type: SearchIndexFieldType;
};

export type SearchIndexContract = {
  entityType: string;
  fields: SearchIndexField[];
  indexName: string;
  version: number;
};

export type SearchIndexDocument = {
  body: string;
  entity: BusinessReference;
  fields: Record<string, unknown>;
  scope: BusinessScope;
  title: string;
};

export interface UniversalSearchIndexContracts {
  describeIndex(entityType: string): SearchIndexContract | null;
  mapDocument(entity: BusinessReference): Promise<SearchIndexDocument>;
}

