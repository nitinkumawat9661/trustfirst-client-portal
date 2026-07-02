# Milestones

Milestones organize delivery checkpoints inside projects.

## Capabilities

Milestones support:

- create
- update
- complete
- dependencies
- due dates
- progress
- sort order

Dependencies are stored as contract data so the workspace can produce Gantt-ready projections without coupling to a specific charting library.

## Completion

Completing a milestone sets progress to 100, marks status as completed, and writes a milestone completion timeline event.

## Calendar And Gantt

Project workspace projections expose:

- calendar metadata
- milestone due dates
- task due dates
- dependency edges
- Gantt item contracts

