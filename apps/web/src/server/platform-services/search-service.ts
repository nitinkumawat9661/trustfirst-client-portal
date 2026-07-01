import type { PlatformReference, PlatformScope, PlatformServiceContext } from "./common";

export type SearchQuery = {
  filters?: Record<string, string>;
  limit: number;
  query: string;
  scope?: PlatformScope;
};

export type SearchResult = {
  excerpt?: string;
  label: string;
  target: PlatformReference;
};

export interface SearchService {
  query(
    context: PlatformServiceContext,
    input: SearchQuery,
  ): Promise<{ results: SearchResult[] }>;
  suggest(context: PlatformServiceContext, query: string): Promise<SearchResult[]>;
}
