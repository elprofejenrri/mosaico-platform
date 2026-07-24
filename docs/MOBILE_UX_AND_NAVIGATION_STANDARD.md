# MOSAICO Mobile UX and Navigation Standard

Date: 2026-07-24

## Purpose

MOSAICO uses one shared mobile workspace model so navigation does not replace
the task in progress and page operations do not crowd the header:

```text
Left: platform navigation
Center: persistent active screen
Right: contextual operations
```

The model applies to public, student, tutor, teacher, school administration,
technical administration, finance, profile, Wiki, and Atlas surfaces. A page
does not need a right trigger when it has no real contextual operation.

## Component responsibilities

| Component | Responsibility |
| --- | --- |
| `MobileShellProvider` | Owns the one-open-drawer state, active navigation registration, active page registration, permission filtering, and route cleanup. |
| `MobileWorkspaceHeader` | Renders the left trigger, concise current title/context, optional right trigger, and both accessible modal drawers. |
| `useMobileNavigation` | Registers the current portal or page navigation and unregisters it on unmount. |
| `useMobilePageActions` | Registers the current page title, context, and actions and unregisters them on unmount. |
| `PortalNavigation` | Reuses the same role, feature-flag, permission, route, and expanded-group model on mobile and desktop. |
| Radix `Sheet` | Supplies portal/backdrop behavior, focus trapping, background isolation, Escape dismissal, and trigger-focus restoration. |

The provider is inside the router and outside the route switch. Opening a
drawer changes only shell state; it does not remount the active route.

## Usage rules

### Left drawer

Place portal destinations, the active role selector, allowed collapsible
sections, active-route state, and existing global controls such as language
and logout in the left drawer. Derive destinations from the existing portal
navigation, effective permissions, feature flags, and role access. Do not
build a universal hardcoded menu.

### Center

Keep the active form, list, calendar, detail, selected record, filters,
loading state, empty state, and errors in the center. Drawer toggles must not
clear local state or reset scroll. Dense true matrices may scroll
horizontally; ordinary records should use responsive cards or lists.

### Right drawer

Place only current-screen operations in the right drawer. Group them as
primary, record, view, secondary, or destructive actions. Keep destructive
actions separate and preserve the existing confirmation flow. A page-level
primary button may remain visible when hiding the only essential task would
reduce usability.

Never place destinations in the action drawer. Never show the trigger when
the resolved action list is empty. Never register preview-only success
buttons as production actions.

## Page action contract

A registered action may use:

```js
{
  id,
  label,
  icon,
  permission,
  minLevel,
  scope,
  visible,
  visibilityRule,
  disabled,
  disabledRule,
  disabledReason,
  priority,
  group,
  destructive,
  handler,
  loading,
  keepOpen
}
```

`handler` is required. Visibility is filtered against the existing effective
permission and scope state before rendering. Loading or disabled actions
cannot execute, and a running action prevents duplicate execution. Async
errors are reported honestly. Registration is effect-scoped and removed when
the page unmounts; route changes close drawers so stale operations cannot
remain visible. Portal-level page metadata uses a lower registration priority
than nested route metadata, so a calendar, IAM, or settings screen reliably
overrides its portal fallback regardless of React effect order.

Example:

```jsx
const mobilePage = useMemo(() => ({
  title: copy.title,
  context: copy.workspace,
  actions: [{
    id: "calendar-sync",
    label: copy.googleCalendar,
    icon: CalendarDays,
    permission: "calendar.teacher.sync_google",
    priority: 10,
    group: "primary",
    handler: () => setCalendarPanelOpen(true),
  }],
}), [copy]);

useMobilePageActions(mobilePage);
```

Action labels must come from the page translation copy or shared translation
keys. The same callbacks and state used by visible desktop controls should be
registered; do not maintain a second implementation.

## Responsive behavior

- Below `lg`, including mobile and tablet: use the shared 44-pixel three-zone
  header and modal drawers. Content may adopt existing two-column layouts
  where controls remain touch-safe.
- At `lg`: portal navigation becomes the existing sticky, independently
  scrolling desktop sidebar.
- At desktop navbar widths (`lg` and above): preserve the existing top
  navigation and profile dropdown.

Use repository Tailwind breakpoints only. Drawer width is `min(88vw, 22rem)`,
height uses `100dvh`, and safe-area insets protect the top and bottom. Keep
single-column forms and avoid page-level horizontal overflow at 320 CSS
pixels.

## Accessibility standard

- Use semantic `header`, `nav`, headings, and real buttons.
- Give triggers localized accessible names and expose `aria-expanded` and
  `aria-controls`.
- Give each drawer a title and description that announces its purpose.
- Trap focus, make the background unavailable, close on Escape/backdrop, and
  restore focus to the opening trigger.
- Maintain at least 44 by 44 CSS pixel trigger and action targets.
- Preserve visible focus, non-color state indicators, contrast, reading
  order, and `motion-reduce` behavior.
- Mark active destinations with `aria-current`.
- Keep the right-side alignment placeholder hidden from assistive technology
  when no actions exist.

## Internationalization

The shared `mobileShell` copy must maintain English and Spanish parity for:
open/close navigation, main navigation, open/close page actions, page actions,
no actions, current section, back, cancel, apply, reset, filters, sort, more
options, loading/error states, and every action group.

Language changes update drawer titles, trigger names, page title/context, and
page action labels without refresh. New visible or accessible text must not be
hardcoded in shared components.

## RBAC and security

Frontend filtering is a usability layer, not authorization. Navigation
continues to use the existing active role, effective roles, permission
levels, feature flags, and portal mapping. Actions may additionally require a
permission level and scope. Until those inputs are known, privileged actions
must remain hidden or unavailable.

Every operation remains protected by its backend permission, scope, ownership,
resource-state, and business-transition checks. Do not pass frontend role,
school, scope, or ownership claims as authority.

## State, network, and lifecycle

Only one drawer may be open. Opening one replaces the other. Route changes,
profile changes that navigate, logout, and session redirects close drawer
state. Completed actions close by default; `keepOpen` is reserved for
operations that explicitly need it. Loading actions prevent double submits.
Dynamic actions must not reuse stale privileged data during slow or failed
requests.

Confirmations and page-specific side panels should open after the action
drawer closes. The route component and its unsaved form, selection, filters,
tabs, and scroll position remain mounted.

## Testing checklist

- Component: burger, both drawers, no-action state, one-open rule, route
  cleanup, active route, action execution, duplicate prevention, and state
  preservation.
- Accessibility: focus trap/restoration, Escape, backdrop, names, landmarks,
  touch targets, reduced motion, zoom, and isolation.
- RBAC: each portal menu, unauthorized action removal, permission levels,
  scopes, feature flags, and backend denied operations.
- Responsive: 320, 360, 390, 430, small tablet, landscape, desktop, safe
  areas, keyboard, and no horizontal page overflow.
- Internationalization: repeat essential navigation and actions in English
  and Spanish.
- E2E: student profile, teacher calendar/availability, IAM user workflow, and
  language switching against a connected test environment.

## Anti-patterns

Developers must not:

- create independent page sidebars or a second navigation architecture;
- mix navigation destinations and page operations;
- hardcode one mobile menu for all users;
- show unauthorized, invalid, stale, or fake actions;
- replace or remount the center screen merely to show navigation;
- use ambiguous or sub-44-pixel action icons;
- ship drawers without focus management and background isolation;
- duplicate mobile and desktop operation logic;
- add untranslated visible or accessible labels;
- use unchanged desktop tables on narrow screens when a readable card/list
  pattern is appropriate.
