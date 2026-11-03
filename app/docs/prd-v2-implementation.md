# PRD v2 implementation and validation

Implemented in the PRD's phase order: table-size isolation; shared spot engine; notebook; Villain Study.

## Supplied sources

`dist/data/opponent_profiles.json` and `dist/data/villain_spots_seed.json` are byte-for-byte copies of the supplied JSON files. Existing 25 range JSON files and study notes are unchanged. The supplied alias map was inspected; the PokerStars logs and seed already use canonical player names. No private player IDs or alias lists are bundled.

The 22 real seeds were checked against the attached 13 PokerStars history files: hand ID, hero hole cards, and board cards match. Raw session logs are not bundled. The spot shows the supplied action history, pot, call size, actual effective stack, source file, and PokerStars hand ID. Historical stacks are displayed as logged; baseline imports remain restricted to 100bb/no rake.

## Data constraints

47 seeds: Ben 12, Alex 12, Ruining 14, Rob 9. All have tableSize 4 and baseline null. Current effective pool: 34 graded, 9 lean, 4 hidden. The four hidden-driver spots are withheld even though their top-level seed status says lean. This follows the PRD's under-30 guard and leaves Alex with 8 servable spots rather than its contradictory at-least-9 acceptance target. The full original 47 records are retained unchanged.

No solver answers or ranges were fabricated. Six-handed published seed charts are retained as before. Four-handed charts never reuse them. Import JSON can add distinct 4/6-handed ranges with a validation report; exact-spot baseline imports are attached only by spot ID and table size. Data files can be replaced with new profiles/spots without a code change.

## Grading ambiguity

Feature C defines exploit-over-baseline as intentional deviation; Feature D also exempts baseline-over-exploit in Both mode. Both directions are recorded as intentional_deviation with an explicit direction. Neither enters Mistake Review or the overall score in Both mode. Independent baseline/exploit accuracy remains available. Without baseline data, Both grades the exploit only and displays the required unavailable message.

Driver sample sizes are derived from all driving stats: under 30 hidden, 30–99 unscored lean, 100+ graded. Supplied exploit acceptable lists, not free-form template inference, determine answers. Legacy six-handed grading remains unchanged. Imported baseline frequencies accept actions at or above 10% as specified by the PRD.

## Persistence

Legacy progress/settings/daily/mistake keys are retained. New answers receive table size/source metadata. Legacy rows without a table-size field are read as six-handed without rewriting history. Four-handed daily entries have a separate date key. Additive storage keys: importedRanges, villainProgress, villainRecent, and spotBaselines, all under gtoTrainer.*.v1. Progress backups include the separate unscored villain log; solver imports remain separate original files.

The picker persists its 20 most recent IDs across visits and filters. Small filtered pools can exhaust; the app ends the session and asks for broader filters instead of silently repeating. Explicit review retries intentionally revisit the requested item.

## Validation

- `node prd-test.cjs`: table isolation, import validation, legacy preservation, all five notebooks, filters, sample guards, grading and two-correct retirement.
- `node spots-test.cjs`: all 47 schemas/profile references, sample statuses, grading, baseline null, Both mode and 200 draws with no repeat within 20.
- Existing core, character, equity, rotation and offline suites pass.
- Browser: four-handed no-data charts, Ben-only drill, exploit feedback and notebook links, two-correct review retirement, lean feedback, and phone layout (375px, no page overflow).
