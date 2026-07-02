import type {
  CommercialContext,
  CommercialEntityRef,
  CommercialValidationResult,
  JsonRecord,
} from "./common";

export type WorkflowNodeKind =
  | "start"
  | "state"
  | "approval"
  | "automation"
  | "document"
  | "external"
  | "end";

export type WorkflowNode = {
  config?: JsonRecord;
  id: string;
  kind: WorkflowNodeKind;
  label: string;
};

export type WorkflowEdge = {
  conditionExpression?: string;
  from: string;
  id: string;
  label?: string;
  to: string;
};

export type CommercialWorkflowDefinition = {
  description?: string;
  edges: WorkflowEdge[];
  id: string;
  name: string;
  nodes: WorkflowNode[];
  version: number;
};

export type WorkflowExecutionState = {
  currentNodeId: string;
  data: JsonRecord;
  subject: CommercialEntityRef;
  workflowId: string;
};

export interface ConfigurableWorkflowEngine {
  validateDefinition(definition: CommercialWorkflowDefinition): CommercialValidationResult;
  evaluateNextNodes(
    context: CommercialContext,
    definition: CommercialWorkflowDefinition,
    state: WorkflowExecutionState,
  ): Promise<WorkflowNode[]>;
}
