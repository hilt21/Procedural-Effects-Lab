import { describe, expect, it } from "vitest";
import { experiments } from "../src/registry";
import { LIFEFORM_PERIOD, sampleLifeform } from "../src/effects/lifeforms-geometry";

const e = experiments.find((item) => item.id === "procedural-lifeforms")!;

describe("organic high-density geometry", () => {
  it("supports coherent finite geometry for all four specimens", () => {
    for (const preset of e.presets) {
      const n = preset.values.count;
      for (let i = 0; i < n; i += 37) {
        const a = sampleLifeform(i, n, preset.values, 1.25, 201);
        expect(Number.isFinite(a.x)).toBe(true);
        expect(Number.isFinite(a.y)).toBe(true);
        expect(Number.isFinite(a.z)).toBe(true);
      }
    }
  });
  it("closes geometry at the 12-second loop boundary", () => {
    for (const preset of e.presets) {
      const n = preset.values.count;
      for (let i = 0; i < n; i += 223) {
        const a = sampleLifeform(i, n, preset.values, 0, 84101);
        const b = sampleLifeform(i, n, preset.values, LIFEFORM_PERIOD, 84101);
        expect(a.x).toBeCloseTo(b.x, 7);
        expect(a.y).toBeCloseTo(b.y, 7);
        expect(a.z).toBeCloseTo(b.z, 7);
      }
    }
  });
  it("is deterministic under the same seed, and changes under another seed", () => {
    const params = e.presets.find((p) => p.values.shape === 3)!.values;
    const index = 871, n = params.count;
    const same = sampleLifeform(index, n, params, 3.21, 84101);
    expect(sampleLifeform(index, n, params, 3.21, 84101)).toEqual(same);
    expect(sampleLifeform(index, n, params, 3.21, 84102)).not.toEqual(same);
    expect(sampleLifeform(index, n, params, 5.11, 84101)).not.toEqual(same);
  });
});