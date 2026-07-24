# MOSAICO UX Interaction Standards

Date: 2026-07-05

## Purpose

MOSAICO workspaces should behave consistently across teacher, admin, tutor, student, and future operational modules. The Teacher Calendar update defines the standard pattern for dense SaaS workflows: keep the primary workspace visible, open secondary tools only when requested, and make actions point back to the object they affect.

## Core Rule

The center workspace stays on.

Every module should identify its primary working surface and keep it visible as the main context. Secondary modules, summaries, integrations, and insights should not permanently compete with the center unless they are essential to the task.

## Standard Pattern

On mobile, this standard is implemented as:

```text
Left navigation drawer -> Persistent center screen -> Right contextual action drawer
```

Only one drawer opens at a time. The right trigger is absent when no
authorized production-backed actions exist. The full normative component,
accessibility, localization, and RBAC rules are in
`docs/MOBILE_UX_AND_NAVIGATION_STANDARD.md`.

### 1. Persistent Center

Use the center for the user's main job:

- Calendar grid
- IAM users list
- Atlas document list/detail
- Lesson editor
- Credit ledger
- Booking board
- Student roadmap

The center should remain visible while users inspect related details.

### 2. Action Center

Place compact actions above the primary surface.

Examples:

- Connect calendar
- Highlight next class
- Today's focus
- Insights
- Bulk role action
- Filter
- Export

Actions should be short, concrete, and tied to the primary context.

### 3. Lateral Panels

Use lateral panels for supporting information or configuration:

- Google Calendar connection
- Scheduling insights
- User detail
- Effective permissions
- Audit history
- Activity timeline
- Lesson metadata
- Booking details

Panels should open only when requested and close without changing the user's place in the center workspace.

Reusable component:

```text
frontend/src/components/WorkspaceSidePanel.jsx
```

### 4. Highlight In Context

When an action refers to an item already visible in the center, do not open a separate card by default. Highlight the item in place.

Examples:

- "Next class" highlights the next class in the calendar.
- "Today's focus" highlights today's relevant class.
- A future "Low-credit family" action should highlight the family row in the center list.
- A future "Pending approval" action should highlight the approval item in the queue.

Use visible focus rings and scroll the item into view when needed.

### 5. Avoid Horizontal Scroll

Avoid wide tables as the default UI. Prefer responsive grids/lists with prioritized columns.

Use these priorities:

1. Identity/object
2. State/access/status
3. Operational metadata
4. Primary action
5. Secondary actions in menu or drawer

Horizontal scroll is acceptable only for true matrices where column comparison is the product task, such as permission matrices or financial exports.

### 6. No Permanent Side Modules Unless Essential

Do not keep secondary cards permanently beside the center if they reduce the usability of the main workflow.

Move these to action-triggered panels:

- insights
- integration status
- quick summaries
- recent activity
- detailed history
- configuration

### 7. Independent Navigation Scroll

Long sidebar navigation must scroll independently from the main workspace. Sticky sidebars should use a viewport-height limit, vertical overflow, and contained overscroll so scrolling over the left menu does not move the right-side content.

Below desktop sidebar width, reuse that same role-specific navigation in the
shared left drawer. Do not stack the full sidebar above the center workspace.

### 8. Honest Disabled States

If a supporting panel or action is not production-backed, disable it with a clear reason. Do not fake success.

### 9. Platform-Wide Language Control

The `EN / ES` language control must update the full visible experience, not only the top navigation. Portal shells, landing pages, side navigation, access messages, action bars, calendar workspaces, form labels, save/cancel controls, empty states, and administrative headings should read from the active language wherever practical. Technical identifiers, API field names, audit event keys, and stored permission keys can remain stable when they are system data rather than UI copy.

## Role/Profile Switching

Portal role switching should use a single-select dropdown, not a grid of profile buttons. The control must show only the active profile value while closed, and users with multiple effective roles can choose exactly one profile at a time. School Administrative is the education operations profile; Technical Admin is reserved for IAM, configuration, audit, logs, and system governance.

## Feature-Gated Navigation

Left sidebar navigation must respect saved platform feature flags. Disabled feature modules should disappear from the sidebar after configuration is saved and public settings refresh. Draft changes inside the configuration form should not hide navigation until they are saved, so `Cancel changes` always returns the app to the persisted state.

## Applied Examples

### Teacher Calendar

Current standard implementation:

- Calendar is full-width center.
- Google Calendar opens in a lateral panel.
- Scheduling insights open in a lateral panel.
- Next class and Today's focus highlight the class in the calendar.
- Empty slots remain visible in context.

### IAM

Current compatible implementation:

- Users list is the center.
- User details open in a drawer.
- Role assignment happens in drawer or bulk modal.
- Wide table was replaced with responsive grid/list.

## Implementation Guidance

For every future module, ask:

1. What is the center workspace?
2. What can be an action above the center?
3. What belongs in a lateral panel?
4. What should be highlighted in context?
5. Which visible actions are production-backed?
6. What must be disabled until backend support exists?

## Product Rule

If a user clicks something that points to an existing object, show them where it is before opening a detached view.
