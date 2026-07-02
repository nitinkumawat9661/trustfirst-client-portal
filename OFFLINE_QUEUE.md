# Offline Queue

## Purpose

The offline queue is a client-side mutation buffer for hardware workflows and future modules. It preserves user action order, scopes data to a tenant and user, and retries failed mutations when the browser returns online.

## Storage Architecture

The queue uses an `OfflineQueueStorage` interface with adapters for:

- In-memory storage for tests.
- Local storage for the current UI foundation.
- IndexedDB for larger future offline workloads.

Local keys are scoped as:

`trustfirst.offlineQueue.v1.{tenantId}.{userId}`

The queue filters every read by tenant and user so a malformed or stale local record cannot cross tenant boundaries.

## Queued Mutation Format

Each queued mutation includes:

- Unique queue item ID.
- Idempotency key.
- Tenant ID.
- User ID.
- Module name.
- Action name.
- Sanitized payload.
- Sequence number.
- Status.
- Attempt count.
- Retry timestamp.
- Optional conflict contract.

## Hardware Actions v1

Supported actions:

- `hardware.saleDraft.create`
- `hardware.purchaseDraft.create`
- `hardware.customerDraft.create`
- `hardware.productDraft.create`
- `hardware.stockAdjustmentDraft.create`
- `hardware.manualPaymentDraft.create`

These map to existing API contracts and do not introduce backend shortcuts.

## Retry Policy

The default retry policy uses exponential backoff:

- Base delay: 5 seconds.
- Maximum attempts: 5.
- Maximum delay: 5 minutes.

Failed actions can be retried manually. Retry preserves the original sequence and idempotency key.

## Security

Payload sanitization removes sensitive keys and file-like values before writing to local storage. Offline queue data is not encrypted and must not contain secrets. Server-side APIs remain responsible for tenant resolution, permission checks, validation, and ownership enforcement when queued actions sync.
