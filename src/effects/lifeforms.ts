import { clamp, type Factory } from "../core";
import { sampleLifeform, LIFEFORM_PERIOD } from "./lifeforms-geometry";
import { isInterferenceShape, paintInterference } from "./lifeforms-interference";
import { jellyfishFieldPoint } from "./lifeforms-jellyfish-field";

type Dot = { x: number; y: number; alpha: number; radius: number };

export const create: Factory = (canvas, initial, initialSeed) => {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw Error("Canvas 2D 不可用");
  let p = { ...initial };
  let seed = initialSeed, t = 0, w = 1, h = 1, dpr = 1;
  let visible = 0, densityPeak = 0;
  let dynamicCap = 26000, renderCost = 0, renderFrames = 0;
  const bucket: Dot[][] = [[], [], [], [], [], []];
  const palette = ["#a8bec2", "#bed1d3", "#d4dfe1", "#e0e8e9", "#ecf2f2", "#f8ffff"];
  const TAU = Math.PI * 2;
  const render = () => {
    const start = performance.now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, w, h);
    const count = Math.min(Math.round(p.count), Math.round(dynamicCap));
    if (p.shape === 0 || isInterferenceShape(p.shape)) {
      const m = paintInterference(ctx, p, seed, t, w, h, count,
        p.shape === 0 ? jellyfishFieldPoint : undefined);
      visible = m.visible;
      densityPeak = m.peak;
      renderCost += performance.now() - start;
      renderFrames++;
      if (renderFrames >= 12) {
        const ms = renderCost / renderFrames;
        const limit = Math.min(p.count, w < 520 ? 18000 : 50000);
        const factor = ms > 33 ? 0.82 : ms < 18 ? 1.08 : 1;
        dynamicCap = clamp(Math.round(dynamicCap * factor), Math.min(8000, limit), limit);
        renderCost = 0;
        renderFrames = 0;
      }
      return;
    }
    const scale = Math.min(w / 3.5, h / (Math.round(p.shape) === 2 ? 2.75 : 3.15));
    const angle = t * TAU / LIFEFORM_PERIOD, drift = p.drift / 100;
    const centerX = w * 0.5 + 0.16 * drift * scale * Math.sin(angle);
    const centerY = h * 0.48 + 0.095 * drift * scale * Math.sin(angle * 2);
    const tile = Math.max(22, Math.floor(Math.min(w, h) / 13));
    const cols = Math.ceil(w / tile), rows = Math.ceil(h / tile);
    const cells = new Uint16Array(cols * rows);
    const cellMax = Math.max(125, Math.ceil(count / (cols * rows) * 6));
    bucket.forEach((list) => { list.length = 0; });
    visible = 0;
    let maxCell = 0;
    for (let i = 0; i < count; i++) {
      const sampleIndex = p.count === count ? i : Math.floor(i * (p.count - 1) / Math.max(1, count - 1));
      const dot = sampleLifeform(sampleIndex, Math.round(p.count), p, t, seed);
      const depth = clamp((dot.z + 1.15) / 2.3, 0, 1);
      const parallax = 1 + dot.z * 0.10;
      const x = centerX + dot.x * scale * parallax;
      const y = centerY + dot.y * scale * parallax;
      if (x < 3 || x >= w - 3 || y < 3 || y >= h - 3) continue;
      const cell = Math.min(rows - 1, Math.floor(y / tile)) * cols +
        Math.min(cols - 1, Math.floor(x / tile));
      if (cells[cell] >= cellMax) continue;
      cells[cell]++;
      maxCell = Math.max(maxCell, cells[cell]);
      visible++;
      const texture = 0.7 + 0.3 * Math.sin(i * 0.37 + seed * 0.000017);
      const groupBias = dot.group === 0 ? 0.82 : dot.group === 1 ? 0.65 : 0.9;
      const alpha = (0.17 + depth * 0.53) * (p.opacity / 100) * groupBias * texture;
      const b = Math.min(5, Math.floor(depth * 5.99));
      bucket[b].push({ x, y, alpha, radius: dot.group === 2 ? 0.84 : 0.78 });
    }
    densityPeak = maxCell / cellMax;
    for (let band = 0; band < bucket.length; band++) {
      ctx.fillStyle = palette[band];
      for (const dot of bucket[band]) {
        ctx.globalAlpha = dot.alpha;
        ctx.fillRect(dot.x, dot.y, dot.radius, dot.radius);
      }
    }
    ctx.globalAlpha = 1;
    renderCost += performance.now() - start;
    renderFrames++;
    if (renderFrames >= 12) {
      const ms = renderCost / renderFrames;
      const factor = ms > 33 ? 0.85 : ms < 18 ? 1.08 : 1;
      const ceiling = Math.min(p.count, w < 520 ? 18000 : 50000);
      dynamicCap = clamp(Math.round(dynamicCap * factor), Math.min(8000, ceiling), ceiling);
      renderCost = 0;
      renderFrames = 0;
    }
  };
  return {
    update(next) {
      const mustRebuild = next.shape !== p.shape || next.count !== p.count;
      p = { ...next };
      if (mustRebuild) t = 0;
    },
    step(dt) { t = (t + dt * clamp(p.speed / 50, 0, 2)) % LIFEFORM_PERIOD; },
    draw: render,
    resize(W, H, pixelRatio) {
      w = Math.max(1, W);
      h = Math.max(1, H);
      dynamicCap = w < 520 ? 14000 : 26000;
      renderCost = 0;
      renderFrames = 0;
      dpr = Math.min(1.5, Math.max(1, pixelRatio));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      render();
    },
    reset(nextSeed) { seed = nextSeed; t = 0; },
    metrics() {
      return { items: visible, load: visible / Math.max(1, Math.min(p.count, dynamicCap)),
        peak: densityPeak };
    },
    destroy() {
      bucket.forEach((list) => { list.length = 0; });
      visible = 0;
      ctx.clearRect(0, 0, w, h);
    },
  };
};
