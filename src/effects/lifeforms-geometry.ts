import type { Params } from "../core";

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
export const LIFEFORM_PERIOD = 12;
export type LifeSample = { x: number; y: number; z: number; group: number };

// Structured samples on continuous surfaces and filaments. The same index moves coherently.
export function sampleLifeform(i: number, n: number, p: Params, seconds: number, seed = 0): LifeSample {
  const phase = seconds * TAU / LIFEFORM_PERIOD;
  const gene = (seed % 65521) / 65521 * TAU;
  const sway = p.sway / 100, pulse = p.pulse / 100;
  const shape = Math.round(p.shape);
  let x = 0, y = 0, z = 0, group = 0;
  if (shape === 0) {
    const domeEnd = Math.floor(n * 0.54);
    const pleatEnd = Math.floor(n * 0.69);
    const threadEnd = Math.floor(n * 0.90);
    if (i < domeEnd) {
      const meridians = 185;
      const az = TAU * (i % meridians) / meridians;
      const v = Math.min(1, Math.floor(i / meridians) / Math.max(1, domeEnd / meridians - 1));
      const edge = v ** 7;
      const ripple = 1 + (0.032 + 0.055 * edge) * Math.cos(18 * az + gene + 1.2 * Math.sin(phase * 2))
        + 0.028 * Math.sin(31 * az + v * 9 + gene * 0.47 - 2 * phase);
      const radius = p.spread * Math.sin(v * HALF_PI) ** 0.8
        * (1 + 0.08 * pulse * Math.sin(phase * 3)) * ripple;
      x = radius * Math.cos(az);
      z = radius * Math.sin(az) * 0.73;
      y = -0.2 - p.length * 0.9 * Math.cos(v * HALF_PI)
        + 0.07 * edge * Math.sin(18 * az + phase * 3)
        + 0.07 * pulse * Math.sin(phase * 3) * v;
    } else if (i < pleatEnd) {
      group = 1;
      const j = i - domeEnd, strands = 72;
      const az = TAU * (j % strands) / strands;
      const v = Math.min(1, Math.floor(j / strands) / Math.max(1, (pleatEnd - domeEnd) / strands - 1));
      const r = p.spread * (0.21 + 0.61 * v)
        + 0.095 * sway * Math.sin(13 * az + 12 * v + gene + phase * 2);
      x = r * Math.cos(az);
      z = r * Math.sin(az) * 0.68;
      y = -0.37 + 0.12 * v + 0.035 * Math.cos(20 * az + v * 9 + phase * 3);
    } else if (i < threadEnd) {
      group = 2;
      const j = i - pleatEnd, strands = 62;
      const strand = j % strands;
      const v = Math.min(1, Math.floor(j / strands) / Math.max(1, (threadEnd - pleatEnd) / strands - 1));
      const az = TAU * strand / strands;
      const root = 0.78 * p.spread * (0.65 + 0.33 * Math.sin(strand * 12.9823 + gene));
      const q = v * p.length;
      x = root * Math.cos(az) * (1 - 0.22 * v)
        + 0.12 * sway * v ** 1.3 * Math.sin(phase * 2 - v * 6 + strand * 0.46 + gene)
        + 0.065 * Math.sin(v * 11 + strand) * v;
      z = root * Math.sin(az) * 0.68 * (1 - 0.4 * v)
        + 0.10 * sway * v * Math.cos(phase * 2 - v * 7 + strand * 0.5);
      y = -0.2 + q * (1.48 + 0.3 * Math.sin(strand * 5.4))
        + 0.06 * v * Math.sin(phase * 3 + strand * 0.4);
    } else {
      group = 3;
      const j = i - threadEnd, strands = 46;
      const strand = j % strands;
      const v = Math.min(1, Math.floor(j / strands) / Math.max(1, (n - threadEnd) / strands - 1));
      const az = TAU * strand / strands;
      const fold = 0.32 + 0.12 * Math.sin(7 * az + 14 * v - phase * 2);
      x = fold * Math.cos(az) + 0.13 * sway * v * Math.sin(phase * 2 - 7 * v + 2 * az);
      z = fold * 0.55 * Math.sin(az);
      y = -0.23 + v * p.length * 1.16;
    }
  } else if (shape === 1) {
    const baseEnd = Math.floor(n * 0.20);
    if (i < baseEnd) {
      const nr = 128;
      const az = TAU * (i % nr) / nr;
      const v = Math.min(1, Math.floor(i / nr) / Math.max(1, baseEnd / nr - 1));
      const r = p.spread * (0.27 + 0.43 * v) * (1 + 0.06 * Math.sin(25 * az + 2 * phase));
      x = r * Math.cos(az);
      z = r * Math.sin(az) * 0.72;
      y = 0.62 - 0.3 * v + 0.03 * Math.sin(16 * az + phase * 2);
    } else {
      group = 2;
      const j = i - baseEnd, strands = 138;
      const strand = j % strands;
      const v = Math.min(1, Math.floor(j / strands) / Math.max(1, (n - baseEnd) / strands - 1));
      const az = strand * TAU / strands, q = v ** 1.13;
      const root = 0.25 + 0.25 * (strand % 8) / 8;
      const reach = q * (0.25 + 0.4 * (strand % 7) / 7) * p.spread;
      x = (root + reach) * Math.cos(az)
        + 0.19 * sway * q * q * Math.sin(phase * 2 - 4.5 * q + strand * 0.31);
      z = (root + reach) * Math.sin(az) * 0.77
        + 0.11 * sway * q * Math.cos(phase * 2 - 5 * q + strand * 0.22 + gene);
      y = 0.36 - q * p.length * (1.1 + 0.58 * (strand % 11) / 11);
    }
  } else if (shape === 2) {
    const bodyEnd = Math.floor(n * 0.7);
    if (i < bodyEnd) {
      const nr = 150, az = TAU * (i % nr) / nr;
      const u = Math.min(1, Math.floor(i / nr) / Math.max(1, bodyEnd / nr - 1));
      const v = 2 * u - 1;
      const env = Math.max(0, 1 - v * v) ** 0.62
        * (0.6 + 0.13 * Math.sin(phase * 3 - v * 5 + gene * 0.4) * pulse);
      const wave = 0.14 * sway * ((v + 1) / 2) ** 2 * Math.sin(phase * 3 - v * 5);
      x = p.spread * v;
      y = p.length * 0.48 * env * Math.cos(az) + wave;
      z = p.length * 0.38 * env * Math.sin(az);
    } else {
      group = 2;
      const j = i - bodyEnd, strands = 55, strand = j % strands;
      const v = Math.min(1, Math.floor(j / strands) / Math.max(1, (n - bodyEnd) / strands - 1));
      const az = TAU * strand / strands;
      x = p.spread * (-0.65 - v * 0.55);
      y = (0.09 + 0.39 * v) * p.length * Math.cos(az)
        + 0.18 * sway * Math.sin(phase * 3 - v * 3 + strand * 0.05);
      z = (0.05 + 0.18 * v) * Math.sin(az);
    }

  } else {
    // Sinuous abstract organism: woven mantle around an undulating axis and
    // hundreds of coherent, phase-delayed bristles. All motion frequencies
    // are integral multiples of a shared period.
    const spine = (u: number) => ({
      x: 0.33 * Math.sin(u * 7 + phase) + 0.18 * Math.sin(u * 15 - 2 * phase + gene),
      y: (u - 0.5) * 2.35 * p.length,
      z: 0.21 * Math.cos(u * 9 - 2 * phase),
    });
    const mantleEnd = Math.floor(n * 0.62);
    if (i < mantleEnd) {
      const meridians = 152;
      const u = Math.min(1, Math.floor(i / meridians) / Math.max(1, mantleEnd / meridians - 1));
      const az = TAU * (i % meridians) / meridians;
      const mid = spine(u), envelope = Math.sin(Math.PI * u) ** 0.7;
      const wrinkle = 1 + 0.15 * pulse * Math.sin(u * 23 - 3 * phase + gene)
        + 0.07 * Math.sin(az * 9 + u * 34 + phase * 2);
      const radius = (0.09 + 0.31 * envelope) * p.spread * wrinkle;
      const theta = az + u * TAU * 1.5 + 0.17 * Math.sin(phase + u * 12);
      x = mid.x + radius * Math.cos(theta);
      z = mid.z + radius * 0.75 * Math.sin(theta);
      y = mid.y + 0.07 * Math.sin(az * 12 + u * 25 - phase * 2) * envelope;
    } else {
      group = 2;
      const j = i - mantleEnd, strands = 109;
      const strand = j % strands;
      const v = Math.min(1, Math.floor(j / strands) / Math.max(1, (n - mantleEnd) / strands - 1));
      const origin = 0.08 + 0.84 * ((strand * 0.61803398875) % 1);
      const az = TAU * ((strand * 0.381966011) % 1);
      const mid = spine(origin);
      const reach = (0.4 + 0.7 * ((strand * 7 % 19) / 19)) * p.spread;
      const sign = strand % 3 === 0 ? -1 : 1;
      const bend = 0.15 * Math.sin(phase * 2 + strand * 0.47 - v * 9 + gene * 0.1)
        * v * v * sway;
      x = mid.x + (0.1 + v * reach) * Math.cos(az) + bend
        + 0.1 * Math.sin(v * 8 + phase * 2 + strand) * v;
      z = mid.z + (0.1 + v * reach) * Math.sin(az) * 0.8
        + 0.12 * sway * v * Math.cos(phase * 2 - v * 8 + strand * 0.4);
      y = mid.y + sign * v * (0.3 + 0.7 * ((strand * 13 % 31) / 31)) * p.length
        + 0.12 * sway * v * Math.sin(phase * 2 - v * 6 + strand * 0.45);
    }
  }
  const ry = (shape === 3 ? 0.38 : 0.35) * Math.cos(phase) + (shape === 3 ? 0.1 : 0.14),
    rx = (shape === 3 ? 0.21 : -0.17) * Math.sin(phase);
  const X = x * Math.cos(ry) + z * Math.sin(ry);
  const Z = -x * Math.sin(ry) + z * Math.cos(ry);
  return { x: X, y: y * Math.cos(rx) - Z * Math.sin(rx),
    z: y * Math.sin(rx) + Z * Math.cos(rx), group };
}
