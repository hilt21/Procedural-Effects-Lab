export type Params = Record<string, number>;
export type Control = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
};
export type Metrics = {
  items: number;
  load: number;
  peak: number;
  fps: number;
  time: number;
};
export interface Effect {
  update(p: Params): void;
  step(dt: number): void;
  draw(): void;
  resize(w: number, h: number, dpr: number): void;
  reset(seed: number): void;
  destroy(): void;
  metrics(): Partial<Metrics>;
}
export type Factory = (
  canvas: HTMLCanvasElement,
  p: Params,
  seed: number,
) => Effect;
export const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function reflect(sx: number, sy: number, axis: "x" | "y") {
  return axis === "x" ? [-sx, sy] : [sx, -sy];
}
// Length is reserved before growth. Fading does not release capacity until geometry is removed.
export class LengthBudget {
  cells: Float64Array;
  total = 0;
  constructor(
    public width: number,
    public height: number,
    public cell: number,
    public limit: number,
    public cap: number,
  ) {
    this.cells = new Float64Array(
      Math.ceil(width / cell) * Math.ceil(height / cell),
    );
  }
  contributions(x: number, y: number, x2: number, y2: number) {
    const dx = x2 - x,
      dy = y2 - y,
      length = Math.hypot(dx, dy),
      cols = Math.ceil(this.width / this.cell),
      rows = Math.ceil(this.height / this.cell),
      cuts = [0, 1],
      map = new Map<number, number>();
    if (dx !== 0)
      for (
        let k = Math.floor(Math.min(x, x2) / this.cell) + 1;
        k * this.cell < Math.max(x, x2);
        k++
      ) {
        const t = (k * this.cell - x) / dx;
        if (t > 0 && t < 1) cuts.push(t);
      }
    if (dy !== 0)
      for (
        let k = Math.floor(Math.min(y, y2) / this.cell) + 1;
        k * this.cell < Math.max(y, y2);
        k++
      ) {
        const t = (k * this.cell - y) / dy;
        if (t > 0 && t < 1) cuts.push(t);
      }
    cuts.sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const a = cuts[i - 1],
        b = cuts[i],
        mid = (a + b) / 2,
        c = clamp(Math.floor((x + dx * mid) / this.cell), 0, cols - 1),
        r = clamp(Math.floor((y + dy * mid) / this.cell), 0, rows - 1),
        key = r * cols + c;
      map.set(key, (map.get(key) || 0) + length * (b - a));
    }
    return map;
  }
  reserve(x: number, y: number, x2: number, y2: number) {
    const l = Math.hypot(x2 - x, y2 - y),
      m = this.contributions(x, y, x2, y2);
    if (
      this.total + l > this.limit + 1e-8 ||
      [...m].some(([k, v]) => this.cells[k] + v > this.cap + 1e-8)
    )
      return false;
    this.total += l;
    for (const [k, v] of m) this.cells[k] += v;
    return true;
  }
}
export function runEffect(
  effect: Effect,
  onMetrics: (m: Metrics) => void,
  initialPaused: boolean,
) {
  let id = 0,
    destroyed = false,
    paused = initialPaused,
    last = 0,
    acc = 0,
    sim = 0,
    frames = 0,
    period = 0;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const report = (fps: number) =>
    onMetrics({
      items: 0,
      load: 0,
      peak: 0,
      ...effect.metrics(),
      fps,
      time: sim,
    });
  const schedule = () => {
    if (!destroyed && !paused && !document.hidden && !id)
      id = requestAnimationFrame(frame);
  };
  const frame = (now: number) => {
    id = 0;
    if (destroyed || paused || document.hidden) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    acc += dt;
    let count = 0;
    while (acc >= 1 / 60 && count++ < 6) {
      effect.step(1 / 60);
      sim += 1 / 60;
      acc -= 1 / 60;
    }
    effect.draw();
    frames++;
    period += dt;
    if (period >= 0.5) {
      report(Math.round(frames / period));
      period = 0;
      frames = 0;
    }
    schedule();
  };
  const stop = () => {
    cancelAnimationFrame(id);
    id = 0;
    last = 0;
    acc = 0;
    period = 0;
    frames = 0;
  };
  const visibility = () => {
    stop();
    if (document.hidden) report(0);
    else schedule();
  };
  const reduced = () => {
    if (motion.matches) {
      paused = true;
      stop();
      report(0);
    }
  };
  document.addEventListener("visibilitychange", visibility);
  motion.addEventListener("change", reduced);
  effect.draw();
  report(0);
  schedule();
  return {
    pause(v: boolean) {
      paused = v;
      stop();
      if (v) {
        effect.draw();
        report(0);
      } else schedule();
    },
    restart() {
      sim = 0;
      stop();
      effect.draw();
      report(0);
      schedule();
    },
    destroy() {
      destroyed = true;
      stop();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", reduced);
      effect.destroy();
    },
  };
}
