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
  {
    id: "procedural-lifeforms",
    number: "04",
    title: "Procedural lifeforms",
    subtitle: "程序化生命体",
    category: "生成式生命",
    renderer: "Canvas 2D",
    color: "#9ce1db",
    description: "让数学长出生物般的形态。探索粒子身体、柔性运动与无限循环的海洋生命。",
    mechanism:
      "水母、干涉与折叠共同采用固定索引域的二维非线性映射：水母由钟罩的径向干涉褶皱、内层口腕波带和相位延迟触丝组成，均在同一连续数学场中演化；海葵、鱼和游丝保留既有三维参数曲面投影。局部形变及全局游动轨迹均采用 12 秒闭合周期。探索器使用确定性的多样性约束参数搜索。图片在浏览器本地作粗略前景轮廓分析。",
    boundary:
      "这是二维程序化抽象，并非生物学准确的三维重建或物理流体模拟。上传图片仅估计前景宽高比，不包含语义识别、骨架拟合或真实 AI 评价。简洁背景的图片效果较佳。三维模式使用网格限流；水母与干涉/折叠模式保留空间透明叠加，通过透明度控制亮度；窄屏设备可能降低绘制采样数；该约束不代表真实光能或物理密度。灵感来自 @yuruyurau，所有公式均独立实现。",
    controls: [
      c("shape", "生命体类型", 0, 5),
      c("count", "粒子总量", 6000, 50000, 1000),
      c("spread", "身体宽度", 0.5, 1.7, 0.05),
      c("length", "身体长度", 0.5, 1.7, 0.05),
      c("pulse", "收缩强度", 0, 100, 1, "%"),
      c("sway", "柔性摆动", 0, 100, 1, "%"),
      c("drift", "游动幅度", 0, 100, 1, "%"),
      c("speed", "动画速度", 0, 100, 1, "%"),
      c("opacity", "粒子亮度", 10, 100, 1, "%"),
    ],
    presets: [
      { name: "折叠", values: {
        shape: 5, count: 36000, spread: 1.0, length: 1.0,
        pulse: 65, sway: 75, drift: 12, speed: 50, opacity: 88,
      } },
      { name: "干涉", values: {
        shape: 4, count: 36000, spread: 1.0, length: 1.0,
        pulse: 65, sway: 75, drift: 10, speed: 50, opacity: 88,
      } },
      { name: "水母·干涉", values: {
        shape: 0, count: 42000, spread: 1, length: 1.0,
        pulse: 78, sway: 72, drift: 18, speed: 50, opacity: 94,
      } },
      { name: "游丝", values: {
        shape: 3, count: 30000, spread: 1.15, length: 1,
        pulse: 65, sway: 75, drift: 24, speed: 50, opacity: 88,
      } },
      { name: "海葵", values: {
        shape: 1, count: 35000, spread: 1.05, length: 1.15,
        pulse: 40, sway: 82, drift: 12, speed: 50, opacity: 83,
      } },
      { name: "鱼", values: {
        shape: 2, count: 34000, spread: 1.1, length: 1,
        pulse: 15, sway: 76, drift: 67, speed: 50, opacity: 85,
      } },
    ],
    load: () => import("./effects/lifeforms"),
  }
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
