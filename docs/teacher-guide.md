# Teacher Guide

## Purpose

Teachers manage classes, availability, students, materials, evaluations, and calendar health.

## Main Route

`/teacher/calendar`

The personal/professional profile is available at `/profile`.

## Approval

Teachers can maintain their photograph, biography, languages, specialties,
authorized levels, certifications, modalities, and optional introduction
video. Approval is read-only for the teacher and displays `pending`,
`approved`, or `suspended`. Teacher-derived scheduling and class permissions
remain unavailable until approval is `approved`.

## Calendar States

- Empty slot: no availability or booking exists.
- Available slot: teacher can receive bookings.
- Booked class: class assigned to a student.
- Blocked time: unavailable due to teacher/admin block.
- Conflict: schedule overlap or imported busy event.
- Completed/cancelled: lifecycle state of a class.

## Class Durations

The platform supports 30, 45, and 60 minute classes. Availability windows should support multiple possible slot combinations and optional cooldown gaps.

## Current Limitation

Manual availability, invitations, and several class workspace actions still use
the schedule preview service. The Google Calendar connection card itself is
backend-backed when both calendar flags are enabled.

## Connect Google Calendar

Google Calendar is optional and separate from MOSAICO login.

1. Open `/teacher/calendar` and the Calendar connection panel.
2. Review what MOSAICO reads and does not read.
3. Select **Connect Google Calendar** and approve the explicit Google consent.
4. Select one or more calendars whose occupied time should block availability.
5. Select one calendar owned by the connected account for MOSAICO class events.
6. Save, then synchronize.

MOSAICO shows private external time only as occupied. Existing Google events
remain after disconnect and MOSAICO classes are not cancelled. If Google access
is revoked, reconnect before syncing again.
