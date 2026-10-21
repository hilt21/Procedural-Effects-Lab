import { describe, expect, it } from "vitest";
import { experiments, validateSnapshot } from "../src/registry";
import { interferencePoint, isInterferenceShape } from "../src/effects/lifeforms-interference";
import { LIFEFORM_PERIOD } from "../src/effects/lifeforms-geometry";
import { exploreMorphologies } from "../src/effects/lifeforms-model";

const specimen = experiments.find((e) => e.id === "procedural-lifeforms")!;
const variants = specimen.presets.filter((p) => isInterferenceShape(p.values.shape));

describe("index-space interference", () => {
  it("offers two distinct original mathematical specimens", () => {
    expect(variants.map((p) => p.values.shape).sort()).toEqual([4, 5]);
    for (const preset of variants) {
      const s = validateSnapshot({
        version: 1, effect: specimen.id, effectVersion: 1,
        seed: 84101, params: preset.values,
      });
      expect(s.params).toEqual(preset.values);
    }
  });
  it("is finite, bounded in its output, and has no time seam", () => {
    for (const variant of variants) {
      const p = variant.values;
      for (let i = 0; i < p.count; i += 137) {
        const at0 = interferencePoint(i, p.count, p, 0, 84101);
        const at12 = interferencePoint(i, p.count, p, LIFEFORM_PERIOD, 84101);
        expect(Number.isFinite(at0.x) && Number.isFinite(at0.y)).toBe(true);
        expect(Math.abs(at0.x)).toBeLessThan(1500);
        expect(Math.abs(at0.y)).toBeLessThan(1500);
        expect(at0.x).toBeCloseTo(at12.x, 7);
        expect(at0.y).toBeCloseTo(at12.y, 7);
      }
    }
  });
  it("resamples the same normalized domain at different budgets", () => {
    for (const variant of variants) {
      const p = variant.values;
      const x = interferencePoint(9000, 36001, p, 3.2, 84101);
      const y = interferencePoint(4500, 18001, p, 3.2, 84101);
      expect(x.x).toBeCloseTo(y.x, 8);
      expect(x.y).toBeCloseTo(y.y, 8);
    }
  });
  it("reproduces the same genome and changes under another seed", () => {
    for (const variant of variants) {
      const p = variant.values;
      const a = interferencePoint(19000, p.count, p, 2.25, 84101);
      expect(interferencePoint(19000, p.count, p, 2.25, 84101)).toEqual(a);
      expect(interferencePoint(19000, p.count, p, 2.25, 84102)).not.toEqual(a);
    }
  });
  it("produces valid candidates for both index-map specimen classes", () => {
    for (const variant of variants) {
      const results = exploreMorphologies(variant.values, 714);
      expect(results).toHaveLength(6);
      for (const r of results) {
        expect(r.params.shape).toBe(variant.values.shape);
        expect(Number.isFinite(r.score)).toBe(true);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      }
    }
  });
});
