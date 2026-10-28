import test from 'node:test';
import assert from 'node:assert/strict';
import { derive, tension, loadComponents, cosDeg, sinDeg,
         AB, BC, CD, X_B, X_C, X_D, SPAN, H_E, PULLEY_R, SQ5, U_BE, U_CE,
         MOMENT_PER_T, FORCE_DP, ANGLE_DP, FORCE_SUB, COMPONENT_SUB } from '../src/physics.js';
import { STATES } from './grid.js';

const near = (a, b, eps = 1e-9, why = '') => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b} ${why}`);

// The moment of the whole system about ANY point, counterclockwise positive. Equilibrium means this
// vanishes wherever the point is, not just about A. Every force acts somewhere on the beam's own
// line, y = 0, so only the y-components have an arm.
function momentAbout(s, px) {
  const d = derive(s);
  return (0 - px) * d.A.y + (X_B - px) * d.BE.y + (X_C - px) * d.CE.y + (X_D - px) * d.D.y;
}

test('the geometry is the figure: 5, 5 and 3 feet along the beam', () => {
  assert.equal(AB, 5);
  assert.equal(BC, 5);
  assert.equal(CD, 3);
  assert.equal(X_B, 5);
  assert.equal(X_C, 10);
  assert.equal(X_D, 13);
  assert.equal(SPAN, 13);
  assert.ok(CD !== AB && CD !== BC, 'keep the last span distinct, or a wrong formula can still look right');
});

test('the pulley sits where the drawn 2-to-1 slope puts it, ten feet over B', () => {
  assert.equal(H_E, 10, 'two feet up per foot across, and C is BC feet from B');
  // The inclined run really does rise 2 for every 1 it moves across, and it really does point up and
  // to the LEFT from C: both of those are what the figure draws.
  near(U_CE.y / Math.abs(U_CE.x), 2);
  assert.ok(U_CE.x < 0 && U_CE.y > 0);
  near(Math.hypot(U_CE.x, U_CE.y), 1);
  assert.deepEqual(U_BE, { x: 0, y: 1 }, 'the run at B is vertical, so E stands directly over B');
  // the same slope read straight off the two points, with no unit vector in the way
  near((H_E - 0) / (X_C - X_B), 2);
  assert.ok(PULLEY_R > 0 && PULLEY_R < 1, 'the drawn wheel is scenery, and smaller than a foot');
});

test('the names follow the notation reference: no force is named after a bare point', () => {
  assert.equal(FORCE_SUB.load, 'D');
  assert.equal(FORCE_SUB.pin, 'A');
  assert.equal(FORCE_SUB.cableB, 'BE', 'a cable force takes both letters of the segment it acts along');
  assert.equal(FORCE_SUB.cableC, 'CE');
  assert.deepEqual(COMPONENT_SUB, { x: 'Ax', y: 'Ay' }, 'the pin components are F_Ax and F_Ay, never A_x');
  for (const sub of Object.values(FORCE_SUB)) assert.ok(!/[_\d]/.test(sub), `"${sub}" must be letters only`);
});

test('cosDeg and sinDeg are EXACT at the quadrant points, where Math.cos is not', () => {
  assert.equal(cosDeg(270), 0);
  assert.equal(sinDeg(180), 0);
  assert.equal(cosDeg(0), 1);
  assert.equal(cosDeg(180), -1);
  assert.equal(sinDeg(90), 1);
  assert.equal(sinDeg(270), -1);
  assert.notEqual(Math.cos(270 * Math.PI / 180), 0);   // the bug this guards against
  near(cosDeg(35), Math.cos(35 * Math.PI / 180));
  assert.equal(sinDeg(360), sinDeg(0));
});

test('the default state, hand-derived', () => {
  // F_D = 200 lb straight down.
  //   sum M_A = 0:  5T + 10(2/sqrt5)T + 13(-200) = 0  ->  T = 2600 / (5 + 4 sqrt5) = 186.4565 lb
  //   F_BE = (0, T);  F_CE = T(-1/sqrt5, 2/sqrt5) = (-83.3859, 166.7718)
  //   F_A  = -(F_BE + F_CE + F_D) = (83.3859, -153.2282)
  const d = derive({ f: 200, dir: 270 });
  assert.deepEqual(d.D, { x: 0, y: -200 });
  near(d.t, 2600 / (5 + 4 * SQ5), 1e-9);
  near(d.t, 186.4565, 1e-4);
  near(d.BE.x, 0, 0);
  near(d.BE.y, 186.4565, 1e-4);
  near(d.CE.x, -83.3859, 1e-4);
  near(d.CE.y, 166.7718, 1e-4);
  near(d.A.x, 83.3859, 1e-4);
  near(d.A.y, -153.2282, 1e-4);
  assert.equal(d.slack, false);
  near(d.magBE, d.magCE, 0, 'one cable, one tension');
});

test('the tension answers to the VERTICAL component of the force at D and to nothing else', () => {
  for (const s of STATES) near(tension(s), -X_D * loadComponents(s).y / MOMENT_PER_T, 1e-12);
  // swing the force horizontal and the cable goes limp however hard you pull
  for (const dir of [0, 180, 360]) {
    const d = derive({ f: 300, dir });
    assert.equal(d.t, 0, `dir ${dir}`);
    assert.equal(d.magBE, 0);
    assert.equal(d.magCE, 0);
    near(d.magA, 300, 1e-9, 'the pin is then alone, and takes the whole force');
    near(d.A.y, 0, 0);
  }
});

test('pull UP at D and the cable would have to push, which is what `slack` says', () => {
  for (const dir of [45, 90, 135]) {
    const d = derive({ f: 200, dir });
    assert.ok(d.t < 0, `dir ${dir}`);
    assert.equal(d.slack, true);
  }
  for (const dir of [225, 270, 315]) assert.equal(derive({ f: 200, dir }).slack, false);
  // exactly horizontal is the boundary: no tension needed, and a cable at zero is not pushing
  assert.equal(derive({ f: 200, dir: 0 }).slack, false);
  assert.equal(derive({ f: 200, dir: 180 }).slack, false);
});

test('nothing applied at all means nothing anywhere', () => {
  const d = derive({ f: 0, dir: 90 });
  for (const v of [d.t, d.BE.y, d.CE.x, d.A.x, d.A.y, d.magD, d.magBE, d.magCE, d.magA]) assert.equal(v, 0);
  assert.equal(d.slack, false);
});

test('EVERY state of the grid is in equilibrium: the forces sum to zero', () => {
  for (const s of STATES) {
    const d = derive(s);
    near(d.A.x + d.BE.x + d.CE.x + d.D.x, 0, 1e-12, JSON.stringify(s));
    near(d.A.y + d.BE.y + d.CE.y + d.D.y, 0, 1e-12, JSON.stringify(s));
  }
});

test('and the moments sum to zero about EVERY point, not just about A', () => {
  for (const s of STATES) {
    for (const px of [0, X_B, X_C, X_D, -4.3, 21.5]) {
      near(momentAbout(s, px), 0, 1e-11, `${JSON.stringify(s)} about x = ${px}`);
    }
  }
});

test('both runs of the cable always pull with the SAME magnitude, and along their own lines', () => {
  for (const s of STATES) {
    const d = derive(s);
    assert.equal(d.magBE, d.magCE, JSON.stringify(s));
    near(d.BE.x, d.t * U_BE.x, 1e-12);
    near(d.BE.y, d.t * U_BE.y, 1e-12);
    near(d.CE.x, d.t * U_CE.x, 1e-12);
    near(d.CE.y, d.t * U_CE.y, 1e-12);
  }
});

test('the whole thing is linear in the force at D', () => {
  const one = derive({ f: 100, dir: 215 });
  const two = derive({ f: 200, dir: 215 });
  near(two.t, 2 * one.t);
  near(two.A.x, 2 * one.A.x);
  near(two.A.y, 2 * one.A.y);
});

// The app has no need to read a bearing back out of a vector -- nothing calls for it -- so there is
// no helper to test. The property still matters, though: the components really do point the way the
// direction said, and that is checked here with the arithmetic written out.
test('the components of the force at D really point the way its direction says', () => {
  const bearing = (v) => { const d = Math.atan2(v.y, v.x) * 180 / Math.PI; return d < 0 ? d + 360 : d; };
  // compared a full turn apart, because 360 degrees and 0 degrees are the same direction and the
  // slider's range can hold either -- which is what this caught the first time it was run
  const apart = (a, b) => ((a - b + 540) % 360) - 180;
  for (const dir of [0, 35, 90, 215, 270, 355]) near(apart(bearing(loadComponents({ f: 50, dir })), dir), 0, 1e-9, `dir ${dir}`);
  for (const s of STATES) {
    if (s.f === 0) continue;
    near(apart(bearing(loadComponents(s)), s.dir), 0, 1e-9, JSON.stringify(s));
    near(Math.hypot(loadComponents(s).x, loadComponents(s).y), s.f, 1e-9, `${JSON.stringify(s)}: and its length is f`);
  }
});

test('the grid stays inside the drawing budgets the figure is built for', () => {
  let max = 0;
  for (const s of STATES) {
    const d = derive(s);
    max = Math.max(max, d.magD, d.magBE, d.magCE, d.magA);
  }
  // The pin can be pulled harder than the force at D is: the cable's two pulls both have a leftward
  // or upward share, and the pin is left holding their sum. layout.js sizes the arrows for this.
  assert.ok(max > 300, `the grid must reach past the force itself; it reaches ${max}`);
  assert.ok(max < 350, `and must not exceed what the panels were measured for; it reaches ${max}`);
});

test('no quantity is ever reported as negative zero', () => {
  for (const s of STATES) {
    const d = derive(s);
    for (const v of [d.D.x, d.D.y, d.BE.x, d.BE.y, d.CE.x, d.CE.y, d.A.x, d.A.y, d.t]) {
      assert.ok(!Object.is(v, -0), `${JSON.stringify(s)} produced a negative zero`);
    }
  }
  assert.ok(!Object.is(tension({ f: 0, dir: 0 }), -0));
});

test('the printed precisions are the ones the figure claims', () => {
  assert.equal(FORCE_DP, 1);
  assert.equal(ANGLE_DP, 0);
});
