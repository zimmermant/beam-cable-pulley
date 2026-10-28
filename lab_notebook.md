# Lab notebook — beam held by a cable over a pulley

## 2026-10-28 — the page cut in half: the sliders out, the comments out of the build

**Summary.** Todd asked for a smaller served file: the two sliders gone, and anything else trimmed
that does not cost functionality. **100,871 → 47,111 bytes, 53% smaller.** 213 tests green, browser
harness clean at both budgets, drag and keyboard verified live on the stripped bundle.

**Where the weight actually was.** Measuring first was worth it: the sliders were not the big item.
Of 103 KB of source, **44 KB was whole-line comments**, and all of it shipped. The two levers, in
order of size:

| | bytes |
|---|---|
| comments, blank lines and indentation, stripped at build time | ~47,000 |
| the two sliders: markup, CSS, binding code, and the keyboard-flag machinery | ~5,100 |
| four exports nothing in the app called | ~700 |
| the bar's hint, which repeated the figure's own caption | ~140 |

**The strip, and why it is safe.** `strip()` in `build.js` drops whole-line comments, blank lines and
leading whitespace. Each of those is a comment or dead space in JavaScript **except inside a
multi-line template literal**, where all three are text that matters. There is no such literal in
`src/`, and the build now REFUSES a module containing one rather than mangling it. Trailing comments
are deliberately left alone: a trailing `//` cannot be told from the `//` of a URL in a string
(`svg.js` holds `http://www.w3.org/2000/svg`) without parsing the line. The assembled bundle is
still handed to `new Script()`, so a stripping bug is a loud build failure rather than a quiet one.

**Decisions.**

- **The sliders went, and the drag stayed.** That reverses the call of 2026-10-27, on Todd's ask.
  The page is back to "the figure is the control": drag the arrowhead, or tab to it and use the
  arrow keys. Exact values are still reachable, by link (`?f=150&dir=215`).
- **The source keeps every comment.** Only the built page goes without. The documentation is the
  point of the source and costs nothing where it lives.
- **Four exports removed as dead**: `fieldSymbol` and `fieldSymbolWord` (called nowhere at all),
  `headingOf` and `unfmt` (called by tests only). What `headingOf`'s test checked — that the
  components point the way the direction says — is still checked, with the arithmetic written out in
  `physics.test.js` instead.
- **The bar's hint went too.** It repeated the figure's own "drag the arrowhead" caption, and at 740
  px it wrapped onto a second line, which is what the harness caught.

**Problems, and how they were resolved.**

1. **The hint wrapped and the harness said so.** Five violations at the default state: the wrapped
   `<span.hint>` box spans both lines, so it overlaps every reading on the first. Removing it was the
   right fix rather than shortening it — the figure already says it, next to the thing you drag —
   and it left the bar one slim line, so the figure is now BIGGER than before the trim.
2. **Two build tests used comments as their fixtures** (a huge CSS comment to blow the budget, a
   comment holding `$&`). Both are rules now, because a comment can no longer reach the page.
3. **One build test could no longer exist.** It proved the build notices an `import` line that
   survived `strip()`, using a multi-line template literal — which the strip now refuses outright.
   Rewritten around a dynamic `import (...)` on its own line, which survives `strip()` (no `from`)
   and still parses. That leaves build.js's matching `^export` check with no parseable fixture; it
   is kept as belt and braces and said so in the comment, rather than quietly left looking covered.
4. **The new "no comments in the page" test voided the whole mutation audit.** It read `dist/` from
   the repo, and the audit runs the suite in a scratch copy of `src/` that has no `dist/` — so it
   failed before any mutation, and an audit with a red baseline proves nothing. It builds its own
   page now.
5. **A removed helper's replacement test caught a real edge.** Comparing a bearing with the
   direction it came from failed at `dir = 360`, which reads back as 0 — the same direction, a
   different number. Compared modulo a full turn now.

**Verified.** 213 node tests. Browser harness at 800 × 750 and 1280 × 720: sweep 0 violations,
`queries` 0 over 11 link probes, `sensitivity.flagged` true, `budget.ok` true. Live in Chromium on
the stripped bundle: dragging the arrowhead set 150 lb at 215°, ArrowLeft stepped to 210°, Home put
it back to 300 lb straight down with the chip lit and the weight filled in, ArrowRight from the snap
cleared the zone to 285°, End dropped it to 0.

**The mutation audit.** All 223 mutations caught first time. Four of the day's new tests had nothing
that could break them, so each got a row, and every one was checked by hand both ways. The best of
them is the mistake the strip is designed around: eating trailing comments as well looks like more of
a good thing, and it quietly turns `'http://www.w3.org/2000/svg'` into `'http:'`. Final state:
`node tools/mutations.mjs --coverage --strict` exits 0 — **all 227 mutations caught, and every one of
the 215 tests is made to fail by at least one of them**.

**Not done / open.** The published copy at <https://zimmermant.github.io/beam-cable-pulley/> is still
the 100 KB version; this has not been republished.

---

## 2026-10-27 — built the simulation from the textbook figure

**Summary.** Built a four-panel statics sandbox from the figure drawn earlier the same day
(`teaching_statics/figures/beam_pulley_cable.svg`): a beam pinned at A, held by one cable tied at B,
taken over a pulley at E and tied again at C, with a force at D the student can point anywhere. The
weight that hung at D is left in outline and the force snaps to it. Suite green (214 tests); the
browser harness is clean at both viewport budgets, link probes included.

**Decisions and why.**

- **Feet and pounds**, not SI. Todd's call: the figure is dimensioned in feet, and converting would
  have made the simulation disagree with the figure it came from.
- **Scaffolded from `beam_roller_collar`, not from the kit.** That sibling is the kit plus exactly
  the machinery this needed — a draggable force vector, the four-panel figure, URL presets — so
  copying it and replacing the physics was far less work and far less risk than re-deriving the same
  scaffolding. Everything generic (format, state, presets, svg, build, the harness shell) came over
  unchanged.
- **Both inputs get a slider AND the drag.** Todd's call, against the sibling's drag-only choice.
  The drag is the fast way and the one the figure invites; the sliders are the exact way, because
  nobody drags to 215° on purpose, and the direction slider's thumb visibly sticks at 270°, which
  makes the snap something you can see and not only feel. They are not two sources of truth: both go
  through `fieldSnap` into the same store.
- **The snap is at 270°, not at zero.** That meant generalising `snap` in `fields.js` from "a zone
  about zero" to `{ at, zone, jump }`, and generalising every rule that read it — `fieldSnap`,
  `fieldNext`, `controlsView`, the grid builder, and eleven generic mutation rows. The cost is that
  260, 265, 275 and 280 degrees cannot be set at all; that is written down in `fields.js`.
- **A negative tension is reported, not hidden.** Point the force at D anywhere upward and the
  equations ask the cable to push. The figure draws what the equations give and says in words that
  the cable would go slack, rather than quietly drawing a cable in compression as though it were an
  answer.
- **The slope triangle is labelled "2 ft" and "1 ft", not "2" and "1".** The unit lint refused the
  bare numbers, and it was right: a reader has to guess what they count. The legs were made exactly
  2 ft and 1 ft so the labels are true lengths and the hypotenuse is still the cable itself.

**Problems, and how they were resolved.**

1. **The keyboard could never leave the snap zone.** `interact.js` nudged the direction through
   `state.set`, which only snaps; one five-degree arrow-key step from 270° snapped straight back.
   Fixed by routing the nudges through `state.setField(..., viaKeyboard)`, the same path the
   slider's own keyboard takes. This is a real bug that only existed because the snap moved off
   zero, and it now has a mutation row of its own.
2. **Three label collisions the unit tests could not see.** The browser harness found: the dimension
   labels sitting on their own dimension lines (the measured text box is taller than the font size
   once the white halo counts); the two corner labels in the space panel overlapping (a label with a
   drawn vector bar *and* a subscript stands 20 units above its baseline and 10 below, so 26 apart
   is not enough); and two force labels on each other in both the force polygon and the free-body
   diagram.
3. **The first fix for (2) proved nothing.** The polygon check I added passed on the very geometry
   the browser had just failed, because it handed `placeLabels` only the moving labels and not the
   panel's pinned heading, caption and scale bar — an easier problem than the figure solves. Made
   faithful, it failed on both geometries, which is what let it drive the fix. This is lesson 27 in
   the skill's notes, met again: a guard that cannot fire is worth nothing, and it has to be checked
   both ways.
4. **`labelBox` believed every label was `TEXT` units tall.** A 69-character caption drawn at `SUB`
   was estimated 787 units wide — wider than its own panel — so the solver thought the whole band
   across the top of the free-body diagram was occupied and had nowhere to move the two cable labels
   to. Made size-aware, which is both more honest and what unblocked the panel.
5. **A preset link pushed the subscripts under the 12 px floor.** The figure takes whatever height
   the control bar leaves it, so a two-line "Adjusted:" note shrinks it: at 1280 × 720 the scale fell
   to 0.70 and 16-unit subscripts rendered at 11.9 px. Fixed by raising `SUB` to 17 and shaving about
   14 px off the bar (a 22 px slider track instead of 26, tighter paddings). Only the harness's
   **query** probes see this; the sweep on the page itself never does, because the page itself never
   shows a link note.
6. **Fixing (4) and (5) made the captions bigger, which undid (2).** Caption spacing went from 20 to
   24 units, the two longest captions were shortened, and the free-body beam moved down to 590.
   Three constants were then swept over every state of the grid rather than guessed: the polygon's
   vertical margin (30 — and *more* is worse past 74 on the horizontal, because a small enough
   polygon brings all four side midpoints together), the label standoff (20), and `PLACE_MAX_SHIFT`
   (160). The measured numbers are in the comments at each one.

**Verified.** 214 node tests. Browser harness at 800 × 750 and 1280 × 720: sweep 0 violations over
33 states, `queries` 0 over 11 link probes, `sensitivity.flagged` true (every planted fault named,
page clean after), `budget.ok` true. Live drag checked by hand in Chromium: dragging the arrowhead
set 150 lb at 215° and **both sliders followed**; dragging to eight degrees off straight down snapped
to exactly 270° with the chip lit and the outlined weight filled in. The slack state was looked at on
screen: cable arrows reversed, warning shown, polygon still closing.

**The mutation audit, and the four things it found.** Four rounds, each one finding something a
green test run could not. Final state: `node tools/mutations.mjs --coverage --strict` exits 0 —
**all 237 mutations caught, and every one of the 220 tests is made to fail by at least one of them**.

1. **Four real gaps.** The hanging weight could be drawn *above* the beam and nothing noticed,
   because the test checked the box around it rather than the pieces drawn in it; the two runs of
   cable could be painted in the pin's colour, denying the one fact the problem turns on, and no
   test looked at a colour at all; `CAPTION_DY` could be tucked back under its heading; and `SUB`
   could drop to 16, where a link note shrinks the figure enough to put subscripts under the floor.
   The last two need numbers a font size cannot give, so the measured ones now live in `layout.js`:
   `INK_ABOVE`, `INK_BELOW`, `INK_BELOW_SUB` and `WORST_SCALE`.
2. **Four equivalent mutants** — rows that could not change the page. Deleted, with the reason
   written where each one was, rather than left looking like coverage. One was my own: a row adding
   a key to `COLOR_OF`, which is looked up by `cls` and not by `key`.
3. **Two faulty rows of my own.** One renamed the `dir` key, which `scene.js` resolves while the
   module is still loading, so four test *files* failed to import rather than failing assertions —
   the audit is right not to count that as caught. The other was too blunt for its default limit,
   and the limit was raised with the reason, because on this page the snap really is central.
4. **Three tests that compared the source with itself.** `near(cableC.vec.y / cableC.vec.x,
   U_CE.y / U_CE.x)`, and the same shape for `PLACE_MAX_SHIFT` and `SHAFT_SEG`: each restated the
   constant it was meant to pin, so no edit could make it fail. The slope one would have passed
   happily with the cable running the wrong way. They now check the figure's own numbers (−2, two up
   per one to the left) alongside literal ceilings.

The last test nothing could break turned out to be guarding an undocumented contract: `snapAt`
returns **null** for a field with no snap, not zero, and that is what makes every `f.snap &&` guard
safe — a field that snaps at zero and a field that does not snap are different things. Asserted
directly now, with a row that flips the null to a zero to prove the assertion fires.

## 2026-10-27 (later) — first publish

**Published** to <https://zimmermant.github.io/beam-cable-pulley/> on Todd's go-ahead. Public repo
`zimmermant/beam-cable-pulley` created fresh; its history starts clean at **`4833fdd`**, a single
commit built by `git archive` from source `7ca8711` into an empty clone, as `publishing.md` says to
do. Pages serves `main` at `/`.

**The checks, in the order the procedure asks for them.**

- Working tree clean, on `main`, 217 tests green, `node build.js` left `git status` clean.
- The deletion guard found nothing to delete, which is what a first publish should show: the staged
  change is 47 additions and no `D` lines at all.
- The suite was run again **inside the tree that would be served**, not only in the source repo: 217
  green there, and `node build.js` in the clone produced a `dist` byte-identical to the source one.
- Nothing from `docs/`, `.superpowers/`, `.claude/` or `CLAUDE.md`; no local path, key or email
  address anywhere in what was added; the only URL in the served page is the SVG namespace, so it
  fetches nothing.
- Pages went live about 40 s after the push. Polled until the served file was **byte-identical** to
  the built one rather than until it merely returned 200.
- The root redirect serves and lands on `dist/beam_cable_pulley.html`.
- The browser harness was run **from the live origin** (`fetch('/beam-cable-pulley/tools/browser-harness.js')`)
  at both budgets: 800 × 750 and 1280 × 720, sweep 0 violations over 33 states, `queries` 0 over 11
  link probes, `sensitivity.flagged` true, `budget.ok` true.
- A preset link was opened live (`?f=200&dir=90`): the note reads back both values, and the slack
  warning is shown, which is the state that link is there to reach.

**Not tried:** Firefox, Safari, a real Canvas iframe, a touch device. The in-app browser's
screenshots came back scaled into a corner once the pane narrowed, so the live layout was confirmed
from the DOM (`innerWidth` 800, figure 784 × 557, `scrollHeight` 750, no scroll) and from the
harness, not from a picture.

---

**Not done / open.**

- Published; see the entry above. `LICENSE`, the root `index.html` redirect and the README's live
  address were committed **here** before the first publish and reached the public repo through the
  same export as everything else, which is the whole point of the trap found earlier today in the
  other sims. This notebook entry reaches the public copy with the next update.
- Not tried: Firefox, Safari, a real Canvas iframe, or a touch device.
