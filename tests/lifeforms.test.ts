import { describe, it, expect } from "vitest";
import { experiments, validateSnapshot } from "../src/registry";
import {
  PERIOD, createLifePoints, estimateShapeRatio, exploreMorphologies,
  lifePosition, measureReferenceSilhouette, swimTransform,
} from "../src/effects/lifeforms-model";

const experiment = experiments.find((item) => item.id === "procedural-lifeforms")!;
const base = experiment.presets[0].values;

describe("procedural lifeform mathematics", () => {
  it("repeats the same geometry for equal seed and params", () => {
    const a = createLifePoints(base, 123);
    const b = createLifePoints(base, 123);
    expect(a).toEqual(b);
    expect(createLifePoints(base, 124)).not.toEqual(a);
    expect(a).toHaveLength(base.count);
  });
  it("seamlessly joins its full morphology and global swim loop", () => {
    for (const preset of experiment.presets) {
      const points = createLifePoints(preset.values, 812).slice(0, 120);
      for (const p of points) {
        const a = lifePosition(p, preset.values, 0);
        const b = lifePosition(p, preset.values, PERIOD);
        expect(a.x).toBeCloseTo(b.x, 8);
        expect(a.y).toBeCloseTo(b.y, 8);
        expect(Number.isFinite(a.x)).toBe(true);
        expect(Number.isFinite(a.y)).toBe(true);
      }
      const start = swimTransform(0, preset.values);
      const end = swimTransform(PERIOD, preset.values);
      expect(start.x).toBeCloseTo(end.x, 8);
      expect(start.y).toBeCloseTo(end.y, 8);
      expect(start.angle).toBeCloseTo(end.angle, 8);
    }
  });
  it("generates reproducible, bounded, diversified candidates", () => {
    const candidates = exploreMorphologies(base, 42, 1, 6);
    expect(exploreMorphologies(base, 42, 1, 6)).toEqual(candidates);
    expect(candidates).toHaveLength(6);
    expect(new Set(candidates.map((a) => a.seed)).size).toBe(6);
    expect(new Set(candidates.map((a) => [a.params.spread, a.params.length].join(","))).size)
      .toBeGreaterThan(1);
    for (const item of candidates) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(1);
      expect(item.params.spread).toBeGreaterThanOrEqual(0.5);
      expect(item.params.spread).toBeLessThanOrEqual(1.7);
      expect(item.params.length).toBeGreaterThanOrEqual(0.5);
      expect(item.params.length).toBeLessThanOrEqual(1.7);
      expect(Number.isFinite(estimateShapeRatio(item.params))).toBe(true);
      expect(validateSnapshot({
        version: 1, effect: experiment.id, effectVersion: 1,
        seed: item.seed, params: item.params,
      }).params).toEqual(item.params);
    }
  });
  it("extracts the width/height of a contrasting foreground", () => {
    const width = 100, height = 100;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 250;
      pixels[i + 3] = 255;
      if (x >= 20 && x <= 79 && y >= 30 && y <= 59)
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 10;
    }
    expect(measureReferenceSilhouette(pixels, width, height)).toBeCloseTo(2, 2);
  });
  it("rejects images without detectable foreground", () => {
    const pixels = new Uint8ClampedArray(30 * 30 * 4).fill(255);
    expect(() => measureReferenceSilhouette(pixels, 30, 30)).toThrow();
  });
});
