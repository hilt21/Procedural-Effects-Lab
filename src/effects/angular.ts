import { clamp, rng, reflect, LengthBudget, type Factory } from "../core";
type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  finished: number | null;
};
type Ray = {
  x: number;
  y: number;
  sx: number;
  sy: number;
  axis: "x" | "y";
  forward: number;
  left: number;
  wall: "x" | "y" | null;
  segments: Segment[];
  bounces: number;
  active: boolean;
  limit: number;
};
export const create: Factory = (canvas, initial, initialSeed) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Canvas 2D 不可用");
  let p = { ...initial },
    seed = initialSeed,
    random = rng(seed),
    w = 1,
    h = 1,
    t = 0,
    rays: Ray[] = [],
    spawn = 0,
    index = 0,
    origin = { x: 0.5, y: 0.5 };
  let budget = new LengthBudget(1, 1, 80, 1, 200);
  const point = () => ({ x: origin.x * w, y: origin.y * h });
  const rebuild = () => {
    budget = new LengthBudget(
      w,
      h,
      80,
      Math.hypot(w, h) * (0.67 + (3.2 * p.density) / 100),
      80 * (1.12 + (3.5 * p.density) / 100),
    );
    for (const r of rays)
      for (const s of r.segments) {
        const l = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        budget.total += l;
        for (const [k, v] of budget.contributions(s.x1, s.y1, s.x2, s.y2))
          budget.cells[k] += v;
      }
  };
  const reset = () => {
    random = rng(seed);
    t = 0;
    rays = [];
    spawn = 0;
    index = 0;
    rebuild();
  };
  const plan = (r: Ray, forced = false) => {
    if (r.segments.length >= r.limit) return false;
    if (!forced && random() * 100 < p.bend) {
      if (r.axis === "x") r.sy *= -1;
      else r.sx *= -1;
    }
    const vx = r.sx * Math.SQRT1_2,
      vy = r.sy * Math.SQRT1_2,
      bx = vx > 0 ? (w - 6 - r.x) / vx : (6 - r.x) / vx,
      by = vy > 0 ? (h - 6 - r.y) / vy : (6 - r.y) / vy,
      L = (50 + random() * 95) * clamp(Math.hypot(w, h) / 1100, 0.7, 1.3),
      distance = Math.min(bx, by);
    r.left = Math.max(0, Math.min(L, distance));
    r.wall = distance <= L ? (bx < by ? "x" : "y") : null;
    if (r.left < 0.01) return false;
    r.segments.push({ x1: r.x, y1: r.y, x2: r.x, y2: r.y, finished: null });
    return true;
  };
  const newRay = () => {
    if (rays.length >= p.maxTrails) return;
    const dir = index++ % 4,
      axis = dir % 2 === 0 ? "x" : "y",
      forward = dir < 2 ? 1 : -1,
      o = point(),
      a = random() * Math.PI * 2;
    const r: Ray = {
      x: clamp(o.x + Math.cos(a) * 22, 7, w - 7),
      y: clamp(o.y + Math.sin(a) * 22, 7, h - 7),
      sx: axis === "x" ? forward : random() < 0.5 ? 1 : -1,
      sy: axis === "y" ? forward : random() < 0.5 ? 1 : -1,
      axis,
      forward,
      left: 0,
      wall: null,
      segments: [],
      bounces: 0,
      active: true,
      limit: 5 + Math.floor(random() * 7),
    };
    if (plan(r, true)) rays.push(r);
  };
  const pointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    origin = {
      x: clamp((e.clientX - rect.left) / rect.width, 0.04, 0.96),
      y: clamp((e.clientY - rect.top) / rect.height, 0.05, 0.95),
    };
    reset();
  };
  canvas.addEventListener("pointerdown", pointer);
  return {
    update(next) {
      const changed =
        next.density !== p.density || next.maxTrails !== p.maxTrails;
      p = { ...next };
      if (changed) reset();
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
      for (const r of rays)
        r.segments = r.segments.filter(
          (s) => s.finished === null || t - s.finished < p.tail,
        );
      rays = rays.filter((r) => r.active || r.segments.length);
      rebuild();
      spawn += dt * (1.5 + p.density * 0.088);
      while (spawn >= 1) {
        spawn--;
        newRay();
      }
      for (const r of rays) {
        if (!r.active) continue;
        let remaining = p.speed * dt;
        for (
          let guard = 0;
          remaining > 0.0001 && r.active && guard < 8;
          guard++
        ) {
          const s = r.segments.at(-1)!;
          const n = Math.min(remaining, r.left),
            x = r.x + r.sx * Math.SQRT1_2 * n,
            y = r.y + r.sy * Math.SQRT1_2 * n;
          if (!budget.reserve(r.x, r.y, x, y)) {
            s.finished = t;
            r.active = false;
            break;
          }
          r.x = x;
          r.y = y;
          s.x2 = x;
          s.y2 = y;
          r.left -= n;
          remaining -= n;
          if (r.left < 0.0001) {
            s.finished = t;
            let forced = false;
            if (r.wall) {
              if (r.bounces >= p.reflections) {
                r.active = false;
                break;
              }
              [r.sx, r.sy] = reflect(r.sx, r.sy, r.wall);
              if (r.axis === r.wall) r.forward *= -1;
              r.bounces++;
              forced = true;
            }
            if (!plan(r, forced)) r.active = false;
          }
        }
      }
    },
    draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0a1119";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#1a2733";
      ctx.lineWidth = 0.6;
      for (let x = 0; x < w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const r of rays) {
        for (const s of r.segments) {
          const a =
            s.finished === null
              ? 1
              : Math.pow(Math.max(0, 1 - (t - s.finished) / p.tail), 1.65);
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.lineWidth = 3 + p.glow / 12;
          ctx.strokeStyle = `rgba(240,174,50,${(a * 0.13 * p.glow) / 100})`;
          ctx.stroke();
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = `rgba(255,188,78,${a * 0.5})`;
          ctx.stroke();
          ctx.lineWidth = 0.9;
          ctx.strokeStyle = `rgba(255,240,190,${a})`;
          ctx.stroke();
        }
        if (r.active) {
          const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 18);
          g.addColorStop(0, "#fff0c4");
          g.addColorStop(0.12, "#edc77988");
          g.addColorStop(1, "#edc77900");
          ctx.fillStyle = g;
          ctx.fillRect(r.x - 18, r.y - 18, 36, 36);
        }
      }
      const o = point(),
        g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 85);
      g.addColorStop(0, "#edc77926");
      g.addColorStop(1, "#edc77900");
      ctx.fillStyle = g;
      ctx.fillRect(o.x - 85, o.y - 85, 170, 170);
      ctx.translate(o.x, o.y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = "#edc779";
      ctx.lineWidth = 1;
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.strokeStyle = "#edc77955";
      ctx.strokeRect(-20, -20, 40, 40);
      ctx.fillStyle = "#fff0c4";
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    },
    metrics() {
      return {
        items: rays.length,
        load: budget.total / budget.limit,
        peak: Math.max(0, ...budget.cells) / budget.cap,
      };
    },
    destroy() {
      canvas.removeEventListener("pointerdown", pointer);
      rays = [];
      ctx.clearRect(0, 0, w, h);
    },
  };
};
