# Project Engine

The Project Engine is a tenant-aware execution aggregate built on the CRM, Requirement Engine, permission system, and timeline patterns.

## Aggregate

`Project` owns:

- lifecycle status
- progress
- calendar metadata
- Gantt-ready metadata
- milestones
- tasks and subtasks
- deliverables
- attachments
- labels
- timeline events
- notifications

The API layer is intentionally thin. Project rules live in `ProjectService`, and persistence lives in `PrismaProjectRepository`.

## Lifecycle

Supported lifecycle statuses:

- Planning
- Active
- Blocked
- Review
- Completed
- Archived

Invalid lifecycle transitions are rejected by the service before persistence.

## Dashboard

The dashboard exposes cards for progress, milestones, tasks, overdue work, upcoming work, activity, files, and team size.

## Search

Project search covers projects, tasks, and deliverables within the active tenant.

## Timeline And Notifications

Every create, update, assignment, milestone, deliverable, attachment, and completion action writes a timeline event. Notifications are recorded for assignments, due-date relevant updates, milestone events, deliverable reviews, and completion events.

