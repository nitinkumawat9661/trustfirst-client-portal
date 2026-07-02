# Dynamic Forms

Requirement forms are section based and stored as JSON contracts.

## Structure

A form contains:

- sections
- field groups
- fields
- repeatable groups
- conditional field rules
- validation rules

Field types include text, textarea, number, select, multi-select, checkbox, date, and attachment.

## Validation

`validateRequirementPayload` evaluates:

- required fields
- conditional visibility
- minimum and maximum values
- minimum and maximum length
- regular expression patterns

Validation issues include section key, field key, and message so UI surfaces can highlight the correct section and field.

## Attachments

Attachment fields are represented in the form schema and persisted as version-aware `RequirementAttachment` records. Storage providers can be connected later through the existing storage abstraction.

