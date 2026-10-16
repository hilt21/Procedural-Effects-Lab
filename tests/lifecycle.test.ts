import { describe, it, expect, vi, afterEach } from "vitest";
import { runEffect, type Effect } from "../src/core";
import { create } from "../src/effects/angular";
import { experiments } from "../src/registry";
function fakeCanvas() {
  const paths: number[][] = [];
  const gradient = { addColorStop: vi.fn() };
  const ctx = new Proxy(
    {
      beginPath() {},
      moveTo(x: number, y: number) {
        paths.push([x, y]);
      },
      lineTo(x: number, y: number) {
        paths.at(-1)?.push(x, y);
      },
      createRadialGradient() {
        return gradient;
      },
    },
    {
      get(t, k) {
        return (t as any)[k] ?? (() => {});
      },
      set(t, k, v) {
        (t as any)[k] = v;
        return true;
      },
    },
  );
  return {
    paths,
    canvas: {
      width: 0,
      height: 0,
      getContext: () => ctx,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 900,
        height: 530,
      }),
    } as unknown as HTMLCanvasElement,
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("light simulation", () => {
  it("maintains count, global, local and diagonal constraints across presets", () => {
    for (const preset of experiments[0].presets) {
      const { canvas, paths } = fakeCanvas(),
        e = create(canvas, preset.values, 84101);
      e.resize(900, 530, 1);
      for (let i = 0; i < 1200; i++) {
        e.step(1 / 60);
        const m = e.metrics();
        expect(m.items).toBeLessThanOrEqual(preset.values.maxTrails);
        expect(m.load).toBeLessThanOrEqual(1 + 1e-8);
        expect(m.peak).toBeLessThanOrEqual(1 + 1e-8);
      }
      e.draw();
      for (const [x, y, x2, y2] of paths.filter((p) => p.length === 4)) {
        // Background scaffold has horizontal / vertical grid lines.
        if (x !== x2 && y !== y2)
          expect(Math.abs(Math.abs(x2 - x) - Math.abs(y2 - y))).toBeLessThan(
            1e-7,
          );
      }
      e.destroy();
      expect(canvas.removeEventListener).toHaveBeenCalledOnce();
    }
  });
  it("repeats simulation at the same seed, time and viewport", () => {
    const { canvas } = fakeCanvas(),
      e = create(canvas, experiments[0].presets[1].values, 12);
    e.resize(900, 530, 1);
    for (let i = 0; i < 300; i++) e.step(1 / 60);
    const m = e.metrics();
    e.reset(12);
    for (let i = 0; i < 300; i++) e.step(1 / 60);
    expect(e.metrics()).toEqual(m);
    e.destroy();
  });
  it("immediately enforces lower limits", () => {
    const { canvas } = fakeCanvas(),
      e = create(canvas, experiments[0].presets[2].values, 1);
    e.resize(900, 530, 1);
    for (let i = 0; i < 300; i++) e.step(1 / 60);
    e.update(experiments[0].presets[0].values);
    expect(e.metrics().items).toBeLessThanOrEqual(10);
    expect(e.metrics().load).toBeLessThanOrEqual(1);
    e.destroy();
  });
});
it("stops scheduling on pause, resumes once, and removes all lifecycle listeners", () => {
  let next = 0;
  const pending = new Map<number, (t: number) => void>(),
    doc = new EventTarget() as EventTarget & { hidden: boolean };
  doc.hidden = false;
  const media = new EventTarget() as EventTarget & { matches: boolean };
  media.matches = false;
  vi.stubGlobal("window", { matchMedia: () => media });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
    pending.set(++next, cb);
    return next;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
  const e = {
    step: vi.fn(),
    draw: vi.fn(),
    metrics: () => ({}),
    destroy: vi.fn(),
  } as unknown as Effect;
  const run = runEffect(e, vi.fn(), false);
  expect(pending.size).toBe(1);
  run.pause(true);
  expect(pending.size).toBe(0);
  run.pause(false);
  run.pause(false);
  expect(pending.size).toBe(1);
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  expect(pending.size).toBe(0);
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  expect(pending.size).toBe(1);
  media.matches = true;
  media.dispatchEvent(new Event("change"));
  expect(pending.size).toBe(0);
  run.destroy();
  expect(e.destroy).toHaveBeenCalledOnce();
  doc.dispatchEvent(new Event("visibilitychange"));
  expect(pending.size).toBe(0);
});
