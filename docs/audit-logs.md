# Audit Logs

## Purpose

Audit logs are immutable records of sensitive platform changes. They are used for security review, support investigations, and operational accountability.

## Table

`audit_events`

## Fields

- `id`
- `actor_user_id`
- `actor_name`
- `target_user_id`
- `event_type`
- `action`
- `entity_type`
- `target_type`
- `entity_id`
- `target_id`
- `before_state`
- `after_state`
- `metadata`
- `ip_address`
- `user_agent`
- `risk_level`
- `created_at`

## Logged Actions

- Auth events.
- Role changes.
- Permission changes.
- User status changes.
- Platform setting changes.
- RBAC operations.

## UI

Super Admins and authorized admins can review logs at `/admin/audit-logs`.

## Rule

Every sensitive backend action should call `_record_audit_event(...)`.
