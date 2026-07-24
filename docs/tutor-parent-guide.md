# Tutor And Parent Guide

## Purpose

Tutors and parents manage learning for one or more students. They need clear visibility into progress, bookings, credits, feedback, messages, and alerts.

## Main Routes

- `/profile`: tutor identity, relationship summary, and server-derived linked students.
- `/tutor`: dashboard.
- `/tutor/students`: student management.
- `/tutor/classes`: classes.
- `/tutor/credits`: shared wallet.
- `/tutor/progress`: progress.
- `/tutor/feedback`: feedback.
- `/tutor/messages`: communication.

## Operating Model

The tutor profile should be linked to child/student profiles through a durable relationship model. Credits can be shared or assigned to students depending on final business rules.

The profile screen now reads active relationships from
`tutor_student_links`; it does not accept student IDs or relationship scope
from the browser.

## Current Limitation

Tutor wallet and child profile workflows need backend persistence and permission scoping before production launch.
