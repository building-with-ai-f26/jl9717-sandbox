# v33 — Rebuild explanation and TODAY alignment

Implemented recommended Option B only. Rebuild eligibility, generation, completion behavior, storage and toast remain unchanged.

- PASS: exact tooltip text attached with aria-describedby on landing and plan panel rebuild controls. Keyboard focus visibility verified in browser; Enter rebuilds and preserves the existing toast.
- PASS: first touch suppresses rebuild and reveals explanation; second touch delegates to existing handler. Automated event-path check; physical touch-device testing unavailable.
- PASS: desktop TODAY cards measured 414.66px wide and 165.125px tall, with matching top edge. Rebuild occupies a separate grid row below cards.
- PASS: existing 900px stacking breakpoint retained, columns reset to full width; CSS reviewed. Mobile viewport testing unavailable in browser surface.
- PASS: v25 lifecycle suite covers rebuild/start/resume/completion, plan selection, progress/history and storage. Analytics, v23 grading/presentation, Build4 and offline suites pass.
- PASS: no data, grading, PostHog or storage schema changes; service worker cache advanced to v33.
