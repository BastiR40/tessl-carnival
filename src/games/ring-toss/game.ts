import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, the aim sways left and right of the pointer. */
export const SWAY = 24;
/** Seconds for the aim to sway there and back. */
export const SWAY_PERIOD = 1.6;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
/** Back row first: bottles further back are smaller and score more. */
export const ROWS = [
  { y: 130, points: 30, neckRadius: 9, scale: 0.7 },
  { y: 200, points: 20, neckRadius: 11, scale: 0.85 },
  { y: 270, points: 10, neckRadius: 13, scale: 1 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  /** Where the neck is: a ring landing near here scores. */
  x: number;
  y: number;
  neckRadius: number;
  points: number;
  scale: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface LandedRing {
  x: number;
  y: number;
  scored: boolean;
}

export interface RingTossState {
  bottles: Bottle[];
  /** The ring in the air, if any. Only one flies at a time. */
  ring: Ring | null;
  landed: LandedRing[];
  rings: number;
  score: number;
  /** Seconds since the round started, which drives the sway. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 110;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      neckRadius: row.neckRadius,
      points: row.points,
      scale: row.scale,
    })),
  );
  return {
    bottles,
    ring: null,
    landed: [],
    rings: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** How far the aim is pushed sideways at `time` seconds. */
export function swayAt(time: number): number {
  return SWAY * Math.sin((time / SWAY_PERIOD) * Math.PI * 2);
}

/** The bottle whose neck a ring landing at (x, y) goes over, if any. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= b.neckRadius);
}

/**
 * Throws one ring at the aim point, pushed sideways by the sway. Returns false
 * if nothing was thrown: the round is over, no rings are left, or a ring is
 * still in the air.
 */
export function throwRing(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.ring) return false;
  state.ring = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + swayAt(state.time),
    toY: Math.min(aimY, THROWER.y - 1),
    age: 0,
  };
  state.rings -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  if (state.phase !== 'playing') return;
  state.time += dt;

  const ring = state.ring;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
      if (bottle) state.score += bottle.points;
      state.landed.push({
        x: bottle?.x ?? ring.toX,
        y: bottle?.y ?? ring.toY,
        scored: bottle !== undefined,
      });
      state.ring = null;
    }
  }

  if (state.rings === 0 && !state.ring) state.phase = 'over';
}

/** Where a ring in the air is drawn: along its path, lifted into an arc. */
function ringPosition(ring: Ring) {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 120,
  };
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Shelves, one under each row of bottles.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(60, row.y + 48 * row.scale, WIDTH - 120, 8);
  }

  for (const bottle of state.bottles) {
    const s = bottle.scale;
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 14 * s, bottle.y + 14 * s, 28 * s, 34 * s);
    ctx.fillRect(bottle.x - 5 * s, bottle.y, 10 * s, 16 * s);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 6 * s, bottle.y - 4 * s, 12 * s, 5 * s);
    ctx.fillStyle = colors.muted;
    ctx.font = canvasFont('small');
    ctx.textAlign = 'center';
    ctx.fillText(String(bottle.points), bottle.x, bottle.y + 38 * s);
  }

  for (const landed of state.landed) {
    drawRing(ctx, landed.x, landed.y + 6, landed.scored ? colors.accent : colors.muted);
  }

  if (state.ring) {
    const { x, y } = ringPosition(state.ring);
    drawRing(ctx, x, y, colors.accent);
  }

  // The aim marker, swaying with the throw.
  if (state.phase === 'playing') {
    const x = aim.x + swayAt(state.time);
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, aim.y);
    ctx.lineTo(x + 10, aim.y);
    ctx.moveTo(x, aim.y - 10);
    ctx.lineTo(x, aim.y + 10);
    ctx.stroke();
  }

  if (!state.ring && state.rings > 0) {
    drawRing(ctx, THROWER.x, THROWER.y, colors.accent);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwRing(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
