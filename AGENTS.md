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
