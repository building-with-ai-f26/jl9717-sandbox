# Pot Geometry v23 completion report

Baseline: `pot-geometry-source-v22.zip`, the v21 dataset plus the exact v22 PostHog integration. The separately published applied-quiz rewrite is not part of this explicitly requested baseline. v23 preserves the v22 quiz generator and Learn notes.

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | TODAY, PREFLOP, POSTFLOP, EQUITY LAB, STUDY appear in order. Mode IDs are exactly 6,4 / 0,1,2,5,10 / 3 / 9 / 8,7, with no duplicates; Quick Drill shows the requested copy. |
| 2 | PASS | The v22 snippet and capture helpers are byte-identical. Capture-call tests produce identical mode_selected, drill_answered and drill_completed events and payloads to v22; no analytics mode names changed. This verifies calls, not PostHog server receipt. |
| 3 | PASS | Quiz setup, session headings, next-question labels, results and progress use questions; singular/plural fixtures pass for 1 and 10. Other drill counts use hands. |
| 4 | PASS | By position filters to LJ/HJ/CO/BTN/SB/BB; By category groups the existing rows into Preflop, Postflop, Equity Lab and Concepts with unchanged averaging. |
| 5 | PASS | Browser run showed 1 of 2 done, then ✓ Done today after both daily spots; a simulated calendar rollover resets the readout without modifying daily data. |
| 6 | FAIL — full B4 specificity | Distinct hand/seat/action explanations and exact mix frequencies pass across 5,327 chart contexts. Three browser-played hands (43s BB vs BTN open, 63s CO RFI, T6s BTN RFI) had distinct matching explanations. The required strength tier cannot be derived from the unchanged source; limits are flagged below and in feedback. |
| 7 | PASS | Actual answer→grade→render tests produce celebrate/Perfect, nod/half-credit and ouch/Blunder. Browser checked table placement on desktop and 390px mobile, plus stage clear. Empty-review and empty-progress tests show sleep. All frames are static, including under reduced motion; no animation, timer, sound or network code was added. |
| 8 | PASS | Separate v22 and v23 runtimes return identical verdicts for identical Quick Drill, Postflop Trainer, Equity Lab, Villain Study and Concept Quiz fixtures. Existing range, grading, progress, offline, equity-pool and landing regressions pass. |

## B4 missing data, explicitly not inferred

| Spot types | Missing fields / resulting limit |
|---|---|
| Baseline RFI, Facing an Open, Facing a 3-Bet, Facing a 4-Bet, Facing a Limp, SB vs BB iso-raise | No within-continuing-range hand-strength ordering, hand EVs, or top/middle/bottom tier metadata. Per-hand frequencies establish whether/how often to continue, but do not rank the strength of hands within that range. Feedback names the hand, class, seats, action faced, exact mix and continuation membership, and explicitly marks the tier unavailable. Pure folds have no continuing tier. |
| Villain preflop spots (templates listed below) | No within-range strength ranks; seeded preferred/acceptable actions also have no graded per-action frequencies. Feedback distinguishes the pure constructed grid allocation from solved/graded frequencies, retains seeded precedence and all acceptable actions, and explicitly marks the missing strength tier. The old generic template is not used as a fallback. |

Villain preflop templates in v22: `big_open_defense` (4 seeds), `defend_vs_wide_3bettor` (4 seeds), `iso_raise_limper` (4 seeds), `three_bet_bluff_vs_non_folder` (6 seeds).

Data freeze: all `dist/data/` files, `equity.js`, `spots.js`, `exploit-ranges.js`, every grading/selection/recording function, the v22 PostHog snippet and event helpers are unchanged. No localStorage schema or keys changed. `presentation.js` only reads existing progress/daily/mistake state. The new source test fixture is outside public assets. Offline caching includes the bundled presentation helper.

Validation entry points: `node v23-presentation-test.cjs`, `node analytics-test.cjs`, and the existing trainer/PRD/equity/offline/range tests. The v23 presentation test includes an immutable v22 source fixture for reproducible comparisons.
