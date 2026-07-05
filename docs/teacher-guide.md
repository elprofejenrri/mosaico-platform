# Teacher Guide

## Purpose

Teachers manage classes, availability, students, materials, evaluations, and calendar health.

## Main Route

`/teacher/calendar`

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

The teacher calendar workspace still has mock/service-abstraction behavior. Full backend persistence and Google Calendar sync are a launch blocker for production scheduling.
