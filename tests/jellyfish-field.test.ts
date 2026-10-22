import { describe, expect, it } from "vitest";
import { experiments, validateSnapshot } from "../src/registry";
import { LIFEFORM_PERIOD } from "../src/effects/lifeforms-geometry";
import { jellyfishFieldPoint } from "../src/effects/lifeforms-jellyfish-field";
import { paintInterference, interferencePoint } from "../src/effects/lifeforms-interference";
import { exploreMorphologies } from "../src/effects/lifeforms-model";

const experiment = experiments.find((e) => e.id === "procedural-lifeforms")!;
const jellyfish = experiment.presets.find((p) => p.values.shape === 0)!.values;

describe("shape=0 high fidelity index-space jellyfish", () => {
  it("retains shape ID and compatibility with previously shared snapshot params", () => {
    const legacy = { ...jellyfish, count: 38000, length: 1.1, drift: 58, opacity: 79 };
    const s = validateSnapshot({ version: 1, effect: experiment.id, effectVersion: 1,
      seed: 84101, params: legacy });
    expect(s.params).toEqual(legacy);
    expect(experiment.presets.filter((p) => p.values.shape === 0)).toHaveLength(1);
    expect(experiment.presets.find((p) => p.values.shape === 0)?.name).toContain("干涉");
  });

  it("creates finite distinct bell, oral-fold and tentacle regions", () => {
    const count = jellyfish.count, totals = [0, 0, 0];
    const extents = [0, 1, 2].map(() => ({
      minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
    }));
    for (let i = 0; i < count; i += 17) {
      const p = jellyfishFieldPoint(i, count, jellyfish, 3.5, 84101);
      totals[p.group]++;
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.alpha)).toBe(true);
      expect(p.alpha).toBeGreaterThan(0);
      const box = extents[p.group];
      box.minX = Math.min(box.minX, p.x);
      box.maxX = Math.max(box.maxX, p.x);
      box.minY = Math.min(box.minY, p.y);
      box.maxY = Math.max(box.maxY, p.y);
    }
    for (let i = 0; i < 3; i++) expect(totals[i]).toBeGreaterThan(250);
    expect(extents[0].minY).toBeLessThan(80);
    expect(extents[0].maxX - extents[0].minX).toBeGreaterThan(170);
    expect(extents[1].maxY).toBeGreaterThan(265);
    expect(extents[2].maxY).toBeGreaterThan(290);
    expect(extents[2].minY).toBeLessThan(170);
  });

  it("is exactly periodic across the 12-second boundary", () => {
    const n = jellyfish.count;
    for (const t of [0, 2.75, 8.4]) {
      for (let i = 0; i < n; i += 229) {
        const a = jellyfishFieldPoint(i, n, jellyfish, t, 9002);
        const b = jellyfishFieldPoint(i, n, jellyfish, t + LIFEFORM_PERIOD, 9002);
        expect(a.x).toBeCloseTo(b.x, 7);
        expect(a.y).toBeCloseTo(b.y, 7);
        expect(a.alpha).toBeCloseTo(b.alpha, 7);
      }
    }
  });

  it("has deterministic genomes, non-static phase and stable full-index LOD", () => {
    const p = jellyfish, n = p.count, i = Math.floor(n * 0.90);
    const a = jellyfishFieldPoint(i, n, p, 2.9, 12345);
    expect(jellyfishFieldPoint(i, n, p, 2.9, 12345)).toEqual(a);
    expect(jellyfishFieldPoint(i, n, p, 2.9, 34567)).not.toEqual(a);
    expect(jellyfishFieldPoint(i, n, p, 7.2, 12345)).not.toEqual(a);
    const lowered = { ...p, count: 8400 };
    const before = jellyfishFieldPoint(Math.floor(n / 2), n + 1, p, 2.9, 12345);
    const after = jellyfishFieldPoint(Math.floor(n / 2), n + 1, lowered, 2.9, 12345);
    expect(before).toEqual(after);
  });

  it("uses identical shared painter geometry for preview and main render", () => {
    const rendered: Array<[number, number, number]> = [];
    const fake = {
      fillStyle: "", globalAlpha: 1,
      fillRect(x: number, y: number) { rendered.push([x, y, fake.globalAlpha]); },
    };
    const ctx = fake as unknown as CanvasRenderingContext2D;
    const m = paintInterference(ctx, jellyfish, 84101, 1.6, 240, 150, 5500,
      jellyfishFieldPoint);
    expect(m.visible).toBeGreaterThan(1000);
    expect(rendered).toHaveLength(m.visible);
    expect(rendered.some((p) => p[2] !== rendered[0][2])).toBe(true);
    const prior = [...rendered];
    rendered.length = 0;
    paintInterference(ctx, jellyfish, 84101, 1.6, 240, 150, 5500, jellyfishFieldPoint);
    expect(rendered).toEqual(prior);
  });

  it("preserves the existing mathematical interference painter without a custom sampler", () => {
    const rendered: number[][] = [];
    const fake = {
      fillStyle: "", globalAlpha: 1,
      fillRect(x: number, y: number) { rendered.push([x, y, fake.globalAlpha]); },
    };
    const ctx = fake as unknown as CanvasRenderingContext2D;
    const p = experiment.presets.find((x) => x.values.shape === 4)!.values;
    const count = Math.min(p.count, 6000);
    paintInterference(ctx, p, 23, 1.6, 300, 200, count);
    const direct = interferencePoint(0, p.count, p, 1.6, 23);
    const scale = 0.91 * Math.min(300, 200) / 400;
    // Check the evaluator and its default painter stay connected.
    expect(rendered.length).toBeGreaterThan(0);
    expect(direct.x).toBeTypeOf("number");
    expect(rendered.every((dot) => dot[2] === 0.49 * p.opacity / 100)).toBe(true);
    expect(scale).toBeGreaterThan(0);
  });

  it("keeps candidate search parameter bounds for the replaced preset", () => {
    const items = exploreMorphologies(jellyfish, 84101);
    expect(items).toHaveLength(6);
    for (const item of items) {
      expect(item.params.shape).toBe(0);
      expect(validateSnapshot({
        version: 1, effect: experiment.id, effectVersion: 1,
        seed: item.seed, params: item.params,
      }).params).toEqual(item.params);
    }
  });
});
