// The shipped edition is clock-only: no calculation skills, and nothing free for empty grades.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, CLOCK_ONLY } from '../app/js/skills.js';
import { gradePlan, levelPlan, emptyProgress, PLACEMENT } from '../app/js/session.js';
import { makeRng } from '../app/js/problems.js';
import { TROPHIES, trophyMetrics, evaluate } from '../app/js/trophies.js';

test('only the nine clock skills exist', () => {
  assert.equal(CLOCK_ONLY, true);
  assert.equal(SKILLS.length, 9);
  assert.ok(SKILLS.every((s) => s.id.includes('-clock-')));
  assert.equal(PLACEMENT.length, 9);
});

test('plans only ever pick clock skills', () => {
  const rng = makeRng(1);
  for (const g of [1, 2, 3]) {
    const plan = gradePlan(g, 10, rng);
    assert.ok(plan.basic.every((id) => id.includes('-clock-')), `grade ${g}`);
    for (let k = 0; k < 12; k++) assert.ok(plan.extra(k).includes('-clock-'));
  }
  const prog = emptyProgress();
  prog.placed = true;
  const plan = levelPlan(prog, 10, rng);
  assert.ok(plan.basic.every((id) => id.includes('-clock-')));
});

test('a fresh player earns no skill trophy for grades or lanes that have no skills', () => {
  const m = trophyMetrics({ prog: emptyProgress() });
  const state = { init: true, got: {} };
  const fresh = evaluate(state, m);
  for (const t of fresh) assert.doesNotMatch(t.id, /^(gradeDone|gradeStar3|laneDone|grade\d)/, t.id);
  assert.ok(TROPHIES.every((t) => !/^gradeDone-[456]$/.test(t.id)));
});
