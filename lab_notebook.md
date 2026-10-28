# Lab notebook — beam held by a cable over a pulley

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

**Not done / open.**

- Not published. No public repo exists yet; `LICENSE`, the root `index.html` redirect and the
  README's live address are already committed **here**, which is the whole point of the trap found
  on 2026-10-27 in the other sims.
- Not tried: Firefox, Safari, a real Canvas iframe, or a touch device.
