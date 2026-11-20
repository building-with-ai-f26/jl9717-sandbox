# Inline stat definitions — completion report

Base: published v23. Presentation-only patch; all stat data, definitions, comparisons, badge logic, grading and PostHog are unchanged. The offline cache version advances so returning users receive the display patch.

| Criterion | Result | Evidence |
|---|---|---|
| 1. Inline panels | PASS | Browser clicked every one of Ben’s nine Preflop stat buttons. Each opened beneath its own row, no modal was created, and closing left the scroll position unchanged. The handler preserves the viewport on opening, switching and closing, with table scroll anchoring disabled. |
| 2. Toggle, switch, Escape | PASS | Button re-click closes; opening another stat closes the earlier panel in the same table. Escape closes open panels without moving focus. Automated accordion checks and browser switching passed. |
| 3. PFR contents | PASS | Ben: definition unchanged, 38.2% vs 29.3%, 8.9 pts above, 723 / 1895, graded. Gap uses the same one-decimal numbers displayed in the row. |
| 4. Other profile/section | PASS | Alex PFR: 32.1% vs 29.3%, 2.8 pts above, 446 / 1388. Alex Flop c-bet: 33.9% vs 54.7%, 20.8 pts below, 75 / 221. Original definition wording and graded notes verified. |
| 5. Mobile | PASS | 390px iframe check: panel and table both 301px wide inside the 375px content viewport (390px including scrollbar); document scroll width equals viewport, no horizontal overflow. Button height is 40px. Panel’s three lines stack and wrap. |
| 6. Keyboard | PASS | Tab moved VPIP → PFR; Enter opened it; Escape closed it. Focus stayed on PFR at scrollY 1326. Real native buttons support Space as well. aria-expanded and aria-controls expose state and association. |
| 7. Regression/analytics | PASS | All 135 rows on five profiles retain byte-equivalent value/count/average/benchmark/badge markup. Definition strings match pre-patch. Data files and grading engines are byte-identical; app.js changes only the cache key. Existing analytics tests verify unchanged three events and payloads through real answer handlers; no claim of PostHog server receipt. |

## Existing reliability threshold

`badge(n)` delegates to `SpotEngine.status(n)`: **n ≥ 100 = graded**, 30–99 = lean, below 30 = hidden. Inline sample notes call that same status function, not a duplicated threshold. At n=100 the note is “Graded: sample is large enough to rely on.” At n=99 and below it is “Small sample: treat this number as a rough read.” Boundary tests pass.

Ratio rows (Aggression factor) retain their ratio and count and explicitly state that a percentage-point comparison is not applicable. Rows with no observations or unavailable table averages do not fabricate a rate or gap.

## Every former popup surface

One shared handler previously served all clickable stat names in the main Observed stats tables. It is now removed from the stat-name route entirely.

| Profiles | Former popup sections | Replacement |
|---|---|---|
| Rob, Ben, Alex, Ruining, My leaks (Tiger) | Preflop; 3-bet war; Flop; Later streets; Showdown; Other | Every stat button opens the shared inline row panel. One panel per table. |

There were no other stat-definition popup callers in the app. Latest-session stats use plain, non-clickable labels and did not open this popup; they remain unchanged. “View driving stat” links continue navigating to the stat row and never opened a definition modal. Glossary, chart dialogs, study-note dialogs, and all other modals are unchanged.

**Remaining stat-name overlays: none.** No dimming, blur, focus trap, scroll lock, hover dependency, animation loop or new network request was added.

Checks: `node inline-stat-test.cjs`, `node analytics-test.cjs`, `node v23-presentation-test.cjs`, `node prd-test.cjs`, `node offline-test.cjs`; plus desktop and mobile browser checks.
