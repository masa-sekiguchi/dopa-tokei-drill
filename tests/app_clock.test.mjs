// Clock skills: every generated problem must be internally consistent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProblem, makeRng, clockSvg, clockHands, handsDigits } from '../app/js/problems.js';
import { SKILLS, SKILL } from '../app/js/skills.js';

const CLOCKS = SKILLS.filter((s) => s.id.includes('-clock-'));
const typed = (p) => p.steps.map((s) => s.digit).join('');
const w12 = (h) => ((h - 1 + 12) % 12) + 1;
const minutesOf = (h, m) => (h % 12) * 60 + m;

test('clock skills exist, form a chain from a root, and are in the tree lane', () => {
  assert.equal(CLOCKS.length, 9);
  for (const s of CLOCKS) assert.equal(s.lane, 3);
  assert.deepEqual(SKILL['g1-clock-hour'].req, []);
});

test('every clock problem has input steps, a clock or text, and unique cell ids', () => {
  const rng = makeRng(2026);
  for (const s of CLOCKS) {
    for (let i = 0; i < 200; i++) {
      const p = makeProblem(s.id, rng);
      assert.ok(p.steps.length >= 1, s.id);
      const ids = p.cells.map((c) => c.id);
      assert.equal(new Set(ids).size, ids.length, `${s.id} duplicate ids`);
      for (const st of p.steps) assert.ok(ids.includes(st.cell), `${s.id} step cell`);
      for (const st of p.steps) if (st.help) for (const id of st.help.ids) assert.ok(ids.includes(id), `${s.id} help id ${id}`);
      for (const c of p.cells) assert.ok(c.c >= 0 && c.c + (c.cs || 1) <= p.cols && c.r >= 0 && c.r + (c.rs || 1) <= p.rows, `${s.id} cell inside grid`);
    }
  }
});

test('reading a clock: typed digits are the hour then the minute shown on the face', () => {
  const rng = makeRng(1);
  const want = { 'g1-clock-hour': (m) => m === 0, 'g1-clock-half': (m) => m === 30, 'g2-clock-5': (m) => m % 5 === 0 && m !== 0 && m !== 30, 'g2-clock-1': (m) => m >= 1 && m <= 59 };
  for (const id of Object.keys(want)) {
    for (let i = 0; i < 200; i++) {
      const p = makeProblem(id, rng);
      const [, h, m] = /^とけい (\d+)時(?:(\d+)分)?$/.exec(p.text);
      assert.equal(typed(p), `${h}${m ?? ''}`);
      assert.ok(want[id](Number(m ?? 0)), `${id} ${p.text}`);
      assert.ok(p.cells.some((c) => c.kind === 'dial' && c.svg.includes('clk-hh')));
    }
  }
});

test('あと何分で○時: the answer completes the hour', () => {
  const rng = makeRng(3);
  for (let i = 0; i < 200; i++) {
    const p = makeProblem('g2-clock-next', rng);
    const [, h, m, next] = /^(\d+)時(\d+)分 → (\d+)時まで$/.exec(p.text);
    assert.equal(Number(next), w12(Number(h) + 1));
    assert.equal(Number(typed(p)), 60 - Number(m));
  }
});

test('○分前・○分後: answer time is exactly n minutes before/after, hour rolls over', () => {
  const rng = makeRng(4);
  for (const id of ['g2-clock-shift-pic', 'g3-clock-shift', 'g3-clock-shift2']) {
    let crossed = 0;
    for (let i = 0; i < 400; i++) {
      const p = makeProblem(id, rng);
      const [, h, m = '0', n, dir] = /^(\d+)時(?:(\d+)分)?の (\d+)分(前|後)$/.exec(p.text);
      const start = minutesOf(Number(h), Number(m));
      const delta = (dir === '前' ? -1 : 1) * Number(n);
      const end = (((start + delta) % 720) + 720) % 720;
      const [, rh, rm] = /^(\d+)時(\d+)分$/.exec(p.answer);
      assert.equal(minutesOf(Number(rh), Number(rm)), end, p.text);
      assert.equal(typed(p), `${rh}${rm}`);
      assert.ok(Number(rm) > 0 && Number(rm) < 60);
      if (Math.floor(start / 60) !== Math.floor(end / 60)) crossed++;
    }
    assert.ok(crossed > 100, `${id} should often cross the hour (${crossed})`);
  }
});

test('picture version shades exactly the minutes to go back or forward', () => {
  const rng = makeRng(5);
  for (let i = 0; i < 50; i++) {
    const p = makeProblem('g2-clock-shift-pic', rng);
    const dial = p.cells.find((c) => c.kind === 'dial');
    assert.match(dial.svg, /clk-arc/);
  }
  assert.doesNotMatch(clockSvg(9, 0), /clk-arc/);
  assert.match(clockSvg(9, 0, { arc: { from: 240, to: 360 } }), /clk-arc/);
});

test('経過時間: minutes between the two times', () => {
  const rng = makeRng(6);
  for (let i = 0; i < 300; i++) {
    const p = makeProblem('g3-clock-elapsed', rng);
    const [, h1, m1, h2, m2] = /^(\d+)時(\d+)分から (\d+)時(\d+)分まで$/.exec(p.text);
    const e = (minutesOf(Number(h2), Number(m2)) - minutesOf(Number(h1), Number(m1)) + 720) % 720;
    assert.equal(Number(typed(p)), e, p.text);
    assert.ok(e >= 10 && e <= 50);
  }
});

test('hour hand moves with the minutes', () => {
  const at = (h, m) => { const [, x, y] = /class="clk-hh" x1="100" y1="100" x2="([\d.]+)" y2="([\d.]+)"/.exec(clockSvg(h, m)); return [Number(x), Number(y)]; };
  const ang = ([x, y]) => (((Math.atan2(x - 100, 100 - y) * 180) / Math.PI) + 360) % 360;
  assert.ok(Math.abs(ang(at(8, 40)) - 260) < 0.6);
  assert.ok(Math.abs(ang(at(12, 0)) - 0) < 0.6 || Math.abs(ang(at(12, 0)) - 360) < 0.6);
  assert.ok(Math.abs(ang(at(3, 0)) - 90) < 0.6);
});

// ---------------------------------------------------------------- hands version
const HANDS = ['g1-clock-hour', 'g1-clock-half', 'g2-clock-5', 'g2-clock-1', 'g2-clock-shift-pic', 'g3-clock-shift', 'g3-clock-shift2'];

test('hands version: same question as the number version, answer is the time on the hands', () => {
  for (const id of HANDS) {
    const a = makeRng(11); const b = makeRng(11);
    for (let i = 0; i < 150; i++) {
      const pad = makeProblem(id, a);
      const p = makeProblem(id, b, null, { hands: true });
      assert.equal(p.text, pad.text, `${id} same question`);
      assert.equal(typed(p), typed(pad), `${id} same answer digits`);
      assert.ok(p.hands, id);
      assert.equal(`${p.hands.h}${id.includes('hour') ? '' : p.hands.m}`, typed(p), id);
      assert.equal(p.hands.hd, String(p.hands.h).length);
      const dials = p.cells.filter((c) => c.kind === 'dial');
      assert.equal(dials.length, 1, id);
      assert.equal(dials[0].hand, true);
      const ids = p.cells.map((c) => c.id);
      assert.equal(new Set(ids).size, ids.length, `${id} duplicate ids`);
      for (const c of p.cells) assert.ok(c.c >= 0 && c.c + (c.cs || 1) <= p.cols && c.r >= 0 && c.r + (c.rs || 1) <= p.rows, `${id} cell inside grid`);
      for (const st of p.steps) if (st.help) for (const hid of st.help.ids) assert.ok(ids.includes(hid), `${id} help id`);
    }
  }
});

test('hands version: reading problems show the answer digits faintly, not the clock face', () => {
  const rng = makeRng(12);
  const p = makeProblem('g2-clock-5', rng, null, { hands: true });
  assert.deepEqual(p.cells.filter((c) => c.kind === 'input').map((c) => c.ghost), p.steps.map((s) => s.digit));
  assert.match(p.cells.find((c) => c.kind === 'dial').svg, /clk-min/);
  assert.equal(p.hands.sh, 12);
  assert.equal(p.hands.sm, 0);
});

test('hands version: the picture problem starts on the given hour, the plain one at 12', () => {
  const rng = makeRng(13);
  for (let i = 0; i < 50; i++) {
    const pic = makeProblem('g2-clock-shift-pic', rng, null, { hands: true });
    assert.equal(pic.hands.sh, Number(/^(\d+)時/.exec(pic.text)[1]));
    assert.match(pic.cells.find((c) => c.kind === 'dial').svg, /clk-arc/);
    const plain = makeProblem('g3-clock-shift', rng, null, { hands: true });
    assert.equal(plain.hands.sh, 12);
  }
});

test('answers that are minutes keep the number pad (no hands)', () => {
  const rng = makeRng(14);
  for (const id of ['g2-clock-next', 'g3-clock-elapsed']) assert.equal(makeProblem(id, rng, null, { hands: true }).hands, undefined);
});

test('handsDigits: right hands give the answer, wrong hands stop at the first wrong digit', () => {
  const rng = makeRng(15);
  for (const id of HANDS) {
    for (let i = 0; i < 100; i++) {
      const p = makeProblem(id, rng, null, { hands: true });
      const { h, m } = p.hands;
      assert.equal(handsDigits(p, h, m).join(''), typed(p), id);
      // wrong hour
      const badH = h === 12 ? 1 : h + 1;
      const w = handsDigits(p, badH, m);
      assert.ok(w.length >= 1 && w.length <= p.steps.length);
      assert.notEqual(w.join(''), typed(p).slice(0, w.length), `${id} last digit is wrong`);
      assert.equal(w.slice(0, -1).join(''), typed(p).slice(0, w.length - 1));
      // wrong minute
      const badM = (m + 5) % 60;
      const x = handsDigits(p, h, badM);
      assert.notEqual(x.join(''), typed(p).slice(0, x.length), `${id} minute off`);
    }
  }
});

test('handsDigits: continues from the step already done, and never returns a correct-looking wrong answer', () => {
  const rng = makeRng(16);
  const p = makeProblem('g3-clock-shift2', rng, null, { hands: true });
  const { h, m } = p.hands;
  const from = String(h).length;
  assert.equal(handsDigits(p, h, m, from).join(''), String(m));
  // hour already accepted, minute hand wrong
  const w = handsDigits(p, h, (m + 5) % 60, from);
  assert.ok(w.length >= 1 && w.length <= String(m).length);
  assert.notEqual(w.join(''), String(m).slice(0, w.length));
});

test('clockHands agrees with the drawn hands', () => {
  const { hour, minute } = clockHands(8, 40);
  const svg = clockSvg(8, 40);
  const hx = /class="clk-hh" x1="100" y1="100" x2="([\d.]+)"/.exec(svg)[1];
  assert.ok(Math.abs(Number(hx) - hour[0]) < 0.06);
  assert.ok(Math.abs(Number(/class="clk-mh" x1="100" y1="100" x2="([\d.]+)"/.exec(svg)[1]) - minute[0]) < 0.06);
});
