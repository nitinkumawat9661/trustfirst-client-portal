# Approval Flow

Requirement approvals use explicit statuses:

- Draft
- Pending
- Under Review
- Changes Requested
- Approved
- Rejected

## Transitions

Allowed transitions:

- Draft -> Pending
- Pending -> Under Review
- Pending -> Rejected
- Under Review -> Changes Requested
- Under Review -> Approved
- Under Review -> Rejected
- Changes Requested -> Pending
- Rejected -> Pending

Approved and archived requirements are terminal for approval purposes.

## Assignments

Requirements support owner, reviewer, due date, and priority assignment. Assignment changes create timeline entries and remain tenant scoped.

## Review Events

Every approval transition writes a timeline event and creates a notification record for the relevant owner or reviewer.

