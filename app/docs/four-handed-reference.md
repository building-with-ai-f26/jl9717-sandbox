# Four-handed published reference

Source: PokerCoaching, **4-Max Implementable GTO Charts**.

- Publisher listing: https://pokercoaching.com/tools_old/downloadable-preflop-charts/
- Public source PDF: https://poker-coaching.s3.amazonaws.com/tools/preflop-charts/4-max-cash-game-ranges.pdf
- Retrieved: 2026-11-03. Source hash is recorded in `dist/data/four-handed-reference.json`.
- 100bb cash, no ante; 5% rake capped at 1.5bb. Open 2.5bb (SB 3bb), 3-bet 8.5bb IP / 10bb OOP; 4-bet 23bb; 5-bet all-in. Blind-specific sizes are preserved in source metadata.

The source simplifies mixed GTO strategies into pure actions. Published hand actions were extracted from the cell colors into native app grids. No original artwork or PDF is redistributed. There are 20 charts / 3,380 cells covering RFI, facing opens, facing 3-bets, cold 4-bets, and limp defense. The extraction script is `scripts/extract-fourmax.py`; provide a locally downloaded source PDF as its argument. It independently asserts every chart's combination totals against the source legend. `fourmax-test.cjs` checks the runtime representation and wording.

The raked reference is available under 4-handed Charts and stays outside `datasets`, `importedRanges`, and drill selection. It cannot grade baseline or villain answers. Imported no-rake solver grids remain a separate chart-library choice. Existing six-handed ranges, targets, grading and equity scenarios are unchanged.

For node-conditional charts, white cells mean outside the source's prior-action range, not fold. Eligible action totals are shown both as a share of all 1,326 initial combinations and of the source node's denominator. No extra solver frequencies were inferred.

Source inconsistency retained: SB RFI shows 504 limp combinations, while SB limp vs BB raise contains 500. A visible note explains this; no cells were altered to reconcile it.
