# Client Workspace

The client workspace is a tenant-aware collaboration view for each client organization.

## Tabs

The workspace exposes:

- Overview
- Projects
- Requirements
- Files
- Approvals
- Timeline
- Notes
- Contacts
- Settings

Projects, requirements, files, approvals, and tasks are represented as CRM workspace counters and ready attachment points. They are not expanded into separate business modules in this sprint.

## Dashboard Cards

The client dashboard and workspace show:

- Active Projects
- Pending Approvals
- Pending Requirements
- Open Tasks
- Recent Files
- Recent Activity
- Health Score

## Contacts And Collaboration

Contacts support multiple entries per client, primary contact selection, roles, invitation architecture, and last activity tracking. Comments are threaded, support mentions and attachment metadata, and can be resolved.

## Access

Workspace pages are protected by Auth.js proxy checks and server-side permission validation through `ClientService`. Proxy protection is not the sole authorization layer.

