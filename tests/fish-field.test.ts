import { describe, expect, it } from "vitest";
import { experiments, validateSnapshot } from "../src/registry";
import { LIFEFORM_PERIOD } from "../src/effects/lifeforms-geometry";
import { fishFieldPoint } from "../src/effects/lifeforms-fish-field";
import { paintInterference } from "../src/effects/lifeforms-interference";
import { exploreMorphologies, estimateShapeRatio } from "../src/effects/lifeforms-model";

const experiment = experiments.find(e => e.id === "procedural-lifeforms")!;
const fish = experiment.presets.find(p => p.values.shape === 2)!.values;
const seed = 84101;

describe("fish index-space folded swimmer", () => {
  it("keeps shape=2 and legacy snapshot parameters valid", () => {
    const legacy = { ...fish, count: 34000, spread: 1.1, length: 1,
      pulse: 15, sway: 76, drift: 67, speed: 50, opacity: 85 };
    expect(experiment.presets.filter(p => p.values.shape === 2)).toHaveLength(1);
    expect(experiment.presets.find(p => p.values.shape === 2)?.name).toBe("鱼·干涉");
    expect(validateSnapshot({version: 1, effect: experiment.id, effectVersion: 1,
      seed, params: legacy }).params).toEqual(legacy);
    expect(validateSnapshot({version: 1, effect: experiment.id, effectVersion: 1,
      seed, params: fish }).params).toEqual(fish);
  });

  it("creates a tapered fish body, distinct fin structure, and split tail", () => {
    const boxes = Array.from({length: 3}, () => ({
      minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
    }));
    const totals = [0, 0, 0];
    const tailTipY: number[] = [];
    for (let i=0; i<fish.count; i+=11) {
      const p = fishFieldPoint(i, fish.count, fish, 2.3, seed);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) &&
        Number.isFinite(p.alpha)).toBe(true);
      expect(p.alpha).toBeGreaterThan(0);
      expect(p.alpha).toBeLessThan(1.5);
      totals[p.group]++;
      const b = boxes[p.group];
      b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x);
      b.minY = Math.min(b.minY, p.y); b.maxY = Math.max(b.maxY, p.y);
      if(p.group === 2 && p.x < 150) tailTipY.push(p.y);
    }
    totals.forEach(n => expect(n).toBeGreaterThan(300));
    expect(boxes[0].minX).toBeLessThan(110);
    expect(boxes[0].maxX).toBeGreaterThan(300);
    expect(boxes[0].maxY - boxes[0].minY).toBeGreaterThan(65);
    expect(boxes[1].minY).toBeLessThan(boxes[0].minY - 14);
    expect(boxes[1].maxY).toBeGreaterThan(boxes[0].maxY + 10);
    expect(boxes[2].minX).toBeLessThan(boxes[0].minX - 40);
    expect(tailTipY.some(y=>y < 170)).toBe(true);
    expect(tailTipY.some(y=>y > 235)).toBe(true);
  });

  it("has an exact twelve-second seam for body, fins and fork", () => {
    for (const seconds of [0, 2.3, 8.1]) {
      for(let i=0;i<fish.count;i+=197){
        const a=fishFieldPoint(i,fish.count,fish,seconds,seed);
        const b=fishFieldPoint(i,fish.count,fish,seconds+LIFEFORM_PERIOD,seed);
        expect(a.x).toBeCloseTo(b.x,7);
        expect(a.y).toBeCloseTo(b.y,7);
        expect(a.alpha).toBeCloseTo(b.alpha,7);
        expect(a.group).toBe(b.group);
      }
    }
  });

  it("moves coherently with time and seed, with strong caudal motion", () => {
    for(const ratio of [0.15,0.65,0.88]){
      const index=Math.floor(fish.count*ratio);
      const before=fishFieldPoint(index,fish.count,fish,0.9,seed);
      expect(fishFieldPoint(index,fish.count,fish,0.9,seed)).toEqual(before);
      expect(fishFieldPoint(index,fish.count,fish,0.9,seed+13)).not.toEqual(before);
      expect(fishFieldPoint(index,fish.count,fish,3.9,seed)).not.toEqual(before);
    }
  });

  it("uses an identical alpha painter for full-size and candidate previews", () => {
    const dots: number[][] = [];
    const fake = {
      fillStyle:"",globalAlpha:1,
      fillRect(x:number,y:number){dots.push([x,y,fake.globalAlpha]);},
    };
    const ctx = fake as unknown as CanvasRenderingContext2D;
    const result=paintInterference(ctx,fish,seed,1.6,240,150,5500,fishFieldPoint);
    expect(result.visible).toBeGreaterThan(1000);
    expect(dots).toHaveLength(result.visible);
    expect(new Set(dots.map(d=>d[2])).size).toBeGreaterThan(20);
    const copy=JSON.stringify(dots);
    dots.length=0;
    paintInterference(ctx,fish,seed,1.6,240,150,5500,fishFieldPoint);
    expect(JSON.stringify(dots)).toEqual(copy);
  });

  it("generates six reproducible, schema-valid fish variants", () => {
    expect(estimateShapeRatio(fish)).toBeGreaterThan(1.25);
    const variants=exploreMorphologies(fish,seed,1.8);
    expect(variants).toHaveLength(6);
    for(const c of variants){
      expect(c.params.shape).toBe(2);
      expect(c.score).toBeGreaterThan(0);
      expect(validateSnapshot({version:1,effect:experiment.id,
        effectVersion:1,seed:c.seed,params:c.params}).params).toEqual(c.params);
    }
  });
});
