import { clamp, rng, type Params } from "../core";

export type LifePoint = {
  u: number;
  v: number;
  strand: number;
  phase: number;
  group: number;
  bright: number;
};

export type MorphologyCandidate = {
  seed: number;
  params: Params;
  score: number;
  ratio: number;
};

export const PERIOD = 12;
const TAU = Math.PI * 2;
export const shapeNames = ["水母·干涉", "海葵", "鱼", "游丝", "干涉", "折叠"] as const;

export function createLifePoints(params: Params, seed: number): LifePoint[] {
  const random = rng(seed);
  const points: LifePoint[] = [];
  for (let i = 0; i < params.count; i++) {
    const u = random();
    const v = random();
    const strand = Math.floor(random() * 42);
    const phase = random() * TAU;
    const bright = random();
    // The group selects a piece of a modular, independently authored morphology.
    const lottery = random();
    const shape = Math.round(params.shape);
    const group = shape === 0
      ? lottery < 0.49 ? 0 : lottery < 0.89 ? 1 : 2
      : shape === 1
        ? lottery < 0.74 ? 1 : lottery < 0.89 ? 0 : 2
        : lottery < 0.71 ? 0 : lottery < 0.89 ? 1 : 2;
    points.push({ u, v, strand, phase, group, bright });
  }
  return points;
}

export function lifePosition(
  point: LifePoint,
  params: Params,
  seconds: number,
): { x: number; y: number } {
  const { u, v, strand, phase, group } = point;
  const a = seconds * TAU / PERIOD;
  const pulse = params.pulse / 100;
  const sway = params.sway / 100;
  const s = Math.round(params.shape);
  const width = params.spread;
  const length = params.length;
  const strandPhase = strand * 0.71 + phase * 0.12;
  if (s === 0) {
    // Jelly bell, suspended filaments and oral folds.
    const beat = 1 + 0.16 * pulse * Math.cos(a * 3);
    if (group === 0) {
      const x = (u * 2 - 1) * width * beat;
      const curvature = Math.sqrt(Math.max(0, 1 - Math.pow(x / (width * beat), 2)));
      return {
        x,
        y: -0.17 - 0.52 * curvature * (0.18 + 0.82 * v) +
          0.055 * pulse * Math.sin(a * 3),
      };
    }
    if (group === 1) {
      const root = Math.sin(strand * 2.39996) * 0.82 * width;
      const q = v * length;
      return {
        x: root * (1 - 0.18 * q) +
          0.2 * sway * q * q * Math.sin(a * 2 - q * 2.2 + strandPhase),
        y: -0.1 + 1.03 * q +
          0.05 * pulse * Math.cos(a * 3 - q * 1.3),
      };
    }
    const angle = u * TAU * 2.1 + strandPhase * 0.06;
    return {
      x: width * (0.08 + 0.38 * v) * Math.cos(angle),
      y: -0.03 + v * 0.56 * length +
        0.06 * sway * Math.sin(angle + a * 2),
    };
  }
  if (s === 1) {
    // Anemone: many waving filaments emerging from a compact anchor.
    if (group === 1) {
      const root = Math.sin(strand * 2.39996) * width * 0.6;
      const q = v * length;
      return {
        x: root + q * 0.45 * width * Math.sin(strandPhase) +
          0.28 * sway * q * q * Math.sin(a * 2 + strandPhase - 1.8 * q),
        y: 0.64 - 1.29 * q +
          0.07 * Math.cos(strandPhase * 3 + q * 6),
      };
    }
    if (group === 0)
      return { x: (u * 2 - 1) * width * 0.58, y: 0.53 + v * 0.16 };
    const angle = u * TAU;
    return {
      x: Math.cos(angle) * width * 0.3 * v,
      y: 0.42 - v * 0.35 + 0.03 * Math.sin(a * 2),
    };
  }
  // Fish: tapered body, traveling lateral wave, tail and fin rays.
  const x = u * 2 - 1;
  const wave = 0.12 * sway * Math.pow((x + 1) / 2, 2) *
    Math.sin(a * 3 - x * 3.2 + phase * 0.08);
  if (group === 0) {
    const envelope = Math.pow(Math.max(0, 1 - x * x), 0.62);
    return {
      x: x * width,
      y: (v * 2 - 1) * 0.4 * envelope * length + wave,
    };
  }
  if (group === 1) {
    const q = v;
    return {
      x: (-0.89 - q * 0.38) * width,
      y: (u * 2 - 1) * (0.08 + q * 0.42) * length +
        0.19 * sway * Math.sin(a * 3 + phase * 0.1),
    };
  }
  return {
    x: (u * 1.3 - 0.52) * width,
    y: (v * 0.36 + 0.22) * length +
      0.06 * sway * Math.sin(a * 3 - u * 2),
  };
}

export function swimTransform(seconds: number, params: Params) {
  const a = seconds * TAU / PERIOD;
  const drift = params.drift / 100;
  return {
    x: drift * 0.18 * Math.sin(a),
    y: drift * 0.1 * Math.sin(a * 2),
    angle: 0.10 * drift * Math.sin(a + 0.5),
  };
}

export function estimateShapeRatio(params: Params) {
  const shape = Math.round(params.shape);
  if (shape === 0) return (1.85 * params.spread) / (0.7 + 1.0 * params.length);
  if (shape === 1) return (1.35 * params.spread) / (0.4 + 1.4 * params.length);
  if (shape === 2) return (2.45 * params.spread) / (0.85 * params.length);
  if (shape === 4) return 0.8 * params.spread / params.length;
  if (shape === 5) return 1.5 * params.spread / params.length;
  return (1.75 * params.spread) / (2.5 * params.length);
}

export function exploreMorphologies(
  params: Params, seed: number, desiredRatio?: number,
  count = 6,
): MorphologyCandidate[] {
  const random = rng(seed);
  const pool: MorphologyCandidate[] = [];
  const target = desiredRatio ?? estimateShapeRatio(params);
  for (let i = 0; i < 140; i++) {
    const next = {
      ...params,
      spread: Math.round(clamp(params.spread * (0.68 + 0.72 * random()), 0.5, 1.7) * 20) / 20,
      length: Math.round(clamp(params.length * (0.65 + 0.75 * random()), 0.5, 1.7) * 20) / 20,
      sway: Math.round(clamp(params.sway + (random() - 0.5) * 70, 0, 100)),
      pulse: Math.round(clamp(params.pulse + (random() - 0.5) * 70, 0, 100)),
    };
    const ratio = estimateShapeRatio(next);
    const fitness = Math.exp(-1.75 * Math.abs(Math.log(ratio / target)));
    const motion = 0.1 * (next.sway / 100 + next.pulse / 100);
    pool.push({ params: next, seed: (seed + i * 2654435761) >>> 0,
      ratio, score: fitness * 0.88 + motion * 0.12 });
  }
  // Quality-diversity selection: prefer close silhouettes but avoid near-duplicates.
  const chosen: MorphologyCandidate[] = [];
  while (chosen.length < count && pool.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const diversity = chosen.length ? Math.min(...chosen.map((prior) =>
        Math.abs(candidate.params.spread - prior.params.spread) / 1.2 +
        Math.abs(candidate.params.length - prior.params.length) / 1.2 +
        Math.abs(candidate.params.sway - prior.params.sway) / 100
      )) : 1;
      const total = candidate.score + Math.min(diversity, 0.5) * 0.35;
      if (total > bestScore) { bestScore = total; bestIndex = i; }
    }
    chosen.push(pool.splice(bestIndex, 1)[0]);
  }
  return chosen;
}

export function measureReferenceSilhouette(
  pixels: Uint8ClampedArray, width: number, height: number,
) {
  if (width < 2 || height < 2) throw Error("参考图片尺寸无效");
  const border = [0, (width - 1) * 4, (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4];
  const bg = [0, 1, 2].map((c) =>
    border.reduce((sum, i) => sum + pixels[i + c], 0) / border.length);
  let minX = width, minY = height, maxX = -1, maxY = -1, found = 0;
  const step = Math.max(1, Math.floor(Math.max(width, height) / 350));
  const alphaBackground = border.every((i) => pixels[i + 3] < 16);
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4;
    const distance = Math.hypot(
      pixels[i] - bg[0], pixels[i + 1] - bg[1], pixels[i + 2] - bg[2]);
    const foreground = alphaBackground ? pixels[i + 3] > 64 :
      pixels[i + 3] > 64 && distance > 58;
    if (!foreground) continue;
    found++;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (found < 25 || found * step * step > width * height * 0.87)
    throw Error("未能可靠提取主体轮廓，请使用背景干净的动物图片");
  return clamp((maxX - minX + step) / (maxY - minY + step), 0.35, 3.2);
}
