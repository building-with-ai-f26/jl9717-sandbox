# Tiger’s GTO Trainer

Buildless static app; serve `dist/` over HTTP. No runtime dependencies or external requests. Service worker caches all runtime files after first load. Progress, mistakes, settings, and daily history retain their existing browser-storage keys and formats. The shared Count the Outs / Estimate Equity shuffle bag uses the additive `gtoTrainer.equityRotation.v1` key and survives session changes and reloads. Export/import backs up progress and mistakes.

## Data provenance

25 separate range JSON files. RFI grids encode the Appendix A seed lists and adjust borderline suited K/Q hands within the specified tolerance. Constructed response distributions are explicitly heuristic; matching aggregate totals does not establish solver validity. BTN vs CO preserves named action frequencies; 85% is the stated heuristic choice within the 77–99% suited ace interval. Facing-a-3-bet targets are conditional on opened combinations.

36 curated postflop examples. Facing-a-bet examples expose stipulated training equity and compute call thresholds exactly. No equity or range solver is included. All 24 A5 study-note bullets are encoded unchanged in `data/learn.json`.

`generate.py` regenerates JSON from the retained spec in `docs/build-spec.md` (requires Python SciPy for constrained frequency allocation). Runtime has no Python or build dependency.

## Validation

`node test.cjs` validates grid sizes, combination-weighted totals, normalized frequencies, 200 unique deals and the 50/30/20 distribution, mixed-action scoring, sizing notes, unique cards, stipulated-equity pot-odds verdicts, review retirement, four-handed filtering, and quiz option integrity.

Browser QA completed a ten-hand session at 360×640. Decision buttons measured 56px tall, within the viewport, with no horizontal overflow. Offline cache is provided by `sw.js`; state does not sync between browsers or devices.

Equity Lab pool: `node pool-test.cjs` checks all 16 computed scenarios and 1,600 constrained shuffle-bag draws, including cross-drill selection and reload persistence. The computed card-by-card audit is in `docs/equity-scenario-pool-audit.md`.
