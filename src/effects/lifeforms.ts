import { clamp, type Factory } from "../core";
import { createLifePoints, lifePosition, swimTransform, PERIOD } from "./lifeforms-model";

export const create: Factory = (canvas, initial, initialSeed) => {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw Error("Canvas 2D 不可用");
  let p = { ...initial };
  let seed = initialSeed, t = 0, w = 1, h = 1, dpr = 1;
  let points = createLifePoints(p, seed);
  let visible = 0, peak = 0;
  const rebuild = () => { points = createLifePoints(p, seed); t = 0; };
  const render = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#070d18";
    ctx.fillRect(0, 0, w, h);
    const scalar = Math.min(w / 4.4, h / 3.1);
    const transform = swimTransform(t, p);
    const cx = w / 2 + transform.x * scalar * 1.6;
    const cy = h * 0.47 + transform.y * scalar * 1.6;
    const c = Math.cos(transform.angle), s = Math.sin(transform.angle);
    const tile = Math.max(18, Math.floor(Math.min(w, h) / 14));
    const cols = Math.ceil(w / tile), rows = Math.ceil(h / tile);
    const occupancy = new Uint16Array(cols * rows);
    const perCell = Math.max(14, Math.ceil((p.count / (cols * rows)) * 3.2));
    visible = 0;
    let most = 0;
    ctx.fillStyle = "#c8edf0";
    const opacity = clamp(p.opacity / 100, 0.08, 1);
    ctx.globalAlpha = opacity * 0.75;
    const pointSize = Math.max(0.65, Math.min(1.6, w / 640));
    for (let i = 0; i < points.length; i++) {
      const sample = points[i];
      const local = lifePosition(sample, p, t);
      const x = cx + (local.x * c - local.y * s) * scalar;
      const y = cy + (local.x * s + local.y * c) * scalar;
      if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) continue;
      const cell = Math.min(rows - 1, Math.floor(y / tile)) * cols +
        Math.min(cols - 1, Math.floor(x / tile));
      if (occupancy[cell] >= perCell) continue;
      occupancy[cell]++;
      most = Math.max(most, occupancy[cell]);
      visible++;
      if (sample.bright > 0.91) {
        ctx.globalAlpha = opacity;
        ctx.fillRect(x, y, pointSize * 1.35, pointSize * 1.35);
        ctx.globalAlpha = opacity * 0.75;
      } else {
        ctx.fillRect(x, y, pointSize, pointSize);
      }
    }
    peak = most / perCell;
    ctx.globalAlpha = 1;
  };
  return {
    update(next) {
      const oldCount = p.count, oldShape = p.shape;
      p = { ...next };
      if (oldCount !== p.count || oldShape !== p.shape) rebuild();
    },
    step(dt) { t = (t + dt * clamp(p.speed / 50, 0, 2)) % PERIOD; },
    draw: render,
    resize(W, H, pixelRatio) {
      w = Math.max(1, W);
      h = Math.max(1, H);
      dpr = Math.min(1.5, Math.max(1, pixelRatio));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      render();
    },
    reset(nextSeed) { seed = nextSeed; rebuild(); },
    metrics() {
      return { items: visible, load: visible / Math.max(1, p.count), peak };
    },
    destroy() {
      points = [];
      visible = 0;
      ctx.clearRect(0, 0, w, h);
    },
  };
};
