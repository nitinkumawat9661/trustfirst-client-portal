# Workflow Engine

The workflow engine models configurable visual workflows as nodes and edges.

## Model

Workflow definitions contain:

- nodes
- edges
- version
- optional node configuration
- optional edge conditions

Node kinds include start, state, approval, automation, document, external, and end.

## Example Shape

A tenant can configure a flow such as:

Lead -> Requirement -> Approval -> Quotation -> Approval -> Invoice -> Payment -> Project -> Delivery -> Support

The platform does not hardcode this flow. It is represented as tenant-owned workflow configuration.

## Validation

The service validates that edges reference known nodes. Runtime execution providers can later evaluate conditions and actions without changing the workflow contract.

