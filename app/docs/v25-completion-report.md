# Pot Geometry v25 completion report

Date: 2026-11-11. Baseline: trainer v24. Spec: "Pot Geometry v25: Study Plan, Session Review, Hand-History Import".

## Status

| Part | Result | Notes |
|---|---|---|
| 1 Study Plan | Built | `dist/study-plan.js` |
| 2 Session Review | Built | `dist/study-plan.js` |
| 3 Hand-History Import | Built | `dist/import-ui.js`; spec text supplied separately on 2026-11-11. See "Part 3" below. |

## Files changed

- New: `dist/study-plan.js`, `v25-test.cjs`, this report.
- `dist/app.js`: two storage keys added to `K`, an `ext()` hook helper, and one-line hook calls in `go`, `changeTableSize`, `nextSpot`, `renderSession`, `answer`, `advance`, `summary`, `showProgress`, `exportProgress`, `importProgress`, the Save & quit handler. `quizSpot(card)` takes an optional card (no argument = old behavior). Offline status check reads cache `tiger-gto-v25`.
- `dist/villain-ui.js`, `dist/equity-ui.js`: session header label, plan source line, and `afterAnswer` hook (one call each).
- `dist/presentation.js`: Study Plan card added to the TODAY strip.
- `dist/index.html`, `dist/sw.js` (cache `tiger-gto-v25`, asset list), `dist/style.css` (appended block).
- Untouched: `evaluate`, `record`, `recordVillain`, `recordEquity`, `SpotEngine`, `EquityMath`, `ExploitRanges`, all `dist/data/`, the `modes` array and mode IDs, the PostHog snippet and the three capture helpers.

## PostHog payloads (exact)

| When | Call |
|---|---|
| Plan started for the first time that day | `mode_selected` `{mode:"Study Plan"}` (once; not on resume, not when viewing finished results) |
| Each scored answer inside the plan | `drill_answered` `{mode:<home mode label>, correct:<score===1>}` through the unchanged `captureDrillAnswered`. Home mode label is `"Mistake Review"` (pool A), `"Preflop by Position"`, `"Preflop by Spot"`, `"Postflop Trainer"`, `"Equity Lab"` or `"Concept Quiz"` (pool B), `"Concept Quiz"` (pool C), `"Quick Drill"` (fallback). Unscored answers (lean villain reads) fire nothing, as in v24. |
| Plan results screen reached | `drill_completed` `{mode:"Study Plan"}` (once) |
| "Drill this spot again" | `mode_selected` `{mode:<home mode by kind>}`, then the normal `drill_answered` / `drill_completed` for that mode |

No new event names. Existing modes fire identical payloads to v24 (`analytics-test.cjs`, `v23-presentation-test.cjs` pass unchanged).

## Storage

- `gtoTrainer.studyPlan.v1`: `{date, items:[{kind, ref, pool, mode, cat?, answered?, score?}], done, completed, started, starter, tableSize, alt?}`. `date` follows the Daily Hand day key (`YYYY-MM-DD` for 6-handed, `YYYY-MM-DD:4` for 4-handed). `alt` holds the other table size's plan for the same day so switching table size does not discard it.
- `gtoTrainer.sessionLog.v1`: array of `{id, dateISO, modeLabel, tableSize, partial, answers:[snapshot], planDate?}`, newest last, capped at 50.
- Existing keys and formats unchanged.

## Decisions made where the spec left room

1. Fallback items use pool value `"Q"` (Quick Drill) in addition to A/B/C, so the results breakdown can show them separately.
2. Villain-template leak categories are skipped in Pool B. The spec lists preflop, postflop and equity generators; Villain Study has its own 20-deal repeat window and unscored lean spots. The next leak category is taken instead.
3. Pool A takes every non-retired mistake for the current table size (not only those due today), in queue order.
4. Quiz accuracy for Pool C is computed from all quiz rows regardless of table size.
5. Equity and quiz plan items are generated when reached (the item slot, pool and order are fixed at build time). This avoids consuming the Equity Lab shuffle bag when a plan is built or rebuilt.
6. Tapping the Study Plan card starts or resumes the plan directly; a finished plan opens its results.
7. A resumed plan is logged as two session entries (first partial, second complete). The plan results screen shows totals and the review list for the whole plan.
8. Review cards for preflop villain spots keep all text shown at answer time but not the interactive 169-cell range grid (about 60 KB per answer). "Drill this spot again" reopens it.
9. Session-log writes use a direct try/catch (not `write()`), because the spec's drop-oldest-and-retry rule needs to see the failure and stay silent. Drop size on quota failure: the oldest half.
10. A table-size switch mid-session also saves a partial log entry, same as Save & quit.
11. "Recent sessions" opens a dedicated review screen under Progress; the per-hand accordion lives there and on the results screen.

## Validation

`node v25-test.cjs` (new): starter plan; 40/40/remainder composition and shortfall flow at 10, 15 and 20; two-in-a-row rule over 300 random mixes; uniqueness; full plan run through the real answer handlers (progress rows, mistake retirement rules, Daily Hand untouched, exact analytics payloads); save and resume; per-table-size plans; log shape, partial flag, cap of 50, quota fallback, silent failure; snapshot review for all five kinds with grading functions spied (zero calls); HTML escaping of imported snapshots; drill-again; export and import with and without a session log.

Existing suite: same results before and after the change. 12 pass. 4 fail on both v24 and v25 for unrelated reasons: `exploit-range-test`, `inline-stat-test`, `pool-test` need a git checkout (`git show HEAD:...`) and this folder is not a repository; `fourmax-test` throws `Cannot read properties of null (reading 'score')` on untouched v24.

Browser pass (headless Chrome, 1200px and 390px): starter card, rebuild, full plan, quit and resume ("Study Plan · item 6 of 10"), results breakdown, review accordion (one open at a time, no modal), Progress, session review. No page errors, no horizontal overflow, no external requests required.

## Part 3: Hand-History Import

Entry point: "Import hand histories" panel on the Villain Study home screen (file picker with multiple files, paste area, name-mapping field, inline report, list of imports with "Remove import").

Acceptance criteria 6 and 7 and completion-report item 4 were supplied after the first Part 3 build. They are checked item by item under "Acceptance criteria 6 and 7, report item 4" below; `import-test.cjs` was extended to assert each one.

### Files

- New: `dist/import-ui.js`, `import-test.cjs`.
- `dist/app.js`: `ext('applyImports')` before `SpotEngine.load` in `init`; `'review'` accepted as a villain-progress classification in backup validation.
- `dist/villain-ui.js`: imported spots joined into `villainPool`; "Imported" choice in the Kind filter (only when imports exist); review count in the pool line; import panel; `villainSpot` deals review spots; `villainFeedback` and `answerVillain` branch for `status:"review"`; progress table label for review rows.
- `dist/study-plan.js`: session-review snapshot for review spots; drill-again finds imported spots; export/import of the two new keys.
- `dist/index.html`, `dist/sw.js` (asset list), `dist/style.css` (appended block).
- Untouched: `spots.js` (SpotEngine), `exploit-ranges.js`, `equity.js`, all `dist/data/` files (sha256 of the folder is asserted equal before and after an import in `import-test.cjs`).

### Storage (additive)

- `gtoTrainer.importedSpots.v1`: array of candidate spots in the seed schema, plus two extra fields the grading rule needs: `importMeta` (`handClass`, fallback stat `refs`, `rawAction`) and, for review spots, `reviewReason`.
- `gtoTrainer.profileDeltas.v1`: `{version, aliases, imports:[{id, at, files, handIds, players:{name:{hands, seatSum, stats:{key:{num,n}}, bench}}, spotIds}]}`. Deltas are kept per import so one import can be removed without touching the others. At load, counts are bundled value plus the sum of all imports, percentages are recomputed from counts, and nothing is ever written to the bundled JSON.

### How each requirement is met

| Requirement | Implementation |
|---|---|
| PokerStars text, local only | Parser is a line-for-line JavaScript port of `scripts/import-hand-history.py` (same regexes, same counter rules, same pot reconciliation). No network code. |
| Hero | `meta.hero` from `villain_spots_seed.json`. Hands without the hero count toward opponent stats only. |
| Stat updates, additive | All 26 count-based stats are updated: vpip, pfr, rfi, rfi_btn, rfi_sb, open_limp_when_first_in, iso_raise_vs_limp, bb_fold_vs_open, bb_3bet_vs_open, three_bet, fold_to_3bet, four_bet_vs_3bet, cbet_flop, barrel_turn, barrel_river, fold_to_cbet, raise_vs_cbet, fold_to_bet_flop/turn/river (with benchmark), check_raise, wtsd, wsd, showdown_weak_hands, river_aggression_weak_at_showdown, all_in_hands. Counts are only added. |
| Stats not updated, with reasons | `aggression_factor` and the three sizing medians: not poolable from stored summaries (reported every time). Per player: any stat with no opportunities in the import. Tracked players absent from the import are named. |
| New players | Listed in the report, never added. A log name can be mapped to an existing profile in the name-mapping field (prefilled with K Bon=Alex, Crawfish=Ruining from the bundled data). |
| Candidate spots | One per hand where the hero acted on the flop, turn or river. Fields as specified; `difficulty` omitted; `tableSizeNote` only when the seat count is not exactly 4 or 6; `whatTigerDid` in option vocabulary. |
| Grading rule | See "Grading rule details". No other path produces `status:"graded"`. |
| Review mode | Answer, then "What Tiger did" and driver stats. Recorded in villain progress with `classification:"review"`, `score:null`. No progress row (no XP), no mistake-queue entry, no analytics event. |
| Duplicates | Skipped and counted when the hand ID is in the seed spots, in imported spots, in any earlier import, or inside the ID range the bundled profiles already cover. |
| Report | Inline panel with every listed item. A file with zero new hands is called out and stores nothing. |
| Seed drills after an import | Displayed numbers in seed `driverStats`, seed evidence text and study notes follow the new counts (same refresh as the Python importer). Seeded best, acceptable and forbidden actions, cards and options are asserted unchanged. |

### Grading rule details (judgment calls)

1. Only the six postflop templates can match, because candidates are flop, turn or river decisions. The four preflop templates never apply to an imported spot.
2. A template "match" has four parts: decision shape, hero hand class, every driver stat at n of at least 100, and the villain's current numbers showing the tendency the template is named for. The last part is not in the spec text; without it the importer would write sentences such as "Ben c-bets only 61.7%" and grade a stab against a frequent c-bettor. Thresholds live in one table (`IMPORT_TEMPLATES` in `import-ui.js`):

| Template | Shape | Hero hand | Tendency required |
|---|---|---|---|
| defend_vs_wide_cbet | flop, facing the preflop raiser's first bet | any; answer by class: two pair or better raise (call acceptable), any pair or draw call, otherwise fold | cbet_flop at least 60% |
| stab_vs_low_cbettor | flop, preflop raiser checked to hero | below top pair | cbet_flop at most 45% and fold_to_bet_flop above its benchmark |
| barrel_vs_over_folder | turn, hero bet flop and villain called, no bet to hero | below top pair | fold_to_bet_turn above its benchmark |
| river_vs_value_heavy_bettor | river, facing a bet | any; top pair or better call (raise also acceptable with two pair or better), otherwise fold | weak share of shown-down river bets at most 30% |
| river_bluff_vs_over_folder | river, no bet to hero | no pair | fold_to_bet_river above its benchmark |
| thin_value_vs_caller | river, no bet to hero | second pair, or top pair with a kicker below a jack | showdown_weak_hands at least 50% |

3. `best`, `acceptable`, `forbidden`, `rule` and the `why` sentence use the same values and wording as the seed spots for that template, with the villain's current numbers.
4. Hand class is computed from ranks and suits only (pair level against the board, flush or straight draw). No ranges or equity.
5. One candidate per hand: the first hero decision that can be graded now, else the first that fits a template shape, else the last postflop decision.
6. Villain in multiway pots: the last bettor or raiser when facing a bet; otherwise the last opponent to act before the hero on that street.
7. The grading rule is re-run whenever counts change, so an earlier review spot can become graded after a later import pushes a stat past n=100 (the report says how many), and numbers, text and status always agree.
8. A bet by the hero maps to the nearest of 33/50/66/75/100% when it is between 25% and 125% of the pot; anything else is reported as unmapped.
9. Additions beyond the spec: per-import removal, the name-mapping field, the two keys in Export/Import JSON, and the bundled-ID-range duplicate check (without it, re-importing a session already inside the bundled profiles would double count).

### Import-test fixture output

Fixture: `data-imports/80loss_11-5.txt` (the real Nov 5 2026 session, 150 hands), checked against `data-imports/session-2026-11-05-audit.json`, which was produced independently by the Python importer. Command: `node import-test.cjs`.

```
Parser parity: 150/150 hands parsed and pot-reconciled; 104 player-stat counters equal the Python audit (Ben, K Bon, Tiger, Crawfish).
Unchanged fixture: 150 found, 0 new, 150 duplicates (already counted in the bundled profiles), nothing stored.
Fresh-ID import: 2 files read, 149 hands parsed, 1 unparseable (Pot does not reconcile with the summary), 0 duplicates, new player Stranger listed and not added, Rob untouched.
Stat updates: Ben +148 hands, 26 stats; Alex +148 hands, 26 stats; Tiger +148 hands, 25 stats; Ruining +98 hands, 24 stats.
Example: Ben vpip n 1895 -> 2043, fold_to_3bet n 112 -> 120 (8% -> 8.3%).
Candidates: 67 spots from 149 hands = 25 graded + 42 review. Graded by template: defend_vs_wide_cbet 11, barrel_vs_over_folder 4, stab_vs_low_cbettor 4, thin_value_vs_caller 5, river_bluff_vs_over_folder 1. Hands with no spot: 81 no postflop hero decision, 1 without hero, 0 vs untracked player. Unmapped hero actions: 1.
Sample graded spot: {"id":"ben-defend-vs-wide-cbet-imported-1","villain":"Ben","street":"flop","heroHand":["9d","Kc"],"board":["9h","3s","6d"],"potBb":49,"toCallBb":21,"exploit":{"best":"call","acceptable":["call"],"forbidden":[],"why":"Ben c-bets 61.7% of the time (n=504) and folds to c-bets 51.7% (n=201), so his bets include a lot of air. Continue with a piece or a draw.","rule":"Call with any piece or a draw, raise strong hands; fold pure air."},"whatTigerDid":"call","psHandId":250000012299}
Sample history (ben-flop-imported-1, review): Ben (BTN) calls 1.0bb | Alex (SB) calls 0.5bb | Tiger (BB) checks | --- FLOP [Kc Ac Th] | Alex (SB) checks | Tiger (BB) checks | Ben (BTN) bets 2.2bb | Alex (SB) calls 2.2bb => pot 7.5bb, to call 2.2bb, Tiger: fold
Re-import of the same text: 149 duplicates skipped, 0 parsed, counts and spots unchanged.

AC6 known hand #250000002299: heroPos BTN, villainPos SB (Ben), pot 49bb, to call 21bb, options fold/call/raise, whatTigerDid call, psHandId 250000012299, effective stack 145bb. All equal the hand-computed values ($24.50 pot and $10.50 to call at $0.50 big blind).
AC6 stat amounts: 104 counters across Ben, Alex, Tiger, Ruining moved by exactly the audit amounts. Listed minimum stats (opportunities added / outcomes added / new total n):
  Ben: vpip +150/+91/2045, pfr +150/+73/2045, rfi +69/+43/882, fold_to_3bet +8/+1/120, cbet_flop +44/+28/504, fold_to_cbet +9/+6/201
  Alex: vpip +149/+98/1537, pfr +149/+41/1537, rfi +63/+35/650, fold_to_3bet +13/+1/130, cbet_flop +16/+4/237, fold_to_cbet +28/+21/217
  Tiger: vpip +149/+74/2259, pfr +149/+25/2259, rfi +66/+15/983, fold_to_3bet +6/+0/133, cbet_flop +11/+5/300, fold_to_cbet +14/+8/285
  Ruining: vpip +98/+48/2072, pfr +98/+17/2072, rfi +33/+7/897, fold_to_3bet +4/+1/115, cbet_flop +7/+7/244, fold_to_cbet +14/+10/341
AC6 second import of the same file: 150 of 150 skipped as duplicates, 0 parsed, counts and spots unchanged.
AC7 matches no template: ben-flop-imported-1 (Flop c-bet % n=504) is in the Villain Study pool as review; answered: score null, XP rows +0, mistake queue unchanged, villain progress +1 row marked review.
AC7 driver stat under n=100: ruining-river-vs-value-heavy-bettor-imported-1 (Weak hands in shown-down river bets % n=50, Wins at showdown % n=251) is in the Villain Study pool as review; answered: score null, XP rows +0, mistake queue unchanged, villain progress +1 row marked review.

IMPORT REPORT (fixture 80loss_11-5 under fresh hand IDs)
Files read: 1 (80loss_11-5-fresh-ids: 150 found, 150 new)
Hands parsed: 150
Skipped as unparseable: 0
Duplicates skipped: 0
New players seen: none
Candidates created: 67 (25 graded, 42 review)
Hands with no spot: 82 no postflop hero decision, 1 without hero, 0 vs untracked player
whatTigerDid not mapped: Hand #250000012361 -> alex-river-imported-1 (bets 15446% pot), spot created without it
Per-player stat updates (stat: opportunities added, new total n):
  Ben (+150 hands, 2045 total): vpip +150 -> 2045; pfr +150 -> 2045; rfi +69 -> 882; rfi_btn +32 -> 390; rfi_sb +12 -> 155; open_limp_when_first_in +69 -> 882; iso_raise_vs_limp +27 -> 171; bb_fold_vs_open +30 -> 371; bb_3bet_vs_open +30 -> 371; three_bet +48 -> 809; fold_to_3bet +8 -> 120; four_bet_vs_3bet +8 -> 120; cbet_flop +44 -> 504; barrel_turn +10 -> 122; barrel_river +6 -> 40; fold_to_cbet +9 -> 201; raise_vs_cbet +9 -> 201; fold_to_bet_flop +29 -> 396; fold_to_bet_turn +17 -> 241; fold_to_bet_river +7 -> 144; check_raise +19 -> 407; wtsd +81 -> 1114; wsd +17 -> 229; showdown_weak_hands +15 -> 225; river_aggression_weak_at_showdown +3 -> 50; all_in_hands +150 -> 2045
  Alex (+149 hands, 1537 total): vpip +149 -> 1537; pfr +149 -> 1537; rfi +63 -> 650; rfi_btn +27 -> 273; rfi_sb +12 -> 111; open_limp_when_first_in +63 -> 650; iso_raise_vs_limp +11 -> 120; bb_fold_vs_open +28 -> 274; bb_3bet_vs_open +28 -> 274; three_bet +74 -> 663; fold_to_3bet +13 -> 130; four_bet_vs_3bet +13 -> 130; cbet_flop +16 -> 237; barrel_turn +3 -> 38; barrel_river +1 -> 12; fold_to_cbet +28 -> 217; raise_vs_cbet +28 -> 217; fold_to_bet_flop +49 -> 366; fold_to_bet_turn +26 -> 220; fold_to_bet_river +8 -> 84; check_raise +28 -> 320; wtsd +90 -> 861; wsd +22 -> 170; showdown_weak_hands +16 -> 158; river_aggression_weak_at_showdown +2 -> 24; all_in_hands +149 -> 1537
  Tiger (+149 hands, 2259 total): vpip +149 -> 2259; pfr +149 -> 2259; rfi +66 -> 983; rfi_btn +34 -> 497; rfi_sb +8 -> 168; open_limp_when_first_in +66 -> 983; iso_raise_vs_limp +17 -> 118; bb_fold_vs_open +29 -> 421; bb_3bet_vs_open +29 -> 421; three_bet +70 -> 1009; fold_to_3bet +6 -> 133; four_bet_vs_3bet +6 -> 133; cbet_flop +11 -> 300; barrel_turn +2 -> 72; fold_to_cbet +14 -> 285; raise_vs_cbet +14 -> 285; fold_to_bet_flop +29 -> 471; fold_to_bet_turn +17 -> 221; fold_to_bet_river +8 -> 131; check_raise +24 -> 395; wtsd +67 -> 1123; wsd +17 -> 250; showdown_weak_hands +17 -> 250; river_aggression_weak_at_showdown +1 -> 32; all_in_hands +149 -> 2259
    not updated, no opportunities in the import: barrel_river
  Ruining (+98 hands, 2072 total): vpip +98 -> 2072; pfr +98 -> 2072; rfi +33 -> 897; rfi_btn +7 -> 422; rfi_sb +1 -> 150; open_limp_when_first_in +33 -> 897; iso_raise_vs_limp +10 -> 88; bb_fold_vs_open +21 -> 388; bb_3bet_vs_open +21 -> 388; three_bet +56 -> 1016; fold_to_3bet +4 -> 115; four_bet_vs_3bet +4 -> 115; cbet_flop +7 -> 244; barrel_turn +2 -> 56; fold_to_cbet +14 -> 341; raise_vs_cbet +14 -> 341; fold_to_bet_flop +26 -> 536; fold_to_bet_turn +13 -> 245; fold_to_bet_river +6 -> 130; check_raise +19 -> 469; wtsd +46 -> 1185; wsd +10 -> 251; showdown_weak_hands +6 -> 243; all_in_hands +98 -> 2072
    not updated, no opportunities in the import: barrel_river, river_aggression_weak_at_showdown
Stats not updated, with reasons:
  aggression_factor: not observable as a count from raw text (a ratio whose historical bet and call counts are not stored, so new actions cannot be added to it)
  sizing.open_raise_bb_median: not observable as a count from raw text (a median; raw historical open sizes are not stored, so it cannot be pooled)
  sizing.three_bet_bb_median: not observable as a count from raw text (a median; raw historical 3-bet sizes are not stored, so it cannot be pooled)
  sizing.bet_pct_pot_median: not observable as a count from raw text (a median; raw historical bet sizes are not stored, so it cannot be pooled)
  Rob: all stats, player did not appear in the import
AC6 bundled JSON: all 31 files in dist/data byte-identical after the imports.
PASS import: parser parity with the Python audit; duplicate protection (bundled range, earlier imports); additive counts for tracked players only; seed answers frozen and seed evidence refreshed; candidate schema and grading rule; review mode unscored; persistence on reload with bundled JSON untouched; backup round trip; removal.
```

Browser pass (headless Chrome): the same session with fresh hand IDs plus the original file imported through the panel. Result: 150 parsed, 150 duplicates from the original file, 67 spots (25 graded, 42 review); review and graded spots played in Villain Study; after reload 67 spots and updated counts still applied; "Remove import" returned Ben to 1,895 hands and 0 imported spots. No page errors.

Test suite after Part 3: `v25-test.cjs` and `import-test.cjs` pass; the same 12 older tests pass and the same 4 fail as on v24 (three need a git checkout, `fourmax-test` fails on untouched v24).

### Acceptance criteria 6 and 7, report item 4

All assertions below are in `import-test.cjs` section 10 and pass. The fixture is `data-imports/80loss_11-5.txt`.

One condition to know: the fixture's own hand IDs (250000002287 to 250000002436) are already counted in the bundled profiles, so importing the file unchanged is correctly rejected as 150 duplicates. To exercise a real import, the test shifts every hand ID by +10000 and changes nothing else.

| Item | Result | Evidence |
|---|---|---|
| AC6: known hand gives the expected candidate fields | PASS | Hand #250000002299, expected values worked out by hand from the raw text: Tiger on the button, Ben in the small blind, $24.50 in the pot and $10.50 to call at a $0.50 big blind. Asserted exactly: heroPos BTN, villainPos SB, potBb 49, toCallBb 21, options fold/call/raise, whatTigerDid call, source psHandId 250000012299 (the shifted ID), plus hero hand, board, effective stack 145bb and the full history lines. |
| AC6: listed countable stats updated by the expected amounts | PASS | Expected amounts are the independent Python audit (`session-2026-11-05-audit.json`). All 26 counters for Ben, Alex, Tiger and Ruining (104 in total, including vpip, pfr, rfi, fold_to_3bet, cbet_flop, fold_to_cbet) moved by exactly the audit's opportunities and outcomes. |
| AC6: second import of the same file skipped as duplicates | PASS | 150 of 150 skipped, 0 parsed, profile counts and stored spots identical before and after. |
| AC6: every bundled JSON file byte-identical | PASS | All 31 files in `dist/data` compared byte for byte before and after the imports. |
| AC7: candidate matching no template is review-only and unscored | PASS | `ben-flop-imported-1` is in the Villain Study pool with status review and no exploit block. Answered through the real handler: score null, no progress row (no XP), mistake queue unchanged, one villain-progress row marked review. |
| AC7: candidate whose driver stats are under n of 100 is review-only and unscored | PASS | `ruining-river-vs-value-heavy-bettor-imported-1` (weak hands in shown-down river bets, n=50). Same result when answered. |
| Report item 4: import report for the fixture, including stats not updated and reasons | Included | The "IMPORT REPORT" block in the fixture output above: per-player updates for every stat, per-player stats with no opportunities, the four stats that are not countable with reasons, and Rob as absent. |

Related behavior beyond the two AC7 cases: a candidate that fits a template shape and has n of at least 100, but whose villain does not show the template's tendency, is also review-only (thresholds kept as built, confirmed 2026-11-11).
