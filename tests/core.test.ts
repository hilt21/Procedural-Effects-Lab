import { describe, it, expect } from "vitest";
import { rng, reflect, LengthBudget } from "../src/core";
import { experiments, validateSnapshot } from "../src/registry";
describe("geometry and budgets", () => {
  it("reflects exact diagonal directions and conserves magnitude", () => {
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const axis of ["x", "y"] as const) {
          const [a, b] = reflect(x, y, axis);
          expect(Math.abs(a)).toBe(Math.abs(b));
          expect(a * a + b * b).toBe(2);
          expect(reflect(a, b, axis)).toEqual([x, y]);
        }
  });
  it("never admits growth past the global budget", () => {
    const b = new LengthBudget(400, 400, 80, 100, 1000);
    expect(b.reserve(0, 0, 50, 50)).toBe(true);
    expect(b.reserve(50, 50, 100, 100)).toBe(false);
    expect(b.total).toBeLessThanOrEqual(100);
  });
  it("rejects dense cells without changing previous reservations", () => {
    const b = new LengthBudget(400, 400, 80, 1000, 50);
    expect(b.reserve(10, 10, 40, 40)).toBe(true);
    const total = b.total,
      grid = [...b.cells];
    expect(b.reserve(10, 10, 40, 40)).toBe(false);
    expect(b.total).toBe(total);
    expect([...b.cells]).toEqual(grid);
  });
  it("admits randomized segments without any cell exceeding capacity", () => {
    const r = rng(9),
      b = new LengthBudget(400, 300, 40, 2000, 65);
    for (let i = 0; i < 1000; i++)
      b.reserve(r() * 400, r() * 300, r() * 400, r() * 300);
    expect(b.total).toBeLessThanOrEqual(b.limit + 1e-8);
    expect(Math.max(...b.cells)).toBeLessThanOrEqual(b.cap + 1e-8);
  });
  it("repeats seeded sequences", () => {
    const a = rng(84101),
      b = rng(84101);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
});
describe("portable configuration", () => {
  for (const e of experiments)
    for (const p of e.presets)
      it(`${e.id} / ${p.name} round trips`, () => {
        const s = {
          version: 1,
          effect: e.id,
          effectVersion: 1,
          seed: 84101,
          params: p.values,
        };
        expect(validateSnapshot(JSON.parse(JSON.stringify(s)))).toEqual(s);
      });
  it("rejects unknown versions, effects, missing and unsafe parameters", () => {
    const s = {
      version: 1,
      effect: experiments[0].id,
      effectVersion: 1,
      seed: 1,
      params: experiments[0].presets[1].values,
    };
    for (const change of [
      { version: 2 },
      { effect: "unknown" },
      { seed: -1 },
      { seed: 1.5 },
      { params: {} },
      { params: { ...s.params, maxTrails: 1e8 } },
      { params: { ...s.params, speed: NaN } },
    ])
      expect(() => validateSnapshot({ ...s, ...change })).toThrow();
  });
});
