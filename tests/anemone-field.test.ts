import { describe, expect, it } from "vitest";
import { experiments, validateSnapshot } from "../src/registry";
import { LIFEFORM_PERIOD } from "../src/effects/lifeforms-geometry";
import { anemoneFieldPoint } from "../src/effects/lifeforms-anemone-field";
import { paintInterference } from "../src/effects/lifeforms-interference";
import { exploreMorphologies, estimateShapeRatio } from "../src/effects/lifeforms-model";

const effect = experiments.find((e) => e.id === "procedural-lifeforms")!;
const preset = effect.presets.find((p) => p.values.shape === 1)!;
const params = preset.values;
const seed = 84101;

describe("shape 1 index-space anemone", () => {
  it("preserves the numeric shape ID and previously shared snapshot values", () => {
    expect(preset.name).toBe("海葵·干涉");
    const old = { ...params, count: 35000, spread: 1.05, length: 1.15,
      pulse: 40, sway: 82, drift: 12, speed: 50, opacity: 83 };
    const s = validateSnapshot({ version: 1, effect: effect.id,
      effectVersion: 1, seed, params: old });
    expect(s.params).toEqual(old);
    expect(validateSnapshot({ version: 1, effect: effect.id,
      effectVersion: 1, seed, params }).params).toEqual(params);
  });

  it("builds three nonempty strata with an upward, wider outer crown", () => {
    const n = params.count;
    const totals = [0, 0, 0], boxes = [0, 1, 2].map(() => ({
      left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity,
    }));
    for (let i = 0; i < n; i += 17) {
      const p = anemoneFieldPoint(i, n, params, 2.4, seed);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) &&
        Number.isFinite(p.alpha)).toBe(true);
      expect(p.alpha).toBeGreaterThan(0);
      expect(p.alpha).toBeLessThan(1.5);
      totals[p.group]++;
      const b = boxes[p.group];
      b.left = Math.min(b.left, p.x);
      b.right = Math.max(b.right, p.x);
      b.top = Math.min(b.top, p.y);
      b.bottom = Math.max(b.bottom, p.y);
    }
    totals.forEach((n) => expect(n).toBeGreaterThan(250));
    const coreWidth = boxes[0].right - boxes[0].left;
    const outerWidth = boxes[2].right - boxes[2].left;
    expect(coreWidth).toBeLessThan(140);
    expect(outerWidth).toBeGreaterThan(coreWidth * 2);
    expect(boxes[2].top).toBeLessThan(boxes[0].top - 35);
    expect(boxes[2].bottom).toBeLessThan(boxes[0].bottom + 35);
  });

  it("closes the complete 12s cycle for all three layers", () => {
    for (const time of [0, 1.6, 6.5]) {
      for (let i = 0; i < params.count; i += 197) {
        const start = anemoneFieldPoint(i, params.count, params, time, seed);
        const end = anemoneFieldPoint(i, params.count, params, time + LIFEFORM_PERIOD, seed);
        expect(start.x).toBeCloseTo(end.x, 7);
        expect(start.y).toBeCloseTo(end.y, 7);
        expect(start.alpha).toBeCloseTo(end.alpha, 7);
      }
    }
  });

  it("is reproducible and its seed and time alter the shape", () => {
    for (const groupIndex of [0.1, 0.43, 0.8]) {
      const i = Math.floor(params.count * groupIndex);
      const first = anemoneFieldPoint(i, params.count, params, 2.4, seed);
      expect(anemoneFieldPoint(i, params.count, params, 2.4, seed)).toEqual(first);
      expect(anemoneFieldPoint(i, params.count, params, 2.4, seed + 1)).not.toEqual(first);
      expect(anemoneFieldPoint(i, params.count, params, 4.4, seed)).not.toEqual(first);
    }
  });

  it("uses the same sampler for screenshot and explorer preview rendering", () => {
    const pixels: number[][] = [];
    const fake = {
      fillStyle: "", globalAlpha: 1,
      fillRect(x: number, y: number) { pixels.push([x, y, fake.globalAlpha]); },
    };
    const ctx = fake as unknown as CanvasRenderingContext2D;
    const m = paintInterference(ctx, params, seed, 1.6, 240, 150, 5500,
      anemoneFieldPoint);
    expect(m.visible).toBeGreaterThan(1000);
    expect(pixels).toHaveLength(m.visible);
    expect(new Set(pixels.map((p) => p[2])).size).toBeGreaterThan(40);
    const previous = JSON.stringify(pixels);
    pixels.length = 0;
    paintInterference(ctx, params, seed, 1.6, 240, 150, 5500, anemoneFieldPoint);
    expect(JSON.stringify(pixels)).toEqual(previous);
  });

  it("keeps shape-1 candidates valid under exploration and image ratio guidance", () => {
    for (const targetRatio of [undefined, 1.8]) {
      const list = exploreMorphologies(params, seed, targetRatio);
      expect(list).toHaveLength(6);
      for (const candidate of list) {
        expect(candidate.params.shape).toBe(1);
        expect(Number.isFinite(candidate.score)).toBe(true);
        expect(validateSnapshot({
          version: 1, effect: effect.id, effectVersion: 1,
          seed: candidate.seed, params: candidate.params,
        }).params).toEqual(candidate.params);
      }
    }
    expect(estimateShapeRatio(params)).toBeGreaterThan(0.8);
  });
});
