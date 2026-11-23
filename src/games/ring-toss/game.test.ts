import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  RINGS_PER_ROUND,
  ROWS,
  SWAY,
  SWAY_PERIOD,
  bottleAt,
  createState,
  step,
  swayAt,
  throwRing,
} from './game';

/** Throws at (x, y) with no sway, and lets the ring land. */
function throwAndLand(state: ReturnType<typeof createState>, x: number, y: number) {
  state.time = 0;
  expect(throwRing(state, x, y)).toBe(true);
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with every ring and no score', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.ring).toBeNull();
    expect(state.phase).toBe('playing');
  });

  it('stands a grid of bottles, one row per points value', () => {
    const state = createState();
    for (const row of ROWS) {
      expect(state.bottles.filter((b) => b.y === row.y).length).toBeGreaterThan(1);
    }
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400, 200)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.ring).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    throwRing(state, 400, 200);
    expect(throwRing(state, 400, 200)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(throwRing(state, 400, 200)).toBe(false);
    expect(state.ring).toBeNull();
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwAndLand(state, bottle.x, bottle.y);
    expect(state.score).toBe(bottle.points);
    expect(state.ring).toBeNull();
    expect(state.landed).toEqual([{ x: bottle.x, y: bottle.y, scored: true }]);
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    throwAndLand(state, 10, 60);
    expect(state.score).toBe(0);
    expect(state.landed[0].scored).toBe(false);
  });

  it('keeps the ring in the air until it lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwRing(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.ring).not.toBeNull();
    expect(state.score).toBe(0);
  });

  it('scores bottles further back higher', () => {
    const points = ROWS.map((row) => row.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
    const back = createState().bottles.find((b) => b.y === ROWS[0].y)!;
    const front = createState().bottles.find((b) => b.y === ROWS[ROWS.length - 1].y)!;
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('pushes the throw sideways by the sway', () => {
    const state = createState();
    state.time = SWAY_PERIOD / 4;
    throwRing(state, 400, 200);
    expect(state.ring!.toX).toBeCloseTo(400 + SWAY);
    expect(swayAt(0)).toBe(0);
  });

  it('finds a bottle only within its neck', () => {
    const { bottles } = createState();
    const bottle = bottles[0];
    expect(bottleAt(bottles, bottle.x + bottle.neckRadius - 1, bottle.y)).toBe(bottle);
    expect(bottleAt(bottles, bottle.x + bottle.neckRadius + 1, bottle.y)).toBeUndefined();
  });

  it('ends the round when the last ring has landed', () => {
    const state = createState();
    state.rings = 1;
    throwRing(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });

  it('adds up a round of throws', () => {
    const state = createState();
    const back = state.bottles.find((b) => b.y === ROWS[0].y)!;
    const front = state.bottles.find((b) => b.y === ROWS[2].y)!;
    throwAndLand(state, back.x, back.y);
    throwAndLand(state, front.x, front.y);
    expect(state.score).toBe(ROWS[0].points + ROWS[2].points);
    while (state.rings > 0) throwAndLand(state, 10, 60);
    expect(state.phase).toBe('over');
    expect(state.score).toBe(ROWS[0].points + ROWS[2].points);
  });
});
