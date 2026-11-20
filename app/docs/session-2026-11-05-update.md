# November 5, 2026 game import

Source: `80loss_11-5.txt` (150 unique PokerStars-format hands converted from PokerNow). Historical IDs 250000000001–250000002286 were verified against the supplied hand ID map. New IDs are 250000002287–250000002436, with no overlap. The combined dataset contains **2,436 hands across 14 sessions**.

| Player | Hands added | Total profile hands | Latest VPIP | Latest PFR | Latest 3-bet |
|---|---:|---:|---:|---:|---:|
| Ben | 150 | 1,895 | 91 / 150 = 60.7% | 73 / 150 = 48.7% | 16 / 48 = 33.3% |
| Tiger | 149 | 2,110 | 74 / 149 = 49.7% | 25 / 149 = 16.8% | 4 / 70 = 5.7% |
| Alex (K Bon) | 149 | 1,388 | 98 / 149 = 65.8% | 41 / 149 = 27.5% | 3 / 74 = 4.1% |
| Ruining (Crawfish) | 98 | 1,974 | 48 / 98 = 49.0% | 17 / 98 = 17.3% | 8 / 56 = 14.3% |

User-confirmed aliases (Nov 9, 2026): **K Bon → Alex; Crawfish → Ruining**. The importer records these mappings and adds the session counters to the existing canonical profiles. Duplicate profiles are removed. All four participating players’ study notes and existing drill evidence use refreshed statistics; Rob remains unchanged. Seeded preferred and acceptable actions remain fixed.

## Aggregation and limits

- Historical numerators and opportunity denominators are added directly to the new session's counters, then percentages are recalculated. No percentages are averaged.
- Ben's cumulative 3-bet rate is now **197 / 761 = 25.9%**, previously 181 / 713 = 25.4%. His fold-to-3-bet rate is **9 / 112 = 8.0%**, previously 8 / 104 = 7.7%.
- Historical raw bet sizes and aggression counts are unavailable in the supplied profile summaries. Historical medians, aggression ratios and average table sizes are retained and labeled as historical. The latest session has its own exact counters and sizing medians; the app does not fabricate pooled medians or a pooled ratio from rounded summaries.
- Combined bluff benchmarks use the old rounded mean multiplied by its old count, plus the new exact per-bet benchmark sum. They are explicitly marked approximate (`~`). The raw latest-session measurements are retained separately.
- The session contains 97 four-handed hands, 52 three-handed hands and one heads-up hand. Header `10-max` labels are not treated as actual occupancy. One hand has no small-blind post: it is parsed as recorded, without inventing a blind or an absent player.
- Known showdown hands are classified from their cards and board. Mucked hands without known cards are excluded from weak-hand composition counts, while still counting as observed showdowns.

## Reproducibility and validation

`python scripts/import-hand-history.py` rebuilds from the immutable historical snapshots and the new source log. Rerunning it cannot double-count this session. Raw logs and snapshots are outside `dist/`, so they are not part of the public website assets.

`python scripts/test-hand-history-import.py` checks unique IDs, duplicate rejection, all 150 pot reconciliations, a manually checked first hand, the missing-small-blind hand, showdown categories, exact count addition, byte-identical reruns, and preservation of every seeded preferred/acceptable action. All recorded pots and collections reconcile to the cent, with zero rake. The imported session balances to zero across players.

The grading engine, hand selection rules, seeded cards/options/answers, no-rake baseline ranges, and localStorage keys/formats are unchanged. Existing progress loading and drill/regression tests pass. Only descriptive statistics, their evidence text, source notes, and the latest-session profile presentation change.
