# Landing redesign, 2026-11-04

Presentation-only redesign with the three user-approved adjustments: 11 modes, existing Villain Study picker and acceptable-action grading, and device sans typography.

The exact requested headline, description and factual eyebrow are used. The stats strip says 11 modes. Mode labels retain their existing order/IDs; their landing descriptions are factual. Start drilling and Keep drilling focus the mode list. Footer uses the requested home-game wording and existing links. The tiger SVG definition is unchanged, beside the wordmark.

The demo uses real bundled villain spots and SpotEngine.grade in exploit mode. It never calls record, recordVillain, write(progress), or write(mistakes). Its hand rotation uses the existing villainPicker and persists only its existing recent-ID key; there is no new storage key. The real-only subset contains 20 servable hands. At exhaustion the picker advances through its full existing pool once before selecting a real hand, respecting its existing recent-ID window. Demo answers themselves do not write any storage.

Existing villainFeedback and card components are reused. The visible table uses the existing felt styling; the hero background matches the felt fill #1d2b21. The dot pattern is disabled only on the landing surface. Pixel typography is confined to branding, factual labels and numbers; the headline, descriptions, buttons and mode titles use device sans.

No runtime requests/assets were added: changes are bundled in app.js and arcade.css; index.html and the service-worker asset list are unchanged. Cache version is bumped for delivery. Drill data and engines are unchanged.

Checks: landing-test.cjs covers exact copy, all 11 links, source stats and sample sizes, every servable real-hand/action grading result, and byte-identical storage before/after demo answers. Existing core, character, equity, pool, source, PRD, and offline checks pass. Baseline evaluate/preSpot/record/quizSpot function text is byte-identical to the pre-change build. Browser verified live demo feedback, Keep drilling, desktop and mobile positioning and no horizontal overflow.
