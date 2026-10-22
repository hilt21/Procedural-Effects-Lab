import type { Params } from "../core";
import { LIFEFORM_PERIOD } from "./lifeforms-geometry";

const TAU = Math.PI * 2;
const GOLD = 0.6180339887498949;
const fract = (value: number) => value - Math.floor(value);

export type JellyfishFieldPoint = {
  x: number;
  y: number;
  /** Multiplier on the shared interference renderer's alpha. */
  alpha: number;
  group: 0 | 1 | 2;
};

/**
 * Original index-space jellyfish study.
 *
 * Shape 0 is intentionally retained for existing shared presets and URLs.
 * Points are evaluated from their permanent index, seed, parameters and time:
 *  - bell: correlated azimuth rings with radial / axial fold interference
 *  - oral arms: long, dense, mutually dephased corrugated ribbons
 *  - filaments: coherent root-to-tip traveling waves with delayed phases
 *
 * The formula contains no mutable state and every time-dependent term has
 * an integer period in the shared 12-second cycle.
 * Inspired by the mathematical creative-coding approach of @yuruyurau.
 * All equations and coefficients here are independently authored.
 */
export function jellyfishFieldPoint(
  index: number,
  count: number,
  params: Params,
  seconds: number,
  seed: number,
): JellyfishFieldPoint {
  const n = Math.max(1, Math.round(count));
  const i = Math.max(0, Math.min(n - 1, Math.round(index)));
  const t = TAU * seconds / LIFEFORM_PERIOD;
  const gene = TAU * ((seed % 65521) / 65521);
  const pulse = params.pulse / 100;
  const sway = params.sway / 100;

  const domeEnd = Math.round(n * 0.53);
  const oralEnd = Math.round(n * 0.77);
  let x: number;
  let y: number;
  let alpha: number;
  let group: 0 | 1 | 2;

  if (i < domeEnd) {
    group = 0;
    // Stratified rings; golden-angle ordering keeps every ring represented
    // when the renderer samples a smaller global index budget.
    const j = i;
    const ringSamples = 191;
    const rings = Math.max(1, Math.ceil(domeEnd / ringSamples) - 1);
    const v = Math.min(1, Math.floor(j / ringSamples) / rings);
    const theta = TAU * fract(j * GOLD + 0.0007 * gene);
    const rim = Math.pow(v, 6);
    const breath = 1 + 0.11 * pulse * Math.sin(3 * t);
    const fold = Math.sin(19 * theta + 14 * v - 2 * t + gene * 0.2);
    const micro = Math.sin(41 * theta - 20 * v + 3 * t + gene * 0.45);
    const fine = Math.sin(2.2 * Math.hypot(3 * v, 4 * Math.sin(theta)) - 2 * t);
    const radius =
      111 * Math.pow(Math.sin(Math.PI * v / 2), 0.91) *
      (1 + rim * (0.052 * fold + 0.026 * micro) +
        0.02 * fine + 0.026 * Math.cos(11 * theta + 2 * t)) *
      breath;
    // The dome moves as a mathematical folded membrane; there is no
    // imported mesh, fixed polygonal silhouette or hand-drawn texture.
    x = 200 + radius * Math.cos(theta) +
      4.5 * rim * Math.sin(8 * theta + 3 * t + 7 * v);
    y = 153 - 94 * Math.cos(Math.PI * v / 2) +
      8.5 * rim * fold +
      3.1 * Math.sin(21 * v + 2 * t + theta * 2) * v;
    alpha = 0.80 + rim * 0.30 + 0.10 * Math.cos(theta * 8);
  } else if (i < oralEnd) {
    group = 1;
    const j = i - domeEnd;
    const samplesPerRibbon = 157;
    const ribbon = Math.floor(j / samplesPerRibbon);
    const q = (j % samplesPerRibbon) / (samplesPerRibbon - 1);
    const theta = TAU * fract(ribbon * GOLD + gene * 0.015);
    const deep = Math.pow(q, 1.32);
    const oscillation = 12.8 * Math.sin(12 * q + theta * 3 - 2 * t) +
      6.2 * Math.sin(29 * q - theta * 2 + 3 * t);
    const phase = theta + 1.5 * q + 0.35 * Math.sin(2 * t + ribbon * 0.15);
    const radius = 13 + 46 * deep + 0.68 * oscillation * (0.3 + deep);
    x = 200 + radius * Math.cos(phase) +
      13 * sway * deep * Math.sin(3 * t - q * 9 + theta * 2);
    y = 141 + 151 * q +
      5.7 * Math.sin(18 * q + theta - 3 * t) +
      7 * deep * Math.cos(21 * q + theta * 3 + 2 * t);
    alpha = 0.62 + 0.18 * Math.sin(ribbon * 1.7 + q * 14);
  } else {
    group = 2;
    const j = i - oralEnd;
    const samplesPerStrand = 143;
    const strand = Math.floor(j / samplesPerStrand);
    const q = (j % samplesPerStrand) / (samplesPerStrand - 1);
    const theta = TAU * fract(strand * GOLD + gene * 0.019);
    const rank = fract(strand * 0.75487766624669);
    const anchor = (72 + 30 * rank) * Math.cos(theta);
    const reach = 142 + 57 * rank;
    const delay = strand * 0.17 + gene * 0.25;
    const motion = 19 * sway * q * q *
      Math.sin(2 * t - 7.7 * q + delay) +
      4.5 * sway * q * Math.sin(3 * t - 17 * q + delay * 0.4);
    const curl = 8 * q * Math.sin(14 * q + theta + 2 * t);
    x = 200 + anchor * (1 - 0.21 * q) + motion + curl;
    y = 149 + reach * q +
      6.5 * q * Math.cos(3 * t - 6.4 * q + delay);
    alpha = 0.52 + 0.28 * (1 - q) + 0.10 * rank;
  }

  return {
    x: 200 + (x - 200) * params.spread,
    y: 200 + (y - 200) * params.length,
    alpha,
    group,
  };
}
