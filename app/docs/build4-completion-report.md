# Build 4 user-test fixes — November 25, 2026

P0 published separately as site v31; the remaining fixes are included in the next publication.

| Item | Result | Evidence |
| --- | --- | --- |
| C1 | Pass | Real landing click handler opens Quick Drill immediately. Browser confirmed Hand 1 without setup. Current table size and Settings session length are used. Menu detail route stays intact. |
| C2 | Pass | Hand/seat/action-specific plain-language reasoning precedes chart frequencies; 5,915 generated explanations checked. Internal tier messages and solver-disclaimer footnotes removed from drill feedback. Exact sourcing sentence appears once on Charts. |
| C3 | Pass | Boundaries 0%, 40%, 50%, 70%, 80%, 100% checked with actual mistake counts; only 80%+ receives STAGE CLEAR/praise. Unscored sessions are neutral. |
| C4 | Pass | Browser computed table clip-path is none, radius 999px. Filled, patterned, proportionate card backs replace tiny empty rectangles. |
| C5 | Pass | Decision strip shows every grading driver and its n before answering. Mismatched recorded action receives an explanatory line based on the existing exploit rule or loaded baseline. Spots with only one supplied driver show that one driver rather than inventing evidence. |
| C6 | Pass | RFI Call action is visibly labeled Limp while its internal ID/grade remains unchanged; all actions have equal resting colors. First-hand size-key tip dismisses and persists separately. Dollar explanation is explicit. |
| C7 | Pass | Bare definitions written from all 24 existing Learn notes; generic definition options audited for asked titles/abbreviations. Older saved definition options are cleaned when displayed without changing stored answer indices. EQ Learn note links to Equity Lab setup. |
| C8 | Pass | Train discloses actual missing coverage from loaded ranges. Four-handed lacks some open defenses and re-raise responses; six-handed also lacks 4-bet responses and is therefore not mislabeled complete. Settings retains its full report. |
| C9 | Pass | Progress uses template titles/humanized spot names without changing stored IDs. Quiz floating avatar removed; result avatar is in normal flow. Blunder displays as Miss while underlying grade and thresholds are unchanged. |

## Regression checks

18 test scripts pass. `fourmax-test.cjs` retains its pre-existing keyboard harness failure (session.feedback remains null after its simulated C key); the broader v23 regression suite passes actual registered-handler grading checks.

Updated legacy display-freeze assertions only where this PRD explicitly changes feedback or wording. Grading parity against v22 passes across preflop, postflop, Equity Lab, Villain Study and quiz verdicts; 5,327 distinct chart contexts checked. All JSON in dist/data, plus equity.js, spots.js, exploit-ranges.js, notebook.js, import-ui.js and study-plan.js, are byte-identical to v30. PostHog events/payloads and existing progress schema are retained. Only new preference: gtoTrainer.sizingTip.dismissed.

Optional Count the Outs micro-copy changed to describe count grading; numerical equity feedback, outs, enumeration and thresholds are unchanged. Offline cache is v32.
