import type { Params } from "../core";
import { LIFEFORM_PERIOD } from "./lifeforms-geometry";

const TAU = 2 * Math.PI;
const GOLD = 0.6180339887498949;
const fract = (x: number) => x - Math.floor(x);

export type AnemoneFieldPoint = {
  x: number;
  y: number;
  alpha: number;
  group: 0 | 1 | 2;
};

/**
 * An independently authored index-space anemone.
 *
 * All coordinates are determined by a permanent point index; grouped fibers
 * are phase-related interference bands, not hand-authored spline geometry.
 *
 * Three nested fields:
 *  - 35% compact breathing / folded core
 *  - 22% interwoven short crown
 *  - 43% long, radially opening filament families
 *
 * Every temporal term uses an integer harmonic of the 12s base period.
 * Visual inspiration: https://x.com/yuruyurau?s=21
 */
export function anemoneFieldPoint(
  index: number,
  count: number,
  params: Params,
  seconds: number,
  seed: number,
): AnemoneFieldPoint {
  const n = Math.max(1, Math.round(count));
  const i = Math.max(0, Math.min(n - 1, Math.round(index)));
  const t = TAU * seconds / LIFEFORM_PERIOD;
  const gene = TAU * ((seed % 65521) / 65521);
  const pulse = params.pulse / 100;
  const sway = params.sway / 100;
  const coreEnd = Math.round(n * 0.35);
  const crownEnd = Math.round(n * 0.57);

  let x: number, y: number, alpha: number;
  let group: 0 | 1 | 2;
  if (i < coreEnd) {
    group = 0;
    const j = i, samplesPerRing = 199;
    const ringCount = Math.max(1, Math.ceil(coreEnd / samplesPerRing) - 1);
    const v = Math.min(1, Math.floor(j / samplesPerRing) / ringCount);
    const theta = TAU * fract(j * GOLD + gene * 0.0009);
    const fold = Math.sin(17 * theta + 14 * v - 2 * t + gene * 0.36);
    const micro = Math.sin(43 * theta - 23 * v + 3 * t + gene * 0.18);
    const distance = Math.hypot(3 * v, 2.6 * Math.cos(theta));
    const interference = Math.sin(3.4 * distance - 2 * t + 0.5 * fold);
    const breathe = 1 + 0.085 * pulse * Math.sin(3 * t);
    const r = (5 + 43 * Math.pow(v, 0.82)) *
      (1 + 0.11 * fold + 0.04 * micro + 0.026 * interference) * breathe;
    x = 200 + r * Math.cos(theta) +
      3.5 * v * Math.sin(11 * theta + 3 * t);
    y = 244 + 0.80 * r * Math.sin(theta) -
      9 * v + 4.5 * v * Math.sin(18 * v + 2 * t + theta * 3);
    alpha = 0.94 + 0.12 * Math.cos(7 * theta + v * 9);
  } else if (i < crownEnd) {
    group = 1;
    const j = i - coreEnd;
    const samplesPerFiber = 97;
    const fiber = Math.floor(j / samplesPerFiber);
    const q = (j % samplesPerFiber) / (samplesPerFiber - 1);
    // Six finely separated fibers share a root, envelope and delayed wave.
    const family = Math.floor(fiber / 6);
    const member = fiber % 6;
    const angle = Math.PI * fract(family * GOLD + gene * 0.021);
    const offset = (member - 2.5) / 2.5;
    const phase = family * 0.63 + gene * 0.19;
    const curve = angle + 0.28 * q * Math.sin(2 * t + phase) +
      0.16 * q * q * Math.sin(3 * t - 6 * q + phase);
    const reach = (22 + 43 * q) * (0.92 + 0.08 * Math.sin(2 * t + phase));
    const fold = 5.4 * q * Math.sin(14 * q + member * 0.44 + phase - 2 * t) +
      2.6 * q * Math.sin(31 * q - phase + 3 * t);
    const transverse = (offset * (1.8 + 4 * q) + fold) * sway;
    x = 200 + reach * Math.cos(curve) - transverse * Math.sin(curve);
    y = 230 - (20 + 69 * Math.sin(curve)) * q -
      transverse * Math.cos(curve) + 2.4 * Math.sin(19 * q + phase + t);
    alpha = 0.76 + 0.13 * Math.cos(17 * q - member * 0.7 + 2 * t);
  } else {
    group = 2;
    const j = i - crownEnd;
    const samplesPerFiber = 111;
    const fiber = Math.floor(j / samplesPerFiber);
    const q = (j % samplesPerFiber) / (samplesPerFiber - 1);
    const family = Math.floor(fiber / 6), member = fiber % 6;
    const theta = Math.PI * fract(family * GOLD + gene * 0.017);
    const rank = fract(family * 0.75487766624669 + 0.04 * gene);
    const lane = (member - 2.5) / 2.5;
    const delay = family * 0.39 + gene * 0.24;
    const elongation = 103 + 74 * rank;
    // A common traveling phase sets the direction of the bundle, with
    // smaller dephased transverse oscillations creating folded sub-bands.
    const heading = theta +
      0.13 * sway * q * Math.sin(2 * t - 5 * q + delay) +
      0.23 * sway * q * q * Math.sin(3 * t - 8 * q + delay * 0.72);
    const longitudinal = (26 + elongation * q) *
      (1 + 0.06 * pulse * Math.sin(3 * t - 3 * q + delay));
    const fold = 11 * sway * q * Math.sin(14 * q - 2 * t + delay) +
      4.5 * sway * q * Math.sin(31 * q + 3 * t - delay * 0.5);
    const edge = lane * (1.4 + 7.2 * q) + fold;
    // Screen-space upward fan. Outer strands spread broadly from the core,
    // including near-horizontal arms, rather than falling like jellyfish.
    x = 200 + longitudinal * Math.cos(heading) -
      edge * Math.sin(heading);
    y = 239 - (26 + (elongation - 20) * Math.sin(heading)) * q -
      edge * Math.cos(heading) - 13 * q +
      3.5 * q * Math.cos(2 * t - 9 * q + delay);
    alpha = 0.67 + 0.16 * (1 - q) +
      0.11 * Math.cos(12 * q + lane * 2 + delay);
  }
  return {
    x: 200 + (x - 200) * params.spread,
    y: 200 + (y - 200) * params.length,
    alpha,
    group,
  };
}
