# AGENTS.md — Coding Agent Operating Manual

> Give this file to your coding agent and check that it is using these instructions. Keep the stack, commands, and ground rules current.

## 1. Project Overview
- **What this repo builds:** Pot Geometry, a poker drill trainer that prepares a player for the specific opponents in his recurring home game, plus the course Product Page in docs/.
- **Primary user & core workflow:** A regular in a recurring home game. He picks a villain or a generated study plan, answers decision spots, gets graded feedback tied to that villain's logged tendencies, then reviews mistakes and past sessions.
- **Tech stack:** Static HTML, CSS, and vanilla JavaScript. No build step: the built app is committed under app/dist and served as-is (also live at potgeometry.com). PostHog via CDN snippet for analytics. All progress stored in browser localStorage.

## 2. Commands
- **Install dependencies:** None. There is no package manager or build step in this repo.
- **Run locally:** `python3 -m http.server 8000 --directory app/dist`, then open http://localhost:8000 (a local server is required; the service worker and data files do not load from file://).
- **Run deterministic tests:** No automated suite is committed in this repo. Verification is manual drill flows plus the plan in tests/README.md.
- **Run model evals:** Not applicable. The app makes no model calls.

## 3. Non-Negotiable Engineering Rules
1. **Plan before coding:** Before touching multiple files, propose a brief plan and wait for approval.
2. **Small batches:** Make small, focused changes that can be reviewed and explained by a human in a single Pull Request.
3. **Explainability:** Avoid unnecessary abstractions or dependencies. Help the human builder understand the main components, what changed, why it matters, what could break, and how it was checked.
4. **Verify changes:** Run relevant checks. For a reproducible logic bug, use a failing test to demonstrate the fix when practical. Record manual checks and known limitations; follow the selected Build 4 evaluation track.
5. **Zero secrets in code:** Never hardcode API keys, tokens, or credentials. Always read from environment variables (`.env`) and update `.env.example` when new variables are needed.
6. **Stop when looping:** If a fix fails twice in a row, stop, summarize what failed, and ask the human before trying a third approach.
7. **Check the ship list:** After every commit or push, read the commit's file list and confirm it matches what you meant to ship. Born from a real mistake in Build 1: the first push silently omitted the entire built app because the repo template's .gitignore ignores dist/ folders. The commit reported success; only the file list showed the app was missing.

## 4. Shipping

- **How a change reaches users:** Edits made in ChatGPT publish straight to the live site at https://potgeometry.com (hosted through ChatGPT Sites). There is no staging environment and no build step.
- **Squarespace is DNS only:** Squarespace holds the domain registration and DNS records for potgeometry.com. It does not host the site.
- **GitHub is the rollback path, not the deploy path:** Pushing to this repo does not change the live site, and the live site can be ahead of this repo. After any live edit that matters, push the same change here so the version history stays usable for rollback.
- **Before publishing:** Run the app locally (see Commands) and click through the core workflow: pick a villain, answer a spot, check the graded feedback and the mistake review.
- **After publishing:** Open potgeometry.com, hard-refresh, and confirm the change is live and the core workflow still runs.

## 5. Ask Me First

Stop and ask the human before:

- Adding any new external service, endpoint, or third-party script, analytics included.
- Adding, rotating, or removing any key of any kind, including public analytics keys.
- Changing the bundled data files under app/dist/data (opponent profiles, villain spots, hand-history-derived stats) or how they are generated.
- Touching the domain, DNS, or hosting setup.
- Changing how visitor data is stored (localStorage keys, import/export formats).
