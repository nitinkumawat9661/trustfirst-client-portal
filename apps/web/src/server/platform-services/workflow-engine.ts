import type { PlatformReference, PlatformServiceContext } from "./common";

export type WorkflowState = {
  key: string;
  label: string;
};

export type WorkflowTransition = {
  from: string;
  guard?: string;
  label: string;
  to: string;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  version: number;
};

export type WorkflowEvaluationInput = {
  currentState: string;
  definitionId: string;
  target: PlatformReference;
};

export interface WorkflowEngine {
  describeDefinition(
    context: PlatformServiceContext,
    definitionId: string,
  ): Promise<WorkflowDefinition | null>;
  evaluateTransitions(
    context: PlatformServiceContext,
    input: WorkflowEvaluationInput,
  ): Promise<WorkflowTransition[]>;
}
