# GTO Trainer: Build Spec (paste-ready)

Give this entire document to GPT or Claude as the build instruction. Build exactly what is specified. Where a number is given, use that number. Where a dataset is specified, encode the dataset as given in Appendix A and tag every answer key with its source from Appendix B. Do not scrape solver sites. Do not invent solver outputs: any answer that is not backed by Appendix A data or by the math in Section 6 must be labeled "heuristic" wherever it appears.

## 1. Product

A mobile-first web app that trains No-Limit Hold'em decisions in two layers:

- **Layer 1, Preflop Trainer.** The user is dealt a scenario: their position, the action before them, and two hole cards. They choose Fold, Call, or Raise, and when raising, a size. The app judges the decision and the sizing against data-backed GTO preflop charts (Section 5), shows the solver frequency for each action, and shows the full 13x13 range grid with their hand highlighted.
- **Layer 2, Postflop Trainer.** The user is shown a board, the action line so far, their hand, their position, the pot, and the bet they face (or the option to bet). They choose Fold, Call, Raise, Check, or Bet with a size. The app judges using two engines: exact poker math (pot odds, minimum defense frequency) and a curated set of solver-informed spot packs (Section 6).

The user is a serious GTO student. The app must feel like a coach, not a quiz: every answer explains itself in one plain sentence, and mistakes are collected and re-drilled later.

**Scope (hard limits): cash games only, 6-handed and 4-handed only, 100bb stacks, no rake.** No tournament content anywhere in the app: no MTT or SNG datasets, no ICM, no antes, no push/fold charts, no 9-handed tables. The Methodology page states this scope up front (Section 10).

## 2. User-friendliness requirements (hard requirements, not suggestions)

1. One decision per screen. Nothing else competes with the current decision: no sidebars, no ads, no news, no popups.
2. The decision buttons are large (minimum 56px tall), always in the same place at the bottom of the screen, in this order: Fold, Call or Check, Raise or Bet. On a phone they must be reachable by thumb without scrolling.
3. Feedback is instant and appears in place, without a page change: correct or not, the frequency bar (Section 7), one sentence of explanation, and two buttons: "Next hand" (primary) and "See the range" (secondary).
4. A session is 10 hands by default and can be started in two taps from the home screen: tap a mode, tap Start. No setup forms before the first hand.
5. Plain language everywhere. The first time a term appears in a session (3-bet, MDF, RFI, polarized), tapping it or a small "?" shows a one-sentence definition. A glossary page collects all definitions.
6. Cards are rendered as large visual cards with suit symbols and a four-color deck (spades black, hearts red, diamonds blue, clubs green). Never render hands as bare text like "AhKd" in the decision area.
7. The table is shown as a simple visual: an oval with seat labels, the hero seat highlighted, folded seats dimmed, the pot in the middle, and each player's preflop action written under their seat (for example "CO raised to 2.5bb").
8. Dark theme by default, high contrast, no pure-white backgrounds. One accent color. No gradients on decision elements.
9. Progress is always visible: a slim progress bar during a session (hand 3 of 10), and on the home screen, accuracy by mode for the last 7 days.
10. The app must work fully offline after first load and must remember everything between visits (Section 9). No account, no sign-in, no tracking, no analytics.
11. Desktop keyboard shortcuts: F = fold, C = call or check, R = raise or bet, Enter = next hand, 1 to 4 = sizing options when raising.
12. Every screen must be usable at 360px width without horizontal scrolling.

## 3. Modes (home screen, in this order)

1. **Quick Drill.** 10 mixed preflop hands across all positions and spot types.
2. **Preflop by Position.** Pick a seat (LJ, HJ, CO, BTN, SB, BB defense) and drill only that seat's RFI or defense decisions.
3. **Preflop by Spot.** Pick one: Raise First In; Facing an Open (call / 3-bet / fold); Facing a 3-Bet (fold / call / 4-bet).
4. **Postflop Trainer.** Pick a pack (Section 6): Facing a Bet (MDF and pot-odds defense); C-Bet or Check; River Decisions.
5. **Mistake Review.** The spaced-repetition queue of previously missed spots (Section 8).
6. **Charts.** Every dataset in Appendix A as a viewable 13x13 grid, with its source label and the simplification note.
7. **Daily Hand.** One fixed preflop plus one fixed postflop spot per calendar day, same for every visit that day (seeded by date).
8. **Concept Quiz.** Quiz questions on the theory and math in the Learn tab (Section 13): definitions, formula calculations, and principle questions. Scored like the drills, and wrong answers enter the same Mistake Review queue.
9. **Learn.** The study tab: every concept, heuristic, and position principle from the content pack in Appendix A5, as short readable cards, grouped as Concepts, Math, Preflop Heuristics, Position Principles, and Personal Exploit Notes.

## 4. Scenario generation

- Scenarios are generated from the datasets, not written one by one. For each hand: pick the mode's spot type, pick hero's position and the preflop action line, then deal hero a hand from the relevant range grid.
- Deal distribution, per session: about 50% boundary hands (hands the chart plays at a mixed frequency, or the weakest hands in the range, or the strongest hands just outside it), about 30% clear hands (pure actions), about 20% trap hands (hands that look strong but fold, for example weak offsuit broadways facing an early open; or look weak but continue, for example suited wheel aces as 3-bet bluffs).
- Never deal the same hand in the same spot twice in one session.
- Postflop spots come from the curated packs in Section 6, dealt in random order, with hole cards and bet sizes varied within the pack's stated ranges.

## 5. Preflop datasets (encode Appendix A exactly)

Game baseline for all datasets: No-Limit Hold'em cash, 100bb effective stacks, no rake, 6-handed (with the 4-handed mapping in D4). RFI size 2.5bb from every seat except the small blind, which opens to 3bb raise-or-fold. Rake note: the app models a no-rake game; the published charts cited in Appendix B are the answer key as published, and the Methodology page must state that in a no-rake game optimal ranges run at least as wide as any raked-game chart, so the published charts are a conservative baseline. The Charts page must state the baseline in one line.

- **D1, RFI grids.** One 13x13 grid per seat (LJ, HJ, CO, BTN, SB). Each cell: Raise or Fold (the seed data is simplified to pure actions; see Section 7 for how mixed frequencies are handled in judging). Grid totals must match the target open percentages in Appendix A within 1 percentage point. If a hand list and a target percentage conflict, adjust the borderline suited hands (weakest suited kings and queens first) until the total fits, and note the adjustment in the data file's comment field.
- **D2, Facing an Open grids.** For each matchup that Appendix A covers with named hands (at minimum BTN vs CO, plus the aggregate frequency table for the other matchups), a grid with 3-Bet, Call, and Fold per cell, plus the matchup's target 3-bet and call percentages. For matchups where Appendix A gives only aggregate percentages, generate the grid by the construction rule in Appendix A and label that grid "constructed from published frequencies" in the Charts page.
- **D3, Facing a 3-Bet.** Per opener position: target fold, call, and 4-bet percentages from Appendix A, with the value 4-bet core (QQ+, AK) and the standard bluff 4-bet candidates (suited wheel aces) named; grids constructed by the same rule as D2 and labeled the same way.
- Every grid lives in its own JSON file (one file per dataset per spot), with fields: game, stack, spot, hero position, villain position where relevant, cells (hand, action, frequency), source tag, and notes. Frequencies are stored even when the displayed action is pure, because judging uses them (Section 7).
- **D4, 4-handed cash mapping (settings option, no new grids).** The user's home game is 4-handed cash with no rake. In 4-handed mode the seats are CO, BTN, SB, BB (the first player to act has three players behind, the cutoff situation). Reuse the D1 to D3 grids by seat function: first seat uses the CO grids, then BTN, SB, BB defense as normal. Label the mode "4-handed (CO-equivalent first seat)" in settings and on the session screen. No rake means no range adjustments; state that in the mode's one-line description.

## 6. Postflop content and judging

Postflop judging uses two engines. The UI must always show which engine produced the verdict.

**Engine 1, exact math (no solver claims).** For any "facing a bet" decision, compute and display:
- Pot odds: the equity needed to call = bet / (pot + bet + call amount), shown as a percentage.
- MDF (minimum defense frequency) = pot / (pot + bet), using this verified table: facing 25% pot, defend 80%; 33% pot, 75%; 50% pot, 67%; 67% pot, 60%; 75% pot, 57%; 100% pot, 50%; 150% pot, 40%; 200% pot, 33%.
- Alpha (how often a bluff must succeed) = 1 minus MDF, shown when hero is the bettor in the C-Bet pack.

**Engine 2, curated spot packs (solver-informed heuristics, labeled "heuristic" in the UI).** Build these packs from the rules below. Each pack has at least 12 spots. Each spot states: hero hand, board, position (in or out of position), action line, pot, bet faced or bet options, the correct action, and a one-sentence reason that cites the rule used.

- **Pack P1, Facing a Bet.** Spots vary board texture and bet size. Rules: continue with pairs and draws whose equity clears the pot-odds threshold; bluff-catch on the river with hands that beat bluffs and block value, fold hands that block bluffs; defend at or above MDF on the flop and turn when hero's range is uncapped, defend less out of position against large sizes (state this as the pack's rule, not as solver output).
- **Pack P2, C-Bet or Check.** Board texture classes, with the standard solver-informed defaults: dry high boards (for example A72 rainbow) favor small bets (25 to 33% pot) at high frequency; wet connected boards (for example JT9 two-tone) favor checking more and betting larger (66 to 75% pot) with a polarized range; low boards that favor the caller's range (for example 654) favor checking as the preflop raiser. Each spot's reason names the texture class and the range-advantage logic in one sentence.
- **Pack P3, River Decisions.** Bluff-catching and value-bet-or-check spots. Rules: call with bluff-catchers that block villain's value combinations and unblock missed draws; fold the reverse; bet for value when hero beats the part of villain's range that calls, check when hero only beats bluffs. Include the blocker effect in the reason sentence.

Postflop sizing choices, when offered: 33%, 66%, 100%, and 150% of pot, plus All-in where the pack specifies. Judging a size correct means it matches the pack's stated size class (small, large, overbet), not an exact number.

## 7. Judging and feedback

Solver preflop play is mixed: many hands take two actions at different frequencies. Judge with frequency-weighted scoring, never as if only one action exists:

- Hero picks the action the chart plays most often (frequency 50% or more): **Correct**, full point.
- Hero picks an action the chart plays at 25 to 49%: **Acceptable mix**, half a point, feedback says the chart prefers the other action and shows both frequencies.
- Hero picks an action the chart plays below 25%, or Fold with a hand the chart never folds: **Mistake**, no point, and the spot enters the Mistake Review queue.
- Sizing: opening to 2.2 to 3bb when the chart opens 2.5bb (3 to 3.5bb from the small blind) is correct. Any other open size is a sizing note, shown separately from the decision verdict ("Right decision, off size: the chart opens 2.5bb here").
- Grades per answer: Perfect (correct action and size), Fine (acceptable mix, or correct action with a sizing note), Leak (mistake with a close alternative), Blunder (mistake with no chart support). Show the grade word with the verdict.

Feedback panel contents, in this order: verdict and grade; a horizontal frequency bar showing the chart's action frequencies for this exact hand with hero's pick marked; one sentence of explanation (template: what the chart does and the positional reason, for example "The button opens this hand: only the blinds are behind you and you act last on every street"); the hand's place in the grid ("See the range" opens the grid with the hand highlighted); Next hand button.

## 8. Mistake Review (spaced repetition)

- Every Mistake (Section 7) saves the full spot (dataset, position, hand, action line, hero's wrong pick, correct answer) into a review queue stored locally.
- A missed spot resurfaces: later the same day if a session is still running, then after 1 day, then after 3 days, then after 7 days. Answering it correctly twice in a row at review removes it from the queue.
- The home screen shows the number of spots due for review today. Mistake Review mode deals only due spots.
- The Progress page lists accuracy by position and by spot type, the user's five worst categories by accuracy (minimum 20 attempts), and total hands trained. This is the leak view; label it "Your biggest leaks".

## 9. Data storage

- All state in browser localStorage under these exact keys: `gtoTrainer.progress.v1`, `gtoTrainer.mistakes.v1`, `gtoTrainer.settings.v1`, `gtoTrainer.daily.v1`. Do not rename these keys in later versions; progress must survive updates.
- Settings: table size (6-handed or 4-handed, per D4), four-color deck on or off, session length (10, 20, or endless), sound off by default. There is no format or dataset setting: the app is always cash, 100bb, no rake.
- Progress page includes Export and Import buttons that download and reload the progress and mistakes data as one JSON file.

## 10. Screens

1. **Home.** Mode list (Section 3), review-due count, last-7-days accuracy strip.
2. **Session.** Table visual, hero cards, action line, decision buttons, feedback panel, progress bar, quit button that saves partial progress.
3. **Charts.** Dataset picker (spot, then positions), 13x13 grid, source label and baseline note under each grid.
4. **Progress.** Accuracy by position and spot type, biggest leaks, totals, export and import.
5. **Methodology.** One page, plain language, opening with a "What this app covers" section that states the scope in plain terms: "This app trains cash game poker only: 6-handed and 4-handed No-Limit Hold'em, 100bb stacks, no rake. It has no tournament content: no ICM, no antes, no short-stack push/fold charts, because the games it prepares you for are full-stack cash games." Then: what data the answers come from (Appendix B sources), the baseline assumptions (100bb, 2.5bb opens, 3bb from the small blind), the no-rake note from Section 5 (in a no-rake game optimal ranges run at least as wide as any raked-game chart, so the published charts are a conservative baseline), the simplification policy (published charts simplified to pure actions with stored frequencies; judging is frequency-weighted), which postflop content is exact math and which is labeled heuristic, a line stating that the Learn and Concept Quiz content comes from the user's own study notes and is not solver output, and the line "This app trains baseline GTO decisions. It is a study tool, not a solver."
6. **Glossary.** One-sentence definitions: GTO, RFI, 3-bet, 4-bet, polarized, linear or merged range, blocker, pot odds, MDF, alpha, c-bet, range advantage, SPR, equity realization.
7. **Learn.** The study tab from Section 13: a group list, then card lists per group, then the single-card reading view with previous and next card navigation and a "Quiz me on this" button that starts a Concept Quiz session filtered to that card's group.

## 11. Technical requirements

- A single static web app: HTML, CSS, and JavaScript with the datasets as separate JSON files loaded at runtime. No backend, no database, no build step required to run it, no external fonts or trackers. Works from a plain static host and offline after first load.
- The 13x13 grid is one reusable component used by Charts, feedback ("See the range"), and dataset validation.
- Include a built-in data self-check that runs on the Charts page load: recompute each grid's action percentages and display them next to the Appendix A targets; flag any grid off by more than 1 percentage point.
- Performance: a new hand must render in under 300ms on a mid-range phone. No animation longer than 200ms. No layout shift when feedback appears (reserve the feedback panel's space).

## 12. Acceptance criteria (all must hold)

1. RFI grids for LJ, HJ, CO, BTN, SB total within 1 percentage point of the Appendix A targets (17.6, 22.3, 29.1, 43.6, 43.5 percent).
2. Dealing 200 Quick Drill hands produces no repeated hand in the same spot within a session, and roughly half the dealt hands are boundary hands per Section 4.
3. Choosing the chart's majority action scores Correct; choosing a 25 to 49% action scores Acceptable mix; both cases show the frequency bar with both frequencies labeled.
4. Opening to 2.5bb scores a correct size; opening to 5bb produces the sizing note and does not change a Correct verdict to Mistake.
5. A Mistake in any mode appears in Mistake Review the same day, and after two consecutive correct review answers it leaves the queue.
6. Every MDF and pot-odds figure shown anywhere in the app matches the formulas and table in Section 6 exactly.
7. Every chart and every postflop pack displays its source label or its "heuristic" label; the Methodology page lists every source in Appendix B.
8. Progress, mistakes, and settings persist across a browser restart under the Section 9 keys, and export then import restores them exactly.
9. At 360px width, a full session can be completed with no horizontal scrolling and no scrolling to reach the decision buttons.
10. The data self-check (Section 11) passes for every shipped grid.
11. The Learn tab contains every card listed in Appendix A5, grouped as specified, and the Personal Exploit Notes group shows the Ben card with its "personal notes, not GTO" label.
12. Every Concept Quiz math answer matches the formulas in Appendix A5 exactly (spot-check: quarter-pot bet gives pot odds 17%, alpha 20%, MDF 80%; half-pot bet gives pot odds 25%, alpha 33%, MDF 67%).
13. In 4-handed mode, the first seat is dealt CO-grid scenarios and the session screen labels the mode as specified in D4.
14. The app contains no tournament content: no MTT or SNG dataset, no ICM material, no antes, no 9-handed tables, and no format selector anywhere in settings or modes.

## 13. Study content: the Learn tab and Concept Quiz

Source: the user's own GTO study notes (Google Doc, "Learn GTO General Principles in each position in 4 handed cash game w/ no rake"; full citation in Appendix B). Encode the content in Appendix A5 faithfully. These are the user's personal study notes, not solver output: the Learn tab and Methodology page must label them "Tiger's study notes" and must never present them as solver data. Where a note states a number (for example the UTG vs 3-bet response frequencies), quiz and display that number as written.

**Learn tab.** One card per item in Appendix A5. Card format: title, the definition or rule in the note's own terms (lightly copy-edited only for typos), and the note's worked example where one exists. Cards are readable in under a minute each. Groups, in order: Concepts (SPR, EQ, EV, ISO, bunching effect); Math (Rule of 2 and 4, pot normalization and pot odds, alpha, MDF, pot odds vs MDF convergence at the margin, fold equity discounting, implied odds vs equity realization); Preflop Heuristics (threshold hands and mixed strategies, over-folding when opening wide exploitatively, the limping rules, SB limp/raise structure, the passive-table exception); Position Principles (CO defense vs SB vs BB 3-bets, UTG vs 3-bet responses, BB cold 4-betting, the three 3-bet constructions against open raises); Personal Exploit Notes (the Ben card, labeled "Personal exploit notes, not GTO").

**Concept Quiz.** Three question types, generated from the same content pack:
- Definition questions: multiple choice, four options, one correct (for example "What does MDF measure?").
- Math questions: numeric or multiple choice, computed from the formulas, with randomized bet sizes (quarter, third, half, two-thirds, three-quarter, pot) and randomized equities and outs. The answer key is the formula result, and feedback shows the worked calculation in the note's format, including the convergence example and the fold-equity-discounting example from Appendix A5.
- Principle questions: scenario multiple choice built from the Position Principles (for example "UTG opens and the button 3-bets. Compared with facing a CO 3-bet, UTG should 4-bet: (a) more often (b) less often (c) the same", answer: less often, about 8% vs about 10 to 11%, because the button's range is wide and polarized so 4-betting folds out bluffs and runs into the value part).

Quiz feedback follows Section 7's format: verdict, the correct answer with a one-sentence reason, and a "Read the card" link that opens the matching Learn card. Quiz accuracy appears on the Progress page as its own category, and missed quiz questions enter Mistake Review with the same resurfacing schedule as missed spots.

## Appendix A: Seed data

**A1. RFI targets and hand lists, 6-max cash, 100bb, opens to 2.5bb (SB to 3bb, raise-or-fold).**
Targets (solver-published, Pokalab): LJ 17.6%, HJ 22.3%, CO 29.1%, BTN 43.6%, SB 43.5%.
Hand lists (PokerTube's published GTO charts; "s" suited, "o" offsuit, "+" means that hand and all stronger of the same type):

- LJ (UTG): 66+, A3s+, K8s+, Q9s+, J9s+, T9s, ATo+, KJo+, QJo
- HJ: 55+, A2s+, K6s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, ATo+, KTo+, QTo+
- CO: 33+, A2s+, K3s+, Q6s+, J8s+, T7s+, 97s+, 87s, 76s, A8o+, KTo+, QTo+, JTo
- BTN: 33+, A2s+, K2s+, Q3s+, J4s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, A4o+, K8o+, Q9o+, J9o+, T8o+, 98o
- SB (raise-or-fold subset for this app; the published chart includes calls, which this app excludes and must note on the Charts page): use the BTN list as the SB raise-or-fold seed and trim the weakest offsuit hands until the grid totals 43.5% plus or minus 1 point; note the trim in the data file.

**A2. Facing an open, aggregate frequencies, 6-max cash 100bb (solver-published summaries).**
- 3-bet frequency by matchup: about 6 to 7% against a LJ open; about 10% against a CO open; 13 to 17% against BTN and SB opens. The solver never 3-bets under 6% in any of these spots.
- 3-bet sizing: about 3x the open in position, about 4x out of position (some published trees use 2.5x in position and 3x out of position; the app uses 3x and 4x and states this on the Methodology page).
- Detailed matchup, BTN vs a 2.5bb CO open: 3-bet 12.5% of hands to 7.5bb, call 3.0%, fold the rest; 81% of the played range is a 3-bet (a mostly linear construction). Always 3-bet: AA, KK, QQ, AKs, AQs, AKo. Mostly 3-bet: AJo (95%), KJs (86%), KQo (84%), T9s (87%), 65s (85%), suited aces A8s to A3s (77 to 99%). The few calls: ATs (74% call), AJs (54% call), part of 99 to 77. Fold almost everything below, including 55 to 22 most of the time.
- Opener facing a 3-bet: folds 19 to 33% depending on seats, calls most of the rest, 4-bets 9 to 16%. Value 4-bet core: QQ+, AK. Bluff 4-bet candidates: suited wheel aces (A5s, A4s), which block AA and AK and have equity when called.
- Grid construction rule for matchups without named hands: fill value hands first (pairs and broadways by strength), then suited aces and suited connectors as 3-bet bluffs until the target 3-bet percentage is met; calls are the medium-strength suited and pair hands that play well postflop in position; everything else folds. Label these grids "constructed from published frequencies".

**A3. Removed.** (There is no tournament dataset. The app is cash-only per the Section 1 scope; this slot is intentionally empty so the remaining appendix numbering is unchanged.)

**A4. Postflop math table (exact, use verbatim).**
MDF = pot / (pot + bet). Facing 25% pot: defend 80%. 33%: 75%. 50%: 67%. 67%: 60%. 75%: 57%. 100%: 50%. 125%: 44%. 150%: 40%. 200%: 33%.
Pot odds (equity needed to call) = bet / (pot + bet + bet). Facing 33% pot: 20%. 50%: 25%. 67%: 29%. 75%: 30%. 100%: 33%. 150%: 38%. 200%: 40%.

**A5. Study content pack (from the user's GTO notes; encode faithfully).**

Concepts:
- SPR (stack-to-pot ratio): effective stack divided by pot size. Low SPR means shallower, simpler decisions; high SPR means deeper stacks and a more complex game tree.
- EQ (equity): your percentage share of the pot if the hand ran out to showdown many times; raw win probability, independent of future betting.
- EV (expected value): the average amount won or lost by an action over many repetitions; EV = (probability of winning x amount won) minus (probability of losing x amount lost). Worked example from the notes: calling a $50 bet into a $100 pot with 40% equity: EV = (0.40 x $150) minus (0.60 x $50) = $60 minus $30 = +$30, a profitable call.
- ISO (isolation raise): raising to isolate one opponent and reduce the field, mainly against limpers.
- Bunching effect: mass folding before you act skews the remaining players' ranges toward stronger hands, so push tighter than a standard calculator suggests. Strongest in late position at shallow stacks; near zero in early position. It flips with limps instead of folds: limpers hold capped, weak ranges, which depletes the deck of premiums in the blinds and lets you ISO wider from late position.

Math:
- Rule of 2 and 4: on the flop, outs x 4 approximates equity percent; on the turn, outs x 2.
- Pot normalization: normalize the pot to 1 and express the bet as a fraction b. Pot odds = b / (2b + 1). Example: a half-pot bet gives 3-to-1 odds, 25% pot odds; call if your equity exceeds it.
- Alpha: the minimum percentage of the time a bet must force a fold to be immediately profitable; alpha = b / (b + 1). Quarter-pot bluff: alpha = 20%. Alpha is primarily a bluffing metric because it only matters when you need folds to profit.
- MDF = 1 minus alpha: the minimum percentage of your range you must defend (call or raise) so the bet is not automatically profitable. Quarter-pot bet: MDF 80%. Half-pot bet: MDF 67%.
- Convergence at the margin: pot odds are hand-level (does this hand have enough equity to call), MDF is range-level (am I defending often enough to not be exploitable). They meet at the weakest hand in the defending range, which has equity about equal to the pot odds threshold and is exactly break-even against a GTO bettor. Worked example (quarter-pot bet): pot odds about 17%, alpha 20%, MDF 80%, and the bottom of the 80% defending range has about 17% equity and flat EV. Adjustment rule from the notes: if villain underbluffs, the bottom hands become losing calls, so fold more than MDF dictates; if villain overbluffs (for example on the river), defend more and call lighter.
- Fold equity discounting: when players behind you can raise, you may not see the next card, so required equity = pot odds percent divided by the probability you see the next street. Example: pot odds 20% with a 30% raise risk means you see the next street 70% of the time, so true required equity = 20% / 0.70 = 28.5%. Speculative hands (suited connectors, draws, small pairs) take the full penalty because they must fold to a raise; strong hands are less affected. When you close the action, raise risk is zero and pot odds are face value.
- Implied odds vs equity realization: drawing hands like 67s have low raw equity but high implied odds and want multiway pots and volume of opponents to get paid when they hit; made-hand holdings like TT have strong raw equity to protect and want fewer opponents, so ISO raise to reduce the field.

Preflop heuristics:
- Play a distribution of hands strong relative to the random hands yet to act; if a player has already entered the pot, your range must also be strong relative to that player's range (CO raising over an UTG limp is tighter than CO opening folded-to).
- Hands that mix strategies (sometimes raise, sometimes fold) are threshold hands.
- When opening wider than usual exploitatively and facing a 3-bet, it is fine to over-fold.
- Pure open-limping is almost never GTO except from the SB, because a raise builds the pot with equity and applies fold equity, while a limp does neither. Limp/fold is not a GTO strategy: if a hand is too weak to raise, fold it. Limp/raise exists only in the SB vs BB dynamic.
- SB structure: a raise range (strong hands plus some bluffs), a limp range (medium hands that do not want to bloat the pot, plus traps), and occasional limp/re-raise traps with AA and KK so the BB cannot attack every limp.
- Passive-table exception (exploitative, not GTO): where nobody isolates limpers and pots are multiway, over-limping behind gains value because implied odds rise and speculative hands gain; it works because opponents play incorrectly.

Position principles:
- CO vs 3-bets: CO 4-bets and calls less against a BB 3-bet than against an SB 3-bet, even though the BB's overall range is wider. Mechanism: the BB can cheaply flat the open and close the action, so its medium hands go into calls and its 3-bet range is condensed and strong; the SB plays mostly 3-bet-or-fold out of position, so its 3-bet range is wider and weaker on average. Defend less against the stronger distribution.
- UTG vs a 3-bet, response frequencies: vs LJ/HJ/CO about 10 to 11% 4-bet, 37 to 38% call, about 52% fold; vs BTN 8% 4-bet, 47% call, 44% fold. The early and middle positions are near-identical; the discontinuity is between CO and BTN. Why less 4-betting vs BTN: the button's range is wide and polarized, so a 4-bet folds the bluffs and runs into the value, and a 5-bet jam forces you off your hand for zero equity realization; medium and premium hands realize more by flatting and capturing bluffs postflop. Why more vs LJ/HJ/CO: their ranges are tight and linear with a large foldable middle (QQ, JJ, AK that 3-bet but cannot continue against a UTG 4-bet), so fold equity is high and the continuing range builds big pots against your premiums. 4-bet composition: AA, KK, AK always; QQ mixed; bluffs are A5s and A4s at small frequency, folding to a 5-bet; JJ and below mostly flat or fold. Slowplay some AA/KK vs BTN specifically, so the flatting range stays uncapped and traps the button's bluffs; vs early position, just 4-bet them.
- Equity realization note: higher preflop equity does not automatically mean raise. 4-betting narrows the opponent's range, a 5-bet jam can force a fold for 0% realization, and playing out of position in a bloated pot reduces realization further; flatting guarantees seeing all streets against the full range including bluffs.
- BB cold 4-betting (facing an open plus a 3-bet): 4-bet or fold, no cold calling (splitting leaks information and lets opponents realize equity cheaply). Premiums (AA, KK, QQ, AKs, AKo, AQs) always 4-bet. Against tight ranges (LJ/HJ involved) value only; against medium (CO/BTN) add some bluffs; against wide (BTN/SB) add more bluffs. Only the bluff portion scales with opponent width; premiums stay constant. For mixed pairings (for example UTG open, BTN 3-bet), default to the tighter player's tier: the opener anchors the danger level.
- Playing vs open raises, the three 3-bet constructions: (1) Exploitative: 3-bet more against weak or wide openers, but know that active players behind can cold 4-bet wider if they spot the adjustment. (2) Polarized, against 4-bet-heavy villains: value (AA, KK, AKs) plus blocker bluffs (A5s, A4s, which block AA and AK and fold cleanly to a 5-bet); middle-equity hands (AJo, KJs) flat instead, because they are dominated by the 4-bet-continuing range. (3) Linear, against call-heavy villains: strong high-equity hands that dominate the flatting range and play well postflop (AQs, AJs, KQs, JJ, TT); deprioritize bluffs because fold equity is low.

Personal Exploit Notes (label exactly: "Personal exploit notes, not GTO"):
- MES against Ben: call heavier. Ben opens wide preflop, is a call station postflop, and is aggressive when checked to. (MES is the user's shorthand in his notes; display it as written.)

## Appendix B: Sources (list all of these on the Methodology page)

- Pokalab, 6-Max Preflop Charts (solver-published RFI percentages and the NL50 regulars comparison): https://www.pokalab.com/tools/preflop-charts
- PokerTube, Poker Preflop Chart: GTO Ranges by Position (RFI hand lists): https://www.pokertube.com/article/how-to-use-a-preflop-chart-in-poker
- Beyond GTO, 3-bet strategy: how often to 3-bet from every seat, solved (3-bet frequencies, sizing, opener fold and 4-bet rates): https://beyondgto.com/blog/3-bet-poker-strategy
- Poker Academy, What is a 3-bet (BTN vs CO cash matchup in detail): https://poker.academy/blog/post/what-is-a-3-bet-in-poker-a-theoretical-and-strategic-guide
- VIP-Grinders MDF calculator and reference chart; CardPlayer, Learning the Required Poker Math; PokerCoaching poker math page (MDF and pot-odds tables, cross-checked three ways): https://www.vip-grinders.com/poker-calculators/minimum-defense-frequency-mdf-calculator/ and https://pokercoaching.com/poker-math/
- Reference implementations for chart sourcing at build time (do not scrape; charts viewed and encoded by hand): Upswing Poker Preflop Prodigy (free solver-run preflop charts for 6-max cash): https://upswingpoker.com/preflop/ and GTO Wizard's published preflop range material.
- The user's own GTO study notes (the source for Section 13 and Appendix A5; personal notes, not solver output, and to be labeled as such in the app): Google Doc "Learn GTO General Principles in each position in 4 handed cash game w/ no rake", https://docs.google.com/document/d/1_lVO4lCJavIdOQT_QupLtN3H4pbMDKz7MB4pMfFQXis/edit

## Out of scope for this build

No solver engine. No multiway postflop trees beyond the curated packs. No tournament content of any kind (Section 1 scope). No exploitative opponent profiles beyond the user's own notes card in the Learn tab. No accounts, cloud sync, payments, or social features. No live-play assistance features of any kind: this is a study tool used away from the table.
