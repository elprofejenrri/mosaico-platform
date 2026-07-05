# Student Guide

## Purpose

Students use MOSAICO to learn Spanish through roadmaps, live classes, credits, practice, tests, badges, and progress feedback.

## Main Routes

- `/student`: daily dashboard.
- `/student/roadmap`: learning path.
- `/student/classes`: class activity.
- `/student/progress`: progress.
- `/student/ai-tutor`: preview learning assistant.
- `/student/community`: preview community.

## Expected Production Behavior

Important student state should persist after refresh: roadmap position, completed activities, credits, bookings, badge unlocks, tests, practice tests, and feedback.

## Current Limitation

Several student learning interactions are still frontend-first. They should be connected to backend persistence before real students depend on them.
