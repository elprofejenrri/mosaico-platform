# Repository Instructions

## Production release documentation

Every production release must update both of these representations in the same change set:

1. The production release history in `docs/TECHNICAL_WIKI.md`.
2. The structured in-application history in `frontend/src/data/productionReleases.json`.

Keep entries synchronized, newest first, and use only safe descriptions of user-visible or operational outcomes. Do not include secrets, identifiers, internal URLs, deployment internals, repository paths, infrastructure details, authorization mechanics, or sensitive failure modes in in-application release notes.

Run `npm run validate:releases` from `frontend` before completing a production release change.

## Release entry required for every pushed request

Whenever a user request results in a commit that will be pushed to `main` or
otherwise deployed to production, create a new production release entry before
the commit and push. This applies to every pushed request, including fixes,
small UI changes, configuration behavior, documentation features, and
operational improvements.

The new release must:

1. Use a new unique version greater than the current newest version.
2. Include the release date in ISO `YYYY-MM-DD` format.
3. Be added to both `docs/TECHNICAL_WIKI.md` and
   `frontend/src/data/productionReleases.json`.
4. Keep both representations identical and newest first.
5. Describe only safe, observable outcomes without secrets or sensitive
   implementation details.
6. Pass `npm run validate:releases` before the commit is created.

Do not push a request's commit without its corresponding production release
entry. If a commit is intentionally local-only and will not be pushed or
deployed, a release entry is not required until that commit enters a production
push.

## Magic release phrase

When the user says `magic`, execute the safe production release workflow for
the active change: validate the diff, run applicable tests and production
builds, update synchronized release documentation, commit, merge when needed,
push, apply a backfill only when the change requires one, and perform
post-release safety checks. Preserve production data, do not run destructive
operations without explicit authority, and stop rather than knowingly break
production.
