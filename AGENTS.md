# Repository Instructions

## Production release documentation

Every production release must update both of these representations in the same change set:

1. The production release history in `docs/TECHNICAL_WIKI.md`.
2. The structured in-application history in `frontend/src/data/productionReleases.json`.

Keep entries synchronized, newest first, and use only safe descriptions of user-visible or operational outcomes. Do not include secrets, identifiers, internal URLs, deployment internals, repository paths, infrastructure details, authorization mechanics, or sensitive failure modes in in-application release notes.

Run `npm run validate:releases` from `frontend` before completing a production release change.

## Magic release phrase

When the user says `magic`, execute the safe production release workflow for
the active change: validate the diff, run applicable tests and production
builds, update synchronized release documentation, commit, merge when needed,
push, apply a backfill only when the change requires one, and perform
post-release safety checks. Preserve production data, do not run destructive
operations without explicit authority, and stop rather than knowingly break
production.
