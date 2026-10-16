import { rng, type Factory } from "../core";
export const create: Factory = (canvas, initial, initialSeed) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Canvas 2D 不可用");
  let p = { ...initial },
    seed = initialSeed,
    random = rng(seed),
    w = 1,
    h = 1,
    t = 0,
    particles: { x: number; y: number }[] = [],
    peak = 0;
  const reset = () => {
    random = rng(seed);
    t = 0;
    const cols = Math.ceil(w / 40),
      rows = Math.ceil(h / 40),
      grid = new Uint16Array(cols * rows),
      cap = Math.max(8, Math.ceil((p.count / (cols * rows)) * 3));
    particles = [];
    for (let i = 0; i < p.count; i++) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const x = random() * w,
          y = random() * h,
          k =
            Math.min(rows - 1, Math.floor(y / 40)) * cols +
            Math.min(cols - 1, Math.floor(x / 40));
        if (grid[k] < cap) {
          grid[k]++;
          particles.push({ x, y });
          break;
        }
      }
    }
    peak = Math.max(...grid) / cap;
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#b3cfff";
    for (const a of particles) ctx.fillRect(a.x, a.y, 1, 1);
  };
  return {
    update(n) {
      const count = n.count !== p.count;
      p = { ...n };
      if (count) reset();
    },
    reset(s) {
      seed = s;
      reset();
    },
    resize(W, H, dpr) {
      w = W;
      h = H;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      reset();
    },
    step(dt) {
      t += dt;
      ctx.fillStyle = `rgba(11,16,32,${0.015 + (100 - p.trail) / 400})`;
      ctx.fillRect(0, 0, w, h);
      const cell = 40,
        cols = Math.ceil(w / cell),
        rows = Math.ceil(h / cell),
        grid = new Uint16Array(cols * rows),
        cap = Math.max(8, Math.ceil((p.count / (cols * rows)) * 3));
      const key = (x: number, y: number) =>
        Math.min(rows - 1, Math.floor(y / cell)) * cols +
        Math.min(cols - 1, Math.floor(x / cell));
      for (const a of particles) grid[key(a.x, a.y)]++;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const a of particles) {
        const x = (a.x / w) * p.scale,
          y = (a.y / h) * p.scale,
          angle =
            (Math.sin(x * 2 + t * 0.1) +
              Math.cos(y * 2 - t * 0.07) +
              Math.sin(x + y)) *
            p.curl;
        const nx = (a.x + Math.cos(angle) * p.speed * dt + w) % w,
          ny = (a.y + Math.sin(angle) * p.speed * dt + h) % h,
          k = key(nx, ny),
          old = key(a.x, a.y);
        if (k !== old && grid[k] >= cap) continue;
        grid[old]--;
        grid[k]++;
        if (Math.abs(nx - a.x) < w / 2 && Math.abs(ny - a.y) < h / 2) {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(nx, ny);
        }
        a.x = nx;
        a.y = ny;
      }
      ctx.strokeStyle = `hsla(${214 + Math.sin(t * 0.1) * 30},70%,75%,.65)`;
      ctx.stroke();
      peak = Math.max(...grid) / cap;
    },
    draw() {},
    metrics() {
      return { items: particles.length, load: particles.length / 1000, peak };
    },
    destroy() {
      particles = [];
      ctx.clearRect(0, 0, w, h);
    },
  };
};
