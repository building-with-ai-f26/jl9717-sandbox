# Security audit: Pot Geometry

Lane: Beginner ("Ship it"). Live at https://potgeometry.com. Audit run Nov 18, 2026, against the live site's own files.

## My kind of app

Pot Geometry is a static web app: plain HTML, CSS, and JavaScript files served as-is. There is no server, no database, no accounts, and no sign-in. Squarespace holds only the domain's DNS; the site itself is hosted through ChatGPT Sites.

Two kinds of data exist:

- Bundled data shipped with the site: poker study content, plus aggregated per-player statistics built from my home game's hand histories (counts and percentages, the source file name, and a SHA-256 of it). No raw hand-history text is published.
- Data a visitor creates: drill progress, settings, and anything they import stays in their own browser's localStorage. It is never sent anywhere.

The only network calls the app makes are same-origin file loads and one analytics service (PostHog), which receives anonymous usage events such as which drill mode was opened and whether an answer was right.

## What I checked

1. Row-level security on every table.
2. Secret keys stay on the server: I searched the live site's code for keys, the same test the "no database" column of the assignment specifies.
3. Private storage.
4. Production out of the agent's reach.
5. Spending caps and rate limits, including the repeated-call test.
6. Dependencies: looking for a package manifest and anything for npm audit or pip-audit to scan.
7. Agent attack review: I read the import code as an attacker. The app's one real input surface is the Villain Study hand-history import (uploaded files, pasted text, and a name-mapping field), plus three JSON imports in Settings (solver ranges, exact-spot baselines, and progress backups). I traced every string that comes out of an imported file to the place it is rendered on the page.

## What I found

1. **RLS: does not apply.** There are no tables and no user accounts. Nothing to lock down because no shared data exists.
2. **Keys: pass.** The full search of the live code found exactly one key: the PostHog project key (`phc_...`) in the page. That key is public by design; it can only send events in, and it cannot read anything back. There are no secret keys anywhere in the app, because there is no server for them to live on.
3. **Private storage: does not apply.** The app has no file storage and no uploads. The import panel reads files on the device and says so in its own text ("Files are read on this device. Nothing is uploaded."), and the code matches that: imported hands are parsed locally and stored only in the visitor's localStorage.
4. **Production access: one real gap.** My editing tool (ChatGPT) publishes changes straight to the live site. There is no staging copy and no review step between an edit and production, so a bad edit would be live immediately. The blast radius is small: there is no server-side user data to damage, each visitor's data sits in their own browser, and the code is versioned in GitHub, so a bad publish can be rolled back. But the separation the check asks for is not there. This is listed under "What is left."
5. **Spending caps and rate limits: does not apply.** The app has no AI route and calls no paid API, so there is no route to call 30 times and nothing that can run up a bill. PostHog event ingestion on a public write-only key is the only third-party traffic.
6. **Dependencies: none.** There is no package.json and no dependency list. Every script is a first-party file written for this app and served with the site, so there is nothing for a dependency scanner to scan and no third-party code to inherit vulnerabilities from.
7. **Attack review: the import surface holds up.** A hostile hand-history file gets its player names, file names, and raw hand lines rendered in several places: the import report, the review-mode feedback, and the study-plan review cards. Every one of those render paths passes imported strings through the app's escaping function, which neutralizes `<`, `>`, `&`, and both quote types, so markup planted in a player name or a file name displays as inert text instead of running. The progress-backup import validates the file's structure (version, allowed values, numeric checks) and keeps the existing data if the file is invalid. There is no `eval`, no dynamic code execution, and no `document.write` anywhere in the codebase. Tampering with localStorage can only affect the visitor's own browser; there is no shared state to poison. This was a code read of the live files, not a fuzzing run.

## What I fixed

No code fixes were needed. Every check either passed as the app is already built or does not apply to a static app with no server. The one gap found (check 4) is a process gap, not a code bug, and it is carried openly in the next section rather than patched over.

## What is left

- **No staging step before publishing.** Edits go straight to the live site. Mitigations in place: GitHub version history for rollback, and no server-side user data at risk. A pre-publish review pass is the improvement to make if the app grows.
- **GitHub can lag the live site.** Some edits made through ChatGPT have not been pushed, so the repo is not always an exact copy of production. The audit above was run against the live files for that reason.
- **Internal version labels are inconsistent** (code comments and the offline cache name use different numbers). Cosmetic, but worth normalizing so "which version is live" has one answer.
