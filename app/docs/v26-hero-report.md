# v26 hero whitespace patch

Train landing only: accessible collapsed demo explanation, vertically distributed hero introduction, TODAY quick links using existing plan/daily/mistake state, and 24px desktop / 16px mobile section gap. Offline cache advanced to v26 so returning visitors receive the patch. No data, grading, analytics, or storage schema changes.

## Verification

- Desktop browser at 1363×936: Start drilling to TODAY 44.84px; largest measured empty gap 49.55px; equal demo/intro heights; no horizontal overflow. Exact 1440×900 viewport was not available in the browser API.
- Accordion: Enter opens, Space closes, aria-expanded updates, detail remains in its associated region. Expanded content pushes the layout naturally; no absolute positioning.
- Every servable real demo hand/action checked against the existing grader; original feedback markup retained byte-for-byte inside the new wrapper. No progress mutations.
- TODAY links match displayed plan length, daily completion and size-filtered mistake queue; Mistake Review link focuses its matching card. Smooth scrolling honors reduced motion.
- Mobile layout reviewed in CSS: existing 650px stack retained, wrapping links, 16px TODAY gap, hidden region by default. Exact 390×844 browser measurement remains unverified.
- Baseline suite: 16 pass / 1 fail. After patch: same 16 pass / 1 fail. Existing fourmax-test.cjs fails reading session.feedback.score after a keyboard fixture. The PRD's 12 pass / 4 fail baseline does not match the supplied current source.
- Added v26-hero-test.cjs passes. Offline cache test passes for all 49 assets; analytics tests pass. All range/profile/Learn/scenario JSON and index.html unchanged.
