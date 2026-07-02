import type {
  CommercialContext,
  CommercialValidationResult,
  JsonRecord,
} from "./common";

export type AutomationTrigger = {
  eventName: string;
  filters?: JsonRecord;
};

export type AutomationCondition = {
  expression: string;
  id: string;
};

export type AutomationAction =
  | { config: JsonRecord; id: string; type: "assign" }
  | { config: JsonRecord; id: string; type: "send_email" }
  | { config: JsonRecord; id: string; type: "create_timeline" }
  | { config: JsonRecord; id: string; type: "notify" }
  | { config: JsonRecord; id: string; type: string };

export type AutomationDefinition = {
  actions: AutomationAction[];
  conditions: AutomationCondition[];
  enabled: boolean;
  id: string;
  name: string;
  trigger: AutomationTrigger;
  version: number;
};

export type AutomationPlan = {
  actionIds: string[];
  automationId: string;
  skippedActionIds: string[];
};

export interface AutomationEngine {
  validateAutomation(definition: AutomationDefinition): CommercialValidationResult;
  planExecution(
    context: CommercialContext,
    definition: AutomationDefinition,
    eventPayload: JsonRecord,
  ): Promise<AutomationPlan>;
}

