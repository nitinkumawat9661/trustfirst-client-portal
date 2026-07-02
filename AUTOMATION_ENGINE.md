# Automation Engine

The automation engine provides trigger, condition, and action contracts.

## Model

Automation definitions contain:

- trigger event
- filters
- conditions
- actions
- enabled state
- version

Supported action categories are open-ended and include assignment, email, timeline creation, notification, and custom plugin actions.

## Example Shape

Requirement Submitted -> Assign Reviewer -> Send Email -> Create Timeline -> Notify Client

This sprint defines the architecture and validation only. It does not connect email providers or execute external integrations.

