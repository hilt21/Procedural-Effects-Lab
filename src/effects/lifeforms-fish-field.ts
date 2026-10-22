import type { Params } from "../core";
import { LIFEFORM_PERIOD } from "./lifeforms-geometry";

const TAU = 2 * Math.PI;
const GOLD = 0.6180339887498949;
const fract = (x: number) => x - Math.floor(x);

export type FishFieldPoint = {
  x: number;
  y: number;
  alpha: number;
  group: 0 | 1 | 2;
};

/**
 * Independently authored index-space mathematical swimmer.
 *
 * Head faces right, caudal fork and weak wake extend left. A clearly bounded
 * body axis anchors the silhouette; fine fold-interference patterns produce
 * the material texture. Fins and tail consist of phase-coupled filament lanes.
 *
 * Point groups: 58% folding body / 20% fins & facial structure /
 * 22% split caudal fin & wake. Every time term closes after 12 seconds.
 * Inspired by the generative-art language of @yuruyurau; original formulas.
 */
export function fishFieldPoint(
  index: number,
  count: number,
  params: Params,
  seconds: number,
  seed: number,
): FishFieldPoint {
  const n = Math.max(1, Math.round(count));
  const i = Math.max(0, Math.min(n - 1, Math.round(index)));
  const t = TAU * seconds / LIFEFORM_PERIOD;
  const gene = TAU * ((seed % 65521) / 65521);
  const sway = params.sway / 100;
  const pulse = params.pulse / 100;
  const bodyEnd = Math.round(n * 0.58);
  const finEnd = Math.round(n * 0.78);

  // Swimming wave travels from nose toward the increasingly flexible tail.
  const swim = (u: number) =>
    16 * sway * (1 - u) ** 2 * Math.sin(3 * t + 7 * u + gene * 0.22);

  let x: number, y: number, alpha: number, group: 0 | 1 | 2;
  if (i < bodyEnd) {
    group = 0;
    const j = i;
    const across = 211;
    const rows = Math.max(1, Math.ceil(bodyEnd / across) - 1);
    const u = Math.min(1, Math.floor(j / across) / rows);
    const theta = TAU * fract(j * GOLD + gene * 0.0012);
    const outline = (Math.sin(Math.PI * u) ** 0.83) *
      (0.87 + 0.21 * u) + 0.08 * (1 - u);
    const scale = 44 * outline *
      (1 + 0.038 * pulse * Math.cos(3 * t + 2 * u));
    const fold = Math.sin(23 * theta + 18 * u - 2 * t + gene * 0.27);
    const micro = Math.sin(47 * theta - 36 * u + 3 * t + gene * 0.13);
    const interference = Math.sin(4.1 * Math.hypot(2.8 * u, 1.9 * Math.sin(theta)) -
      2 * t + 0.65 * fold);
    // Softly pointed snout; coherent body envelope never breaks during motion.
    x = 95 + 211 * u +
      4.5 * outline * Math.sin(13 * u + 2 * t + theta * 0.9);
    y = 201 + swim(u) + scale * Math.sin(theta) *
      (1 + 0.095 * fold + 0.040 * micro + 0.024 * interference) +
      2.8 * outline * Math.cos(17 * u - 3 * t + theta * 2);
    alpha = 0.77 + 0.18 * Math.abs(Math.sin(theta)) +
      0.08 * Math.cos(9 * theta - 12 * u);
  } else if (i < finEnd) {
    group = 1;
    const j = i - bodyEnd, available = finEnd - bodyEnd;
    const ratio = j / Math.max(1, available);
    const dorsalEnd = Math.floor(available * 0.48);
    const ventralEnd = Math.floor(available * 0.71);
    const pectoralEnd = Math.floor(available * 0.90);
    const gillEnd = Math.floor(available * 0.975);

    if (j < dorsalEnd || j < ventralEnd) {
      const top = j < dorsalEnd;
      const start = top ? 0 : dorsalEnd;
      const k = j - start;
      const samplesPerRay = 97;
      const ray = Math.floor(k / samplesPerRay);
      const q = (k % samplesPerRay) / (samplesPerRay - 1);
      const rootU = 0.16 + (top ? 0.54 : 0.46) *
        fract(ray * GOLD + gene * 0.008);
      const envelope = Math.sin(Math.PI * rootU) ** 0.83;
      const heading = ray * 0.51 + gene * 0.11;
      const span = top ? 36 : 21;
      const fold = 5.8 * sway * q * Math.sin(16 * q - 2 * t + heading) +
        2.8 * q * Math.sin(29 * q + 3 * t - heading);
      x = 95 + 211 * rootU - q * (top ? 17 : 21) +
        fold + 4 * q * Math.sin(18 * rootU - t + heading);
      y = 201 + swim(rootU) + (top ? -1 : 1) *
        (41 * envelope + span * q * (0.55 + 0.55 * envelope)) +
        2.8 * q * Math.sin(23 * q + heading - 2 * t);
      alpha = 0.72 + 0.15 * (1 - q) + 0.09 * Math.cos(8 * q + heading);
    } else if (j < pectoralEnd) {
      const k = j - ventralEnd;
      const samplesPerRay = 83;
      const ray = Math.floor(k / samplesPerRay);
      const q = (k % samplesPerRay) / (samplesPerRay - 1);
      const theta = fract(ray * GOLD + gene * 0.01);
      const wave = 6 * sway * q * Math.sin(2 * t - 7 * q + theta * TAU);
      x = 238 - 67 * q + 10 * theta * q +
        4.2 * q * Math.sin(17 * q - 3 * t + ray * 0.3);
      y = 208 + 13 * q + 43 * theta * q + wave;
      alpha = 0.60 + 0.22 * (1 - q);
    } else if (j < gillEnd) {
      const k = j - pectoralEnd;
      const fraction = k / Math.max(1, gillEnd - pectoralEnd - 1);
      const theta = -1.12 + 2.24 * fraction;
      const rib = Math.sin(29 * theta + 3 * t + gene * 0.1);
      x = 265 + 11 * Math.cos(theta) - 2.5 * rib;
      y = 201 + swim(0.8) + 35 * Math.sin(theta) +
        2 * Math.sin(17 * theta - 2 * t);
      alpha = 0.69 + 0.2 * Math.cos(theta);
    } else {
      // An understated eye anchor holds the orientation in the abstract field.
      const k = j - gillEnd, length = Math.max(1, available - gillEnd);
      const fraction = k / length;
      const angle = TAU * fract(fraction * 29 + gene * 0.05);
      const radius = 2.8 + 2.0 * fract(k * GOLD);
      x = 281 + radius * Math.cos(angle);
      y = 190 + swim(0.88) + radius * Math.sin(angle);
      alpha = 1.09;
    }
  } else {
    group = 2;
    const j = i - finEnd, available = n - finEnd;
    const caudalEnd = Math.floor(available * 0.92);
    if (j < caudalEnd) {
      const upper = j < Math.floor(caudalEnd / 2);
      const half = Math.floor(caudalEnd / 2);
      const k = upper ? j : j - half;
      const samplesPerRay = 113;
      const ray = Math.floor(k / samplesPerRay);
      const q = (k % samplesPerRay) / (samplesPerRay - 1);
      const rank = fract(ray * GOLD + gene * 0.026);
      const lane = fract(ray * 0.75487766624669) - 0.5;
      const delay = ray * 0.36 + gene * 0.15;
      const sign = upper ? -1 : 1;
      const tip = 38 + 38 * rank;
      const traveling = sway * (9 * q * q *
        Math.sin(3 * t - 9 * q + delay) +
        4.5 * q * Math.sin(2 * t - 21 * q + delay * 0.44));
      x = 96 - q * (57 + 29 * rank) +
        7 * q * Math.sin(11 * q - 2 * t + delay) +
        5.5 * lane * q;
      y = 201 + swim(0.03) +
        sign * (4 + tip * q + 18 * q * (1 - q) * lane) +
        traveling + sign * 4.5 * q * Math.sin(17 * q + 2 * t + delay);
      alpha = 0.75 + 0.22 * (1 - q) +
        0.09 * Math.cos(18 * q + delay);
    } else {
      // A restrained near-tail interference wake, not a dominant trail.
      const k = j - caudalEnd, q = k / Math.max(1, available - caudalEnd - 1);
      const thread = k % 17;
      const distance = 52 + 67 * q;
      x = 96 - distance;
      y = 201 + swim(0) + 12 * Math.sin(3 * t - 8 * q + thread * 0.33) *
        q * sway + (thread - 8) * q * 2.1;
      alpha = 0.25 + 0.20 * (1 - q);
    }
  }
  return {
    x: 200 + (x - 200) * params.spread,
    y: 200 + (y - 200) * params.length,
    alpha,
    group,
  };
}
