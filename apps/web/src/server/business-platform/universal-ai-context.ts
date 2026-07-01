import type { BusinessReference, BusinessScope } from "./common";

export type AiContextSensitivity =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export type AiContextBlock = {
  content: string;
  label: string;
  metadata?: Record<string, unknown>;
  sensitivity: AiContextSensitivity;
  source: BusinessReference;
};

export type AiContextContract = {
  allowedPurposes: string[];
  entityTypes: string[];
  maxTokens?: number;
  redactionRequired: boolean;
  scope: BusinessScope;
};

export type AiContextPackage = {
  blocks: AiContextBlock[];
  contract: AiContextContract;
};

export interface UniversalAiContextContracts {
  describeContext(scope: BusinessScope): AiContextContract;
  composeContext(sources: BusinessReference[]): Promise<AiContextPackage>;
}

