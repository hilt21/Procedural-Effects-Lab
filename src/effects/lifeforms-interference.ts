import { clamp, type Params } from "../core";
import { LIFEFORM_PERIOD } from "./lifeforms-geometry";

const TAU = Math.PI * 2;
export const isInterferenceShape = (shape: number) => Math.round(shape) >= 4;

/**
 * A new, independent index-space parametric drawing. The continuous index
 * domain remains fixed even when the display sample count is reduced.
 * Layers of incommensurate spatial frequencies fold into moiré-like surfaces.
 *
 * Reference reading: @yuruyurau's publicly discussed index-to-point method.
 * This implementation uses its own equations and coefficients.
 */
export function interferencePoint(
  index: number, count: number, params: Params, seconds: number, seed: number,
) {
  const u = clamp(index / Math.max(1, count - 1), 0, 1);
  const i = u * 36000;
  const t = (seconds / LIFEFORM_PERIOD) * TAU;
  const genome = ((seed % 997) / 997 - 0.5);
  const axial = (u - 0.51) * 23;
  const pulse = params.pulse / 65;
  const sway = params.sway / 75;
  const harmonic =
    (6.6 + 1.3 * pulse * Math.sin(u * 13 + 3 * t)) *
      Math.cos(i / 46 + genome * 0.2) +
    1.45 * sway * Math.sin(i / 107 - t + genome * 0.24);
  const distance = Math.hypot(harmonic * 0.9, axial);
  let x: number, y: number;
  if (Math.round(params.shape) === 5) {
    // Folded membrane: a continuous distance envelope, distorted by
    // a travelling short wave, and a second spatial-frequency interference.
    const shell = 0.85 + distance * distance / 105;
    const fold = Math.sin(
      1.25 * shell * shell - 2 * t +
      0.4 * Math.sin(axial) + 0.7 * Math.cos(t),
    );
    const sideways =
      (4 * harmonic) / shell +
      0.86 * axial * Math.sin(0.92 * harmonic + 0.15 * Math.sin(t)) +
      (harmonic / (shell * shell)) * (13 + 5 * shell * fold);
    x = 200 + sideways;
    y = 58 + 72 * shell +
      13 * Math.sin(1.9 * shell - 2 * t) +
      0.6 * harmonic * Math.sin(0.4 * axial + t);
  } else {
    // Interfering polar ribbons: an axial/radial coordinate warp followed by
    // two distinct, fully periodic angular offsets.
    const radius =
      81 + 1.8 * harmonic * axial +
      12 * Math.sin(distance * 0.8 - 2 * t + 0.3 * Math.sin(axial)) +
      16 * Math.cos(harmonic * 0.3 + t);
    const angle =
      Math.atan2(axial, harmonic) +
      0.85 * Math.sin(distance * 0.25 - t) +
      0.14 * Math.sin(axial / 3 + t);
    x = 200 + radius * Math.cos(angle);
    y = 200 + 0.83 * radius * Math.sin(angle);
  }
  return {
    x: 200 + (x - 200) * params.spread,
    y: 200 + (y - 200) * params.length,
  };
}

export function paintInterference(
  ctx: CanvasRenderingContext2D,
  params: Params,
  seed: number,
  seconds: number,
  width: number,
  height: number,
  budget: number,
) {
  const scale = 0.91 * Math.min(width, height) / 400;
  const phase = TAU * seconds / LIFEFORM_PERIOD;
  const dx = (params.drift / 100) * scale * 26 * Math.sin(phase);
  const dy = (params.drift / 100) * scale * 15 * Math.sin(2 * phase);
  const centerX = width / 2 + dx;
  const centerY = height / 2 + dy;
  const count = Math.min(Math.round(params.count), Math.round(budget));
  const cell = Math.max(12, Math.floor(Math.min(width, height) / 15));
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const occupied = new Uint16Array(cols * rows);
  let visible = 0, maxCell = 0;
  ctx.fillStyle = "#f0f4f3";
  ctx.globalAlpha = 0.49 * params.opacity / 100;
  const pointSize = Math.max(0.55, scale * 0.60);
  for (let j = 0; j < count; j++) {
    const idx = Math.round(j * (params.count - 1) / Math.max(1, count - 1));
    const p = interferencePoint(idx, Math.round(params.count), params, seconds, seed);
    const x = centerX + (p.x - 200) * scale;
    const y = centerY + (p.y - 200) * scale;
    if (x < 2 || y < 2 || x > width - 2 || y > height - 2) continue;
    ctx.fillRect(x, y, pointSize, pointSize);
    const col = Math.min(cols - 1, Math.floor(x / cell));
    const row = Math.min(rows - 1, Math.floor(y / cell));
    const index = row * cols + col;
    occupied[index]++;
    maxCell = Math.max(maxCell, occupied[index]);
    visible++;
  }
  ctx.globalAlpha = 1;
  // No per-cell rejection: it would destroy the interference topology.
  // Alpha blending provides naturally bounded pixel intensity instead.
  return { visible, peak: clamp(maxCell / Math.max(1, count * 0.15), 0, 1) };
}
