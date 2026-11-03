# Tiger’s GTO Trainer — source v13

This is the source for the deployed version, commit 6ef10273ca07d2282eb21f565b4af47ba76f8a7f.

## Run locally

The app is plain HTML, CSS, and JavaScript. No npm install or build is required.
From this folder run:

    python3 -m http.server 8000 --directory dist

Then open http://localhost:8000 in your browser. Serve over HTTP rather than double-clicking index.html, because the app fetches local JSON data.

## Main files

- dist/index.html: app entry point
- dist/app.js: main modes, range grids, grading, and navigation
- dist/style.css and dist/arcade.css: layout and 8-bit styling
- dist/equity.js and dist/equity-ui.js: Equity Lab calculations and interface
- dist/spots.js: data-driven spot engine
- dist/notebook.js: opponent notebook
- dist/villain-ui.js: Villain Study, grading, and review
- dist/four-handed-charts.js: four-handed reference charts
- dist/data/: range data, study notes, opponent profiles, and villain spots
- docs/: provenance, implementation notes, and scenario audits
- *-test.cjs and test.cjs: Node-based checks

## Verify

Run node test.cjs, node equity-test.cjs, node spots-test.cjs, node prd-test.cjs,
node fourmax-test.cjs, node pool-test.cjs, node character-test.cjs, and node offline-test.cjs.

## Deploy elsewhere

Upload the contents of dist/ to any static host. The .openai/hosting.json file belongs to the original Sites deployment and is not required by other hosts.

Progress and imported solver data live in each browser; use the app’s export to transfer progress. This archive contains the shipped app data, not your browser’s saved progress or imported ranges.

The four-handed published charts are simplified raked references, not no-rake drill baselines. See docs/four-handed-reference.md. Existing six-handed grids include labeled heuristic constructions. Preserve source attribution and bundled font license notices.
