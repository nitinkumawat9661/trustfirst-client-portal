# Sync Conflicts

## Purpose

Conflict detection is a contract for deciding what happens when an offline mutation reaches the server after the related resource has changed.

## Conflict Contract

Queued mutations can carry:

- `expectedVersion`
- `serverVersion`
- `fingerprint`
- `resolvedBy`

The current foundation supports manual, server, and client resolution labels. It does not auto-merge business data.

## Sync Behavior

Sync processing preserves queue order:

1. Read pending queue items for the active tenant and user.
2. Mark the next item as syncing.
3. Execute the mapped API mutation with the original idempotency key.
4. Mark success as synced.
5. Mark retryable failures as failed with retry metadata.
6. Mark conflicts as failed without retry scheduling.

## HTTP Conflicts

HTTP `409` responses become sync conflicts. The failed action remains visible in the failed actions panel so an operator can retry after reviewing the server state or clear the item if it should be discarded.

## Future Resolution

Future modules can add resource-specific conflict policies, such as version comparison, server-wins, client-wins, or guided merge. Those policies should live in module services and must not bypass server-side permission checks.
