# CRM

The CRM foundation manages tenant-scoped client organizations from lead through archived account.

## Lifecycle

Client organizations use two separate state dimensions:

- `ClientLifecycleStage`: `LEAD`, `PROSPECT`, `CLIENT`, `ARCHIVED`
- `ClientStatus`: `NEW`, `ACTIVE`, `ONBOARDING`, `AT_RISK`, `INACTIVE`, `ARCHIVED`, `SOFT_DELETED`

Lifecycle transitions are validated in `ClientService`; invalid backwards movement is rejected before persistence.

## Ownership

Each client can have:

- owner
- account manager
- tags
- custom fields
- metadata
- primary contact

All queries include `tenantId` and exclude soft-deleted records by default.

## Activity

Every CRM write creates a `ClientActivityEvent`:

- created
- updated
- commented
- uploaded
- approved
- status changed
- archived
- deleted

The timeline is the audit-friendly activity source for the client workspace.

## Boundaries

The CRM implementation follows repository and service boundaries:

- routes validate input and call services
- services enforce permissions and lifecycle rules
- repositories perform Prisma persistence
- UI reads through service projections

