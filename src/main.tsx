import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  experiments,
  snapshotFromHash,
  validateSnapshot,
  type Experiment,
  type Snapshot,
} from "./registry";
import { runEffect, type Effect, type Metrics, type Params } from "./core";
import "./style.css";
import { LifeformsExplorer } from "./LifeformsExplorer";
const repo = "https://github.com/hilt21/Procedural-Effects-Lab";
const initial = () => {
  try {
    return { snapshot: snapshotFromHash(), error: "" };
  } catch (e) {
    return { snapshot: null, error: (e as Error).message };
  }
};
const boot = initial();
function Poster({ id }: { id: string }) {
  return (
    <div className={"poster " + id} aria-hidden="true">
      {id === "angular-light" ? (
        <svg viewBox="0 0 400 230">
          <defs>
            <radialGradient id="halo">
              <stop stopColor="#eec779" stopOpacity=".2" />
              <stop offset="1" stopColor="#eec779" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="122" r="92" fill="url(#halo)" />
          {[
            "200,122 165,87 116,136 58,78 22,114",
            "200,122 239,83 281,125 342,64 378,100",
            "200,122 249,171 281,139 357,215",
            "200,122 169,153 199,183 161,221",
            "200,122 228,94 200,66 245,21",
          ].map((p, i) => (
            <polyline
              key={p}
              points={p}
              fill="none"
              stroke={i % 2 ? "#f5d597" : "#ae8e55"}
              strokeWidth={i === 1 ? 1.6 : 1}
            />
          ))}
          <path d="M200 110l12 12-12 12-12-12z" fill="none" stroke="#f6dda7" />
        </svg>
      ) : id === "flow-field" ? (
        <svg viewBox="0 0 400 230">
          {Array.from({ length: 38 }, (_, i) => (
            <path
              key={i}
              d={`M ${-60 + i * 12} 240 Q ${240 - i * 3} ${120 + i * 2} ${90 + i * 7} -20`}
              stroke={`hsl(${210 + i},55%,${40 + i}%)`}
              strokeWidth=".8"
              fill="none"
            />
          ))}
        </svg>
      ) : id === "procedural-lifeforms" ? (
        <svg viewBox="0 0 400 230" aria-hidden="true">
          <defs>
            <radialGradient id="life-glow">
              <stop stopColor="#a1f5ed" stopOpacity=".16" />
              <stop offset="1" stopColor="#a1f5ed" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="115" r="105" fill="url(#life-glow)" />
          {Array.from({ length: 88 }, (_, i) => {
            const u = i / 87;
            const x = 200 + 25 * Math.sin(u * 9);
            const y = 25 + u * 180;
            const r = 9 + 31 * Math.pow(Math.sin(Math.PI * u), .7);
            return <ellipse key={i} cx={x} cy={y} rx={r} ry={r * .26}
              transform={`rotate(${20 * Math.sin(u * 7)} ${x} ${y})`}
              fill="none" stroke="#b5eeeb" strokeWidth=".55"
              strokeOpacity={.18 + .25 * Math.sin(i * .2) ** 2}/>;
          })}
          {Array.from({ length: 42 }, (_, i) => {
            const u = (i * .6180339) % 1;
            const x = 200 + 25 * Math.sin(u * 9);
            const y = 25 + u * 180;
            const v = (i * .381966) % 1;
            return <path key={i}
              d={`M ${x} ${y} Q ${x + 64 * Math.sin(i)} ${y + 22} ${x + 120 * Math.cos(i * 1.2)} ${y + 55 * (v - .5)}`}
              stroke="#b5eeeb" strokeWidth=".6" strokeOpacity=".37" fill="none"/>;
          })}
        </svg>
      ) : (
        <div className="gradient-poster" />
      )}
      <span className="poster-cross">+</span>
    </div>
  );
}
function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(boot.snapshot),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("全部实验"),
    [notice, setNotice] = useState(boot.error),
    [tab, setTab] = useState("原理"),
    [paused, setPaused] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [revision, setRevision] = useState(0),
    [metrics, setMetrics] = useState<Metrics>({
      items: 0,
      load: 0,
      peak: 0,
      fps: 0,
      time: 0,
    }),
    [status, setStatus] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    stage = useRef<HTMLDivElement>(null),
    effect = useRef<Effect | null>(null),
    runner = useRef<ReturnType<typeof runEffect> | null>(null),
    file = useRef<HTMLInputElement>(null),
    latest = useRef(snapshot);
  latest.current = snapshot;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const selected = experiments.find((e) => e.id === snapshot?.effect),
    params = snapshot?.params;
  useEffect(() => {
    const f = () => {
      try {
        setSnapshot(snapshotFromHash());
        setNotice("");
      } catch (e) {
        setNotice((e as Error).message);
      }
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      f = () => {
        if (media.matches) setPaused(true);
      };
    media.addEventListener("change", f);
    return () => media.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    if (!selected || !canvas.current || !stage.current) return;
    let disposed = false,
      observer: ResizeObserver | undefined;
    setStatus("正在加载实验…");
    setMetrics({ items: 0, load: 0, peak: 0, fps: 0, time: 0 });
    const c = canvas.current,
      container = stage.current;
    selected
      .load()
      .then(({ create }) => {
        if (disposed) return;
        const s = latest.current!;
        const e = create(c, s.params, s.seed);
        effect.current = e;
        const resize = () => {
          const r = container.getBoundingClientRect();
          e.resize(
            Math.max(1, r.width),
            Math.max(1, r.height),
            Math.min(devicePixelRatio || 1, 1.5),
          );
          e.draw();
        };
        resize();
        observer = new ResizeObserver(resize);
        observer.observe(container);
        runner.current = runEffect(e, setMetrics, pausedRef.current);
        setStatus("");
      })
      .catch((err) => {
        if (!disposed) setStatus("实验无法启动：" + err.message);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      runner.current?.destroy();
      runner.current = null;
      effect.current = null;
    };
  }, [selected?.id]);
  useEffect(() => {
    if (params) {
      effect.current?.update(params);
      effect.current?.draw();
    }
  }, [params]);
  useEffect(() => {
    if (snapshot) {
      effect.current?.reset(snapshot.seed);
      runner.current?.restart();
    }
  }, [snapshot?.seed, revision]);
  useEffect(() => {
    runner.current?.pause(paused);
  }, [paused]);
  const open = (e: Experiment) => {
    const s: Snapshot = {
      version: 1,
      effect: e.id,
      effectVersion: 1,
      seed: 84101,
      params: { ...e.presets[1].values },
    };
    setSnapshot(s);
    setTab("原理");
    setNotice("");
    setRevision((x) => x + 1);
    history.pushState(null, "", "#" + encodeURIComponent(JSON.stringify(s)));
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    setSnapshot(null);
    history.pushState(null, "", location.pathname + location.search);
    setNotice("");
  };
  const share = async () => {
    if (!snapshot) return;
    const url =
      location.origin +
      location.pathname +
      location.search +
      "#" +
      encodeURIComponent(JSON.stringify(snapshot));
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("分享链接已复制，包含当前参数与种子。");
    } catch {
      setNotice("链接已更新，请复制浏览器地址。");
    }
  };
  const exportJSON = () => {
    if (!snapshot) return;
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(snapshot, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = snapshot.effect + "-preset.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importJSON = async (f: File) => {
    try {
      if (f.size > 65536) throw Error("配置文件超过 64KB");
      const s = validateSnapshot(JSON.parse(await f.text()));
      setSnapshot(s);
      setRevision((x) => x + 1);
      history.replaceState(
        null,
        "",
        "#" + encodeURIComponent(JSON.stringify(s)),
      );
      setNotice("已导入配置。");
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const update = (key: string, v: number) => {
    if (snapshot)
      setSnapshot({ ...snapshot, params: { ...snapshot.params, [key]: v } });
  };
  const categories = ["全部实验", ...new Set(experiments.map((e) => e.category))];
  const filtered = experiments.filter(
    (e) =>
      (category === "全部实验" || e.category === category) &&
      `${e.title} ${e.subtitle} ${e.category} ${e.renderer}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <header>
        <button className="brand" onClick={back} aria-label="返回实验目录">
          <span className="brand-icon">✳</span>
          <span>
            PROCEDURAL<span className="brand-sub">EFFECTS LAB</span>
          </span>
        </button>
        <nav>
          <button className={!selected ? "nav-active" : ""} onClick={back}>
            实验目录 <span>{String(experiments.length).padStart(2, "0")}</span>
          </button>
          <a href={repo} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </nav>
        <span className="version">EXPLORATIONS / V.01</span>
      </header>
      {!selected ? (
        <main className="catalog">
          <section className="intro">
            <div>
              <p className="eyebrow">
                <i /> A PLAYGROUND FOR THE CURIOUS
              </p>
              <h1>
                在秩序与随机之间，
                <br />
                <span>让想法发光。</span>
              </h1>
              <p className="intro-copy">
                关于光、粒子与着色器的交互实验。
                <br />
                打开一个实验，调整参数，探索属于你的视觉语言。
              </p>
            </div>
            <div className="intro-aside">
              <span className="orbit">✳</span>
              <p>
                SMALL EXPERIMENTS.
                <br />
                ENDLESS POSSIBILITIES.
              </p>
              <span>探索 / 调参 / 复现</span>
            </div>
          </section>
          <section className="collection" aria-label="实验集合">
            <div className="collection-heading">
              <div className="filters">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={category === c ? "active" : ""}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                    {c === "全部实验" && <small>{experiments.length}</small>}
                  </button>
                ))}
              </div>
              <label className="search">
                <span>⌕</span>
                <input
                  aria-label="搜索实验"
                  placeholder="搜索实验或渲染技术…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="cards">
              {filtered.map((e) => (
                <button className="card" key={e.id} onClick={() => open(e)}>
                  <div className="card-image">
                    <Poster id={e.id} />
                    <span className="card-number">EXPERIMENT / {e.number}</span>
                    <span className="open-arrow">↗</span>
                  </div>
                  <div className="card-meta">
                    <span>{e.category}</span>
                    <span>{e.renderer}</span>
                  </div>
                  <h2>{e.title}</h2>
                  <p className="card-subtitle">{e.subtitle}</p>
                  <p className="card-description">{e.description}</p>
                  <div className="card-bottom">
                    <span>进入实验</span>
                    <span>→</span>
                  </div>
                </button>
              ))}
            </div>
            {!filtered.length && (
              <div className="empty">
                没有匹配的实验。
                <button
                  onClick={() => {
                    setQuery("");
                    setCategory("全部实验");
                  }}
                >
                  清除筛选
                </button>
              </div>
            )}
          </section>
          <section className="lab-note">
            <span>LAB NOTE / 001</span>
            <p>
              每个效果都是一个可以拆开的想法。
              <br />
              <small>独立渲染 · 参数可分享 · 随机可复现 · 源码可阅读</small>
            </p>
            <span className="note-symbol">↗</span>
          </section>
        </main>
      ) : (
        <main className="workbench">
          <div className="workbench-heading">
            <div>
              <button className="breadcrumb" onClick={back}>
                ← 所有实验 <span>/ EXPERIMENT {selected.number}</span>
              </button>
              <h1>
                {selected.title}
                <span>{selected.subtitle}</span>
              </h1>
            </div>
            <div className="workbench-actions">
              <button onClick={share}>分享参数 ↗</button>
              <button
                onClick={async () => {
                  try {
                    if (document.fullscreenElement)
                      await document.exitFullscreen();
                    else await stage.current?.requestFullscreen();
                  } catch {
                    setNotice("当前浏览器不支持全屏，请使用横屏查看。");
                  }
                }}
              >
                全屏 ⛶
              </button>
            </div>
          </div>
          <div className="workspace">
            <div className="stage" ref={stage}>
              <canvas
                key={selected.id}
                ref={canvas}
                aria-label={selected.subtitle + "动画画布"}
              />
              <div className="stage-top">
                <span>
                  <i className={paused ? "paused-dot" : ""} />
                  {paused ? "PAUSED" : "LIVE EXPERIMENT"}
                </span>
                <span>{selected.renderer} / DPR ≤ 1.5</span>
              </div>
              {status && (
                <p className="stage-status" role="status">
                  {status}
                </p>
              )}
              <div className="stage-bottom">
                <span>
                  {selected.id === "angular-light"
                    ? "点击画面移动光源"
                    : selected.id === "procedural-lifeforms" ? "12 s 周期 · 自动形态生成" : "固定时间步 · 1 / 60 s"}
                </span>
                <button onClick={() => setPaused((v) => !v)}>
                  {paused ? "▶ 继续" : "Ⅱ 暂停"}
                </button>
              </div>
            </div>
            <aside className="controls">
              <div className="control-heading">
                <h2>实验参数</h2>
                <span>PARAMETERS</span>
              </div>
              <div className={"preset-row" + (selected.id === "procedural-lifeforms" ? " preset-lifeforms" : "")}>
                {selected.presets.map((p) => (
                  <button
                    key={p.name}
                    className={
                      JSON.stringify(params) === JSON.stringify(p.values)
                        ? "chosen"
                        : ""
                    }
                    onClick={() => {
                      setSnapshot({ ...snapshot!, params: { ...p.values } });
                      setRevision((x) => x + 1);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {selected.controls.map((c) => (
                <label className="control" key={c.key}>
                  <span>
                    {c.label}
                    <output>
                      {selected.id === "procedural-lifeforms" && c.key === "shape"
                        ? ["水母·干涉", "海葵·干涉", "鱼", "游丝", "干涉", "折叠"][params![c.key]]
                        : params![c.key]}
                      <small>{c.unit}</small>
                    </output>
                  </span>
                  <input
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={params![c.key]}
                    onChange={(e) => update(c.key, Number(e.target.value))}
                  />
                </label>
              ))}
              <div className="seed-row">
                <label htmlFor="seed">随机种子</label>
                <input
                  id="seed"
                  type="number"
                  min="0"
                  max="4294967295"
                  value={snapshot!.seed}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 0 && n <= 4294967295)
                      setSnapshot({ ...snapshot!, seed: n });
                  }}
                />
                <button
                  title="使用相同种子重新运行"
                  onClick={() => setRevision((x) => x + 1)}
                >
                  ↻
                </button>
              </div>
              <div className="import-export">
                <button onClick={exportJSON}>导出 JSON ↓</button>
                <button onClick={() => file.current?.click()}>
                  导入 JSON ↑
                </button>
                <input
                  hidden
                  ref={file}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importJSON(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </aside>
          </div>
          <div className="metrics">
            <div>
              <span>FRAME RATE</span>
              <strong>
                {metrics.fps || "—"}
                <small> FPS</small>
              </strong>
            </div>
            <div>
              <span>
                {selected.id === "flow-field" || selected.id === "procedural-lifeforms" ? "PARTICLES" : "VISIBLE OBJECTS"}
              </span>
              <strong>{metrics.items}</strong>
            </div>
            <div>
              <span>GLOBAL BUDGET</span>
              <strong>
                {selected.id === "shader-gradient"
                  ? "N/A"
                  : Math.round(metrics.load * 100) + "%"}{" "}
              </strong>
            </div>
            <div>
              <span>PEAK CELL LOAD</span>
              <strong>
                {selected.id === "shader-gradient"
                  ? "N/A"
                  : Math.round(metrics.peak * 100) + "%"}
              </strong>
            </div>
          </div>
          {selected.id === "procedural-lifeforms" && snapshot && (
            <LifeformsExplorer
              snapshot={snapshot}
              onNotice={setNotice}
              onSelect={(nextParams, nextSeed) => {
                setSnapshot({ ...snapshot, params: { ...nextParams }, seed: nextSeed });
                setRevision((x) => x + 1);
                setNotice("已应用候选形态。点击「分享参数」可保存形态和随机种子。");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
          <section className="documentation">
            <div className="tabs">
              {["原理", "使用与复现", "源码与许可"].map((t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === "原理" ? (
              <div className="doc-grid">
                <div>
                  <h3>它如何运行</h3>
                  <p>{selected.mechanism}</p>
                </div>
                <div>
                  <h3>边界与限制</h3>
                  <p>{selected.boundary}</p>
                </div>
              </div>
            ) : tab === "使用与复现" ? (
              <div className="doc-grid">
                <div>
                  <h3>从预设开始</h3>
                  <p>
                    选一个预设，再逐项调整参数。分享链接与 JSON
                    会保存实验版本、参数和种子。相同视口和参数下，重置会得到相同的演化起点。
                  </p>
                </div>
                <div>
                  <h3>复现条件</h3>
                  <p>
                    固定时间步为 1/60
                    秒。分享不包含当前播放时刻与手动移动后的光源位置。画布尺寸、GPU
                    和像素比会影响视觉结果。减少动态效果偏好开启时默认暂停。
                  </p>
                </div>
              </div>
            ) : (
              <div className="doc-grid">
                <div>
                  <h3>独立模块，开放阅读</h3>
                  <p>
                    所有实验均为本项目独立实现，未复制调研项目组件。渲染代码与
                    React 界面分离。
                  </p>
                  <a
                    href={`${repo}/tree/main/src/effects`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看实验源码 ↗
                  </a>
                </div>
                <div>
                  <h3>依赖与许可</h3>
                  <p>
                    项目代码采用 MIT。运行时依赖 React 与 React DOM，许可证均为
                    MIT。渐变直接调用 WebGL，无第三方渲染依赖。原始 HTML
                    基线保留在 baseline 目录。
                    {selected.id === "procedural-lifeforms" && (
                      <> 本实验受到 <a href="https://x.com/yuruyurau?s=21"
                        target="_blank" rel="noreferrer">@yuruyurau</a> 的数学动画启发，
                        几何公式和渲染实现独立创作。</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <footer>
        <span>
          <b>✳</b> PROCEDURAL EFFECTS LAB
        </span>
        <span>
          持续探索中 <i /> {experiments.length} 个独立实验
        </span>
        <a href={repo} target="_blank" rel="noreferrer">
          查看源码 ↗
        </a>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
