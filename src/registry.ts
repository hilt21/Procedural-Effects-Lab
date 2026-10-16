import type { Control, Factory, Params } from "./core";
export type Experiment = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  category: string;
  renderer: string;
  color: string;
  description: string;
  mechanism: string;
  boundary: string;
  controls: Control[];
  presets: { name: string; values: Params }[];
  load: () => Promise<{ create: Factory }>;
};
const c = (
  key: string,
  label: string,
  min: number,
  max: number,
  step = 1,
  unit = "",
): Control => ({ key, label, min, max, step, unit });
export const experiments: Experiment[] = [
  {
    id: "angular-light",
    number: "01",
    title: "Angular light trails",
    subtitle: "45° 折线光轨",
    category: "光与路径",
    renderer: "Canvas 2D",
    color: "#edc779",
    description:
      "有方向的生长，有节制的随机。让金色光轨在折转与反射中寻找秩序。",
    mechanism:
      "四个精确对角方向构成路径。每段保留主轴传播方向，边界碰撞后镜面反射。增长前预占全屏线长和网格容量，尾迹按时间消退。",
    boundary:
      "二维视口边界反射，不含深度缓冲 SSR。局部容量按线段与网格边界交点分割计算，不表示像素亮度。预算采用未衰减几何线长，约束比视觉覆盖更保守。",
    controls: [
      c("maxTrails", "光轨总量", 4, 48),
      c("density", "区域密度", 10, 85, 1, "%"),
      c("speed", "传播速度", 80, 500, 5, "px/s"),
      c("bend", "折转概率", 0, 100, 1, "%"),
      c("reflections", "反射上限", 0, 5),
      c("glow", "辉光强度", 0, 100, 1, "%"),
      c("tail", "尾迹寿命", 1, 7, 0.1, "s"),
    ],
    presets: [
      {
        name: "克制",
        values: {
          maxTrails: 10,
          density: 22,
          speed: 175,
          bend: 58,
          reflections: 1,
          glow: 47,
          tail: 2.6,
        },
      },
      {
        name: "均衡",
        values: {
          maxTrails: 22,
          density: 42,
          speed: 230,
          bend: 67,
          reflections: 2,
          glow: 62,
          tail: 3.2,
        },
      },
      {
        name: "爆发",
        values: {
          maxTrails: 36,
          density: 76,
          speed: 320,
          bend: 82,
          reflections: 3,
          glow: 76,
          tail: 4.2,
        },
      },
    ],
    load: () => import("./effects/angular"),
  },
  {
    id: "flow-field",
    number: "02",
    title: "Flow field particles",
    subtitle: "流场粒子",
    category: "粒子与运动",
    renderer: "Canvas 2D",
    color: "#9db5ed",
    description: "数百个微小的行者，共享一片看不见的向量场。",
    mechanism:
      "粒子在连续的三角函数向量场中平流。网格占用检查控制局部粒子数量，固定种子与固定时间步控制演化。",
    boundary:
      "这是程序化向量场，没有求解真实流体方程。粒子密度控制基于粒子中心，拖尾交叠仍会提高局部亮度。",
    controls: [
      c("count", "粒子数量", 50, 1000, 10),
      c("speed", "流动速度", 10, 100),
      c("scale", "流场尺度", 1, 8, 0.1),
      c("curl", "旋转强度", 1, 8, 0.1),
      c("trail", "拖尾强度", 5, 95, 1, "%"),
    ],
    presets: [
      {
        name: "轻流",
        values: { count: 150, speed: 25, scale: 2.4, curl: 2, trail: 60 },
      },
      {
        name: "织流",
        values: { count: 450, speed: 45, scale: 3.2, curl: 4, trail: 85 },
      },
      {
        name: "湍流",
        values: { count: 800, speed: 65, scale: 5, curl: 7, trail: 90 },
      },
    ],
    load: () => import("./effects/flow"),
  },
  {
    id: "shader-gradient",
    number: "03",
    title: "Chromatic drift",
    subtitle: "流光渐变",
    category: "着色器",
    renderer: "WebGL",
    color: "#c6a9e8",
    description: "颜色像地形一样起伏，在缓慢的时间里流动。",
    mechanism:
      "全屏三角形上的片元着色器，以多层正弦扰动构造流动色域。直接使用 WebGL，按需加载，无额外 3D 引擎依赖。",
    boundary:
      "不含三维光照或物理模拟。WebGL 不可用或上下文丢失时显示静态渐变。不同 GPU 的像素结果可能略有差异。",
    controls: [
      c("speed", "流动速度", 0, 100),
      c("scale", "纹理尺度", 1, 6, 0.1),
      c("warp", "扭曲强度", 0, 3, 0.1),
      c("grain", "颗粒强度", 0, 30),
      c("hue", "色相偏移", 0, 360, 1, "°"),
    ],
    presets: [
      {
        name: "暮色",
        values: { speed: 20, scale: 2.2, warp: 1.2, grain: 8, hue: 0 },
      },
      {
        name: "极光",
        values: { speed: 35, scale: 3, warp: 1.8, grain: 12, hue: 110 },
      },
      {
        name: "熔金",
        values: { speed: 18, scale: 1.7, warp: 2.3, grain: 6, hue: 240 },
      },
    ],
    load: () => import("./effects/gradient"),
  },
];
export type Snapshot = {
  version: 1;
  effect: string;
  effectVersion: 1;
  seed: number;
  params: Params;
};
export function validateSnapshot(raw: unknown): Snapshot {
  if (!raw || typeof raw !== "object") throw Error("配置格式无效");
  const s = raw as Snapshot,
    e = experiments.find((e) => e.id === s.effect);
  if (s.version !== 1 || s.effectVersion !== 1) throw Error("配置版本不受支持");
  if (
    !e ||
    !Number.isInteger(s.seed) ||
    s.seed < 0 ||
    s.seed > 4294967295 ||
    !s.params ||
    typeof s.params !== "object"
  )
    throw Error("实验或随机种子无效");
  const params: Params = {};
  for (const c of e.controls) {
    const v = s.params[c.key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < c.min || v > c.max)
      throw Error(`参数超出范围：${c.label}`);
    const ticks = Math.round((v - c.min) / c.step);
    params[c.key] = Number((c.min + ticks * c.step).toFixed(3));
  }
  return { version: 1, effect: e.id, effectVersion: 1, seed: s.seed, params };
}
export function snapshotFromHash() {
  const h = location.hash.slice(1);
  if (!h) return null;
  return validateSnapshot(JSON.parse(decodeURIComponent(h)));
}
