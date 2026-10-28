import test from 'node:test';
import assert from 'node:assert/strict';
import { stubElement } from './stub-dom.js';
import { FIELDS, SLIDER_FIELDS, fieldShow, snapAt } from '../src/fields.js';
import { createControls, controlsView } from '../src/controls.js';
import { createState, DEFAULTS } from '../src/state.js';
import { FIRST_SNAP, NEEDS_SNAP, FIRST_MARK, NEEDS_MARK } from './snap.js';

// The bar under the figure only ever WRITES: there is nothing on this page to push, so these tests
// are about what it shows, not about what it can be made to do. Anything a student can change goes
// through the drag handle (test/interact.test.js) or through a link (test/presets.test.js).
const SNAP = FIRST_SNAP;

function rig() {
  const parts = { readouts: {}, snaps: {}, marks: {} };
  for (const f of FIELDS) {
    parts.readouts[f.key] = stubElement('b');
    if (f.snap) parts.snaps[f.key] = stubElement('span');
    if (f.mark) parts.marks[f.key] = stubElement('span');
  }
  const state = createState();
  const controls = createControls(parts);
  controls.render(state.getState());
  state.subscribe((st) => controls.render(st));   // as app.js does
  return { parts, state, controls };
}

test('this page really has no slider: the bar is a reading, not a control', () => {
  assert.equal(SLIDER_FIELDS.length, 0, 'a slider here would need markup, binding and a keyboard flag');
  for (const f of FIELDS) assert.equal(f.noSlider, true, `${f.key}`);
});

test('controlsView: one fixed-decimal text per field, and whether a snap field sits on its snap value', () => {
  const v = controlsView(DEFAULTS);
  for (const f of FIELDS) assert.equal(v.text[f.key], fieldShow(f, f.default), f.key);
  assert.deepEqual(Object.keys(v.atSnap), FIELDS.filter(f => f.snap).map(f => f.key));
  for (const f of FIELDS.filter(g => g.snap)) {
    const at = snapAt(f);
    assert.equal(controlsView({ ...DEFAULTS, [f.key]: at }).atSnap[f.key], true, f.key);
    assert.equal(controlsView({ ...DEFAULTS, [f.key]: at + f.snap.jump }).atSnap[f.key], false, f.key);
    assert.equal(controlsView({ ...DEFAULTS, [f.key]: at - f.snap.jump }).text[f.key], fieldShow(f, at - f.snap.jump));
  }
});

test('controlsView: a field with mark reports whether the input sits on the marked value', NEEDS_MARK, () => {
  const f = FIRST_MARK;
  assert.deepEqual(Object.keys(controlsView(DEFAULTS).atMark), FIELDS.filter(g => g.mark).map(g => g.key));
  assert.equal(controlsView({ ...DEFAULTS, [f.key]: f.mark.value }).atMark[f.key], true);
  assert.equal(controlsView({ ...DEFAULTS, [f.key]: f.mark.value === f.max ? f.min : f.max }).atMark[f.key], false);
});

test('render writes EVERY input back: the bar is the only place the numbers are in words', () => {
  const { parts, state } = rig();
  for (const f of FIELDS) assert.equal(parts.readouts[f.key].textContent, fieldShow(f, f.default), f.key);
  // and it follows the store, whatever moved it
  state.set({ [FIELDS[0].key]: FIELDS[0].max });
  assert.equal(parts.readouts[FIELDS[0].key].textContent, fieldShow(FIELDS[0], FIELDS[0].max));
  for (const f of FIELDS.slice(1)) assert.equal(parts.readouts[f.key].textContent, fieldShow(f, f.default), `${f.key} moved`);
});

test('the snap chip lights exactly while the input sits on its snap value', NEEDS_SNAP, () => {
  const { parts, state } = rig();
  const at = snapAt(SNAP);
  // the default IS the snap value on this page, so it starts lit
  assert.equal(parts.snaps[SNAP.key].classList.contains('on'), SNAP.default === at);
  state.set({ [SNAP.key]: at + SNAP.snap.jump });
  assert.equal(parts.snaps[SNAP.key].classList.contains('on'), false, 'off the value, the chip goes out');
  state.set({ [SNAP.key]: at });
  assert.equal(parts.snaps[SNAP.key].classList.contains('on'), true, 'and back on when it returns');
  state.set({ [SNAP.key]: at - SNAP.snap.jump });
  assert.equal(parts.snaps[SNAP.key].classList.contains('on'), false, 'the other side of the zone too');
});

test('a render that changes nothing leaves the readout node alone', () => {
  const { parts, state } = rig();
  const f = FIELDS[0];
  parts.readouts[f.key].textContent = fieldShow(f, f.default);
  let writes = 0;
  Object.defineProperty(parts.readouts[f.key], 'textContent', {
    get: () => fieldShow(f, f.default), set: () => { writes++; }, configurable: true
  });
  state.set({ [f.key]: f.default });     // same value: the store does not even notify
  assert.equal(writes, 0);
});

test('a missing element is survived, so a page may show fewer readings than there are inputs', () => {
  const parts = { readouts: {}, snaps: {}, marks: {} };
  parts.readouts[FIELDS[0].key] = stubElement('b');
  const controls = createControls(parts);
  controls.render(DEFAULTS);             // the other inputs have no node at all
  assert.equal(parts.readouts[FIELDS[0].key].textContent, fieldShow(FIELDS[0], FIELDS[0].default));
});
