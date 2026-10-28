import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIELDS, SLIDER_FIELDS, UNIT_JOIN, fieldShow, snapAt } from '../src/fields.js';
import { parsePresets } from '../src/presets.js';
import { PAGES } from '../build.js';
import { VB } from '../src/layout.js';

// The page is the four diagrams and two sliders. These tests pin that down as text: that each slider
// really is there with the table's range, that the snapped direction is marked on its scale at the
// right place, and that nothing else crept back in.
const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const html = readFileSync(join(src, 'index.template.html'), 'utf8');
const css = readFileSync(join(src, 'styles.css'), 'utf8');
const count = (s, re) => (s.match(re) || []).length;
const sepHtml = (unit) => (Object.hasOwn(UNIT_JOIN, unit) ? UNIT_JOIN[unit] : '&nbsp;');
const symHtml = (f) => (f.sub ? `${f.symbol}<sub>${f.sub}</sub>` : f.symbol);

test('one page, and it has both inline markers exactly once', () => {
  assert.equal(PAGES.length, 1);
  assert.equal(PAGES[0].template, 'index.template.html');
  for (const marker of ['<!--INLINE_CSS-->', '<!--INLINE_JS-->']) {
    assert.equal(count(html, new RegExp(marker, 'g')), 1, marker);
  }
});

test('every id app.js looks up is in the page', () => {
  const app = readFileSync(join(src, 'app.js'), 'utf8');
  const ids = [...app.matchAll(/getElementById\('([\w-]+)'\)/g)].map(m => m[1]);
  assert.ok(ids.length >= 4, `only ${ids.length} ids found in app.js`);
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `#${id} is missing from the page`);
});

test('the figure is the one the layout draws, and is left to letterbox itself', () => {
  const m = html.match(/<svg id="fig" viewBox="0 0 (\d+) (\d+)"/);
  assert.ok(m, 'no <svg id="fig" viewBox="0 0 w h">');
  assert.deepEqual([Number(m[1]), Number(m[2])], [VB.w, VB.h]);
  assert.ok(!/preserveAspectRatio/.test(html), 'the default "meet" is what fits the figure to the window');
  assert.ok(/role="img"/.test(html) && /aria-label="[^"]{120,}"/.test(html), 'the figure needs a real description');
});

test('the input that HAS a slider has all of its parts, with the table\'s range', () => {
  for (const f of SLIDER_FIELDS) {
    const slider = html.match(new RegExp(`<input type="range" id="${f.id}-slider" min="(-?[\\d.]+)" max="(-?[\\d.]+)" step="([\\d.]+)" value="(-?[\\d.]+)"`));
    assert.ok(slider, `${f.key}: no range input with min, max, step and value`);
    assert.deepEqual(slider.slice(1).map(Number), [f.min, f.max, f.step, f.default], `${f.key}: the page's range differs from FIELDS`);
    const want = `<label for="${f.id}-slider"><b>${f.label}</b></label> ${symHtml(f)} = <b id="${f.id}-readout" class="readout">${fieldShow(f, f.default)}</b>${sepHtml(f.unit)}${f.unit}`;
    assert.ok(html.includes(want), `${f.key}: the heading line must read ${want}`);
    for (const end of [f.min, f.max]) {
      // a '+' only where the scale runs both ways from zero; this page's two do not
      const shown = (end > 0 && f.min < 0 ? '+' : '') + fieldShow(f, end);
      assert.ok(html.includes(`<span>${shown}${sepHtml(f.unit)}${f.unit}`), `${f.key}: no scale label "${shown}"`);
    }
  }
});

test('an input with no slider would really have none, and the page says the arrow can be dragged too', () => {
  for (const f of FIELDS.filter(g => g.noSlider)) {
    assert.ok(!html.includes(`${f.id}-slider`), `${f.key} should have no slider`);
  }
  assert.equal(count(html, /<input\b/g), SLIDER_FIELDS.length, 'exactly one input per slider field, and no others');
  // Both inputs can also be set by dragging the arrow at D. A student who never reads a hint will
  // find that out by grabbing it; one who reads the bar should not have to guess.
  assert.ok(/drag the arrowhead/.test(html), 'the bar has to say the arrow is draggable');
  for (const f of FIELDS) assert.ok(html.includes(`id="${f.id}-readout"`), `${f.key}: every input is read back on the page`);
});

test('the snapped direction is marked on its scale, at the place the field says, for that field and no other', () => {
  const snapFields = SLIDER_FIELDS.filter(f => f.snap);
  assert.ok(snapFields.length >= 1, 'the direction sticks at straight down and should be marked there');
  assert.equal(count(html, /<i class="zt"><\/i>/g), snapFields.length, 'one tick per snap field');
  assert.equal(count(html, /class="snap-label"/g), snapFields.length);
  for (const f of snapFields) assert.ok(html.includes(`id="${f.id}-snap" class="snap-label"`), `${f.key}`);
  assert.ok(css.includes('.snap-label.on'), 'the label lights up when the slider sits on it');
  // THE DRIFT THAT WOULD OTHERWISE GO UNSEEN: the tick's position is a percentage in the stylesheet,
  // and the value it marks is a number in FIELDS. Change the range and the tick would quietly point
  // at the wrong place, which is worse than no tick at all.
  const f = snapFields[0];
  const want = 100 * (snapAt(f) - f.min) / (f.max - f.min);
  for (const rule of ['.zt', '.zl .snap-label']) {
    const m = css.match(new RegExp(`\\${rule.split(' ').pop()}\\s*\\{[^}]*left:\\s*([\\d.]+)%`));
    assert.ok(m, `no left percentage on ${rule}`);
    assert.ok(Math.abs(Number(m[1]) - want) < 0.01, `${rule} sits at ${m[1]}%, but ${snapAt(f)} is ${want}% along the scale`);
  }
  assert.ok(html.includes(`${fieldShow(f, snapAt(f))}${sepHtml(f.unit)}${f.unit} straight down`),
    'and the label says in words what that value means');
});

test('nothing from the fuller page crept back in: no reading panel, no reset, no second page', () => {
  for (const id of ['calc', 'reset', 'status']) assert.ok(!html.includes(`id="${id}"`), `#${id} should not be here`);
  assert.equal(count(html, /<button\b/g), 0, 'the only interaction is the drag and the two sliders');
  assert.ok(html.includes('id="from-link"'), 'but a link that presets the page still says so');
});

test('the page is exactly the window tall and never scrolls', () => {
  assert.ok(/body\s*\{[^}]*height:\s*100vh/.test(css));
  assert.ok(/body\s*\{[^}]*overflow:\s*hidden/.test(css));
  assert.ok(/\.fig-fill\s*\{[^}]*position:\s*relative/.test(css));
  assert.ok(/#fig\s*\{[^}]*position:\s*absolute/.test(css));
});

test('the slider shows every state it can be in, in both engines', () => {
  for (const sel of ['::-webkit-slider-thumb', '::-moz-range-thumb']) {
    assert.ok(css.includes(`input[type=range]:hover${sel}`), `the thumb needs a hover style for ${sel}`);
    assert.ok(css.includes(`input[type=range]:active${sel}`), `and an active one for ${sel}`);
    assert.ok(css.includes(`input[type=range]:focus-visible${sel}`), `and a focus one for ${sel}`);
  }
});

test('a subscript on the page is pinned at the 12 px floor, not left to the browser', () => {
  assert.ok(/#controls sub\s*\{[^}]*font-size:\s*12px/.test(css),
    'the browser default is 83% of the parent, which lands within a whisker of the floor');
  assert.ok(/<sub>/.test(html), 'and the page really has a subscript to pin');
});

test('the page works in the units the figure is dimensioned in: pounds and degrees', () => {
  assert.deepEqual(FIELDS.map(f => f.unit), ['lb', '°'], 'a force in pounds, an angle in degrees');
  assert.equal(FIELDS[0].unitWord, 'pounds');
  assert.equal(FIELDS[1].unitWord, 'degrees');
  assert.ok(/>\s*0&nbsp;lb</.test(html) && /300&nbsp;lb</.test(html), 'the force scale is labelled in pounds');
  assert.ok(!/\bN\b|newton/i.test(html), 'nothing on the page is in newtons: the figure is in feet and pounds');
});

test('the drag handle shows every state it can be in', () => {
  for (const state of [':hover', ':focus-visible']) {
    assert.ok(css.includes(`.load-handle${state}`), `the handle needs a ${state} style`);
  }
  assert.ok(css.includes('.dragging'), 'and a grabbed state');
});

test('the example in the page\'s own aria text is honest about what can be dragged', () => {
  const aria = html.match(/aria-label="([^"]*)"/)[1];
  assert.ok(/drag/i.test(aria));
  assert.ok(!/\d/.test(aria), 'digits in aria text read as bare numbers: spell them out');
});

test('a link can preset every input, including the ones with no slider', () => {
  const q = '?' + FIELDS.map(f => `${f.key}=${f.default}`).join('&');
  const p = parsePresets(q);
  for (const f of FIELDS) assert.equal(p.values[f.key], f.default, f.key);
  assert.deepEqual(p.ignored, []);
});
