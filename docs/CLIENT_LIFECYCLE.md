# Client Lifecycle

## Purpose

The client lifecycle tracks the commercial relationship between a tenant and a client organization, regardless of service type.

## Lifecycle States

### Lead

Potential client under evaluation. Minimal information may exist.

### Prospect

Qualified organization with active sales or discovery conversations.

### Onboarding

Client has agreed to begin work and is completing portal setup, contacts, requirements, contracts, files, or access steps.

### Active

Client has one or more active engagements, retainers, campaigns, projects, or service workflows.

### Paused

Client relationship or delivery work is temporarily paused.

### At Risk

Client requires attention due to delivery, commercial, communication, or satisfaction concerns.

### Completed

Primary engagement is complete, but the client may remain eligible for future work.

### Retainer

Client is under recurring support, maintenance, marketing, advisory, or managed services.

### Archived

Client is inactive and hidden from normal operational views while retained for records and audit.

## Lifecycle Transitions

```txt
Lead -> Prospect -> Onboarding -> Active
Active -> Paused -> Active
Active -> At Risk -> Active
Active -> Completed -> Retainer
Completed -> Archived
Retainer -> Archived
```

## Lifecycle Data

- Lifecycle status
- Account owner
- Primary contact
- Service interests
- Health indicator
- Last activity date
- Active engagement count
- Open approval count
- Open requirement count
- Contract or procurement status

## Lifecycle Automation Candidates

- Remind account owner when onboarding is incomplete.
- Flag clients with no recent activity.
- Escalate overdue approvals.
- Notify when all active engagements are completed.
- Request archival review after inactivity.

## Rules

- A client can be active without a project if work is retainer, advisory, campaign, or support based.
- Client archive should not delete files, approvals, or audit records.
- Lifecycle changes should be auditable.
- Client health should be tenant-configurable.
