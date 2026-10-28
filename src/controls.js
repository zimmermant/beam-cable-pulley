import { FIELDS, fieldShow, snapAt } from './fields.js';

// The reading bar under the figure. There is nothing to push on this page -- the figure is the
// control, and the force at D is set by dragging its arrowhead or by the arrow keys on that handle
// -- so this module only ever WRITES: the two numbers the drag changes, and the chip that lights
// when the direction is exactly its snap value.
//
// That is why there is no slider code here, no thumb to put back after a snap, and no keyboard flag:
// a slider needs to be told that an `input` event came from a key rather than a pointer, because the
// two mean different things inside a snap zone, but a drag handle reads its own keydown directly
// (interact.js) and a value typed into a link goes through presets. None of those needs this file.

// Pure: what the bar shows for state s. text[key] is the readout; atSnap[key] (only for a field with
// `snap`) says whether the input sits on its snap value; atMark[key] (only for a field with `mark`)
// whether it sits on its mark.
export function controlsView(s) {
  const text = {}, atSnap = {}, atMark = {};
  for (const f of FIELDS) {
    text[f.key] = fieldShow(f, s[f.key]);
    if (f.snap) atSnap[f.key] = s[f.key] === snapAt(f);
    if (f.mark) atMark[f.key] = s[f.key] === f.mark.value;
  }
  return { text, atSnap, atMark };
}

function controlsSetText(node, str) {
  if (node.textContent !== str) node.textContent = str;
}

// parts: { readouts: { key: el }, snaps: { key: el }, marks: { key: el } } -- one readout per input
// in FIELDS, `snaps` only for the fields with `snap` and `marks` only for those with `mark`.
// render(s) shows state s in them.
export function createControls(parts) {
  function render(s) {
    const v = controlsView(s);
    for (const f of FIELDS) {
      if (parts.readouts[f.key]) controlsSetText(parts.readouts[f.key], v.text[f.key]);
      if (f.snap && parts.snaps[f.key]) parts.snaps[f.key].classList.toggle('on', v.atSnap[f.key]);
      if (f.mark && parts.marks[f.key]) parts.marks[f.key].classList.toggle('on', v.atMark[f.key]);
    }
  }
  return { render };
}
