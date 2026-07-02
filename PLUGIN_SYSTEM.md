# Plugin System

The plugin system provides provider and module extension contracts.

## Plugin Categories

Supported categories include:

- payment providers
- storage providers
- notification providers
- AI providers
- ERP modules
- CRM modules

The platform does not implement provider integrations in this sprint. It defines manifests, capabilities, permissions, and registration contracts.

## Capability Model

Each plugin manifest declares:

- id
- name
- version
- category
- capabilities
- config schema
- required permissions

The commercial platform service validates that plugin manifests declare version and capabilities.

