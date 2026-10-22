import { useEffect, useRef, useState } from "react";
import type { Params } from "./core";
import type { Snapshot } from "./registry";
import {
  estimateShapeRatio, exploreMorphologies,
  measureReferenceSilhouette, shapeNames,
  type MorphologyCandidate,
} from "./effects/lifeforms-model";
import { sampleLifeform } from "./effects/lifeforms-geometry";
import { isInterferenceShape, paintInterference } from "./effects/lifeforms-interference";
import { jellyfishFieldPoint } from "./effects/lifeforms-jellyfish-field";

function Preview({ candidate }: { candidate: MorphologyCandidate }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const width = 200, height = 130;
    el.width = width * 2;
    el.height = height * 2;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, width, height);
    if (candidate.params.shape === 0 || isInterferenceShape(candidate.params.shape)) {
      paintInterference(ctx, candidate.params, candidate.seed, 1.6,
        width, height, 5500,
        candidate.params.shape === 0 ? jellyfishFieldPoint : undefined);
      return;
    }
    const n = Math.round(candidate.params.count);
    const samples = 5500;
    const scale = Math.min(width / 3.6, height / 3.2);
    for (let index = 0; index < samples; index++) {
      const i = Math.floor(index * (n - 1) / (samples - 1));
      const position = sampleLifeform(i, n, candidate.params, 1.6, candidate.seed);
      const depth = Math.max(0, Math.min(1, (position.z + 1.15) / 2.3));
      const parallax = 1 + position.z * 0.1;
      const x = width / 2 + scale * position.x * parallax;
      const y = height * .47 + scale * position.y * parallax;
      if (x <= 1 || x >= width - 1 || y <= 1 || y >= height - 1) continue;
      ctx.globalAlpha = (0.22 + depth * 0.65) * candidate.params.opacity / 100;
      ctx.fillStyle = "#ebf5f4";
      ctx.fillRect(x, y, 0.8, 0.8);
    }
    ctx.globalAlpha = 1;
  }, [candidate]);
  return <canvas ref={canvas} className="life-candidate-preview" aria-hidden="true" />;
}

type Props = {
  snapshot: Snapshot;
  onSelect: (params: Params, seed: number) => void;
  onNotice: (message: string) => void;
};

export function LifeformsExplorer({ snapshot, onSelect, onNotice }: Props) {
  const [targetRatio, setTargetRatio] = useState<number | undefined>();
  const [label, setLabel] = useState("");
  const [round, setRound] = useState(0);
  const [candidates, setCandidates] = useState<MorphologyCandidate[]>([]);
  const [working, setWorking] = useState(false);
  const requestId = useRef(0);

  const explore = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    const seed = (snapshot.seed + Math.imul(nextRound, 1779033703)) >>> 0;
    setCandidates(exploreMorphologies(snapshot.params, seed, targetRatio));
  };
  const reference = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onNotice("请选择图片文件");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      onNotice("图片不能超过 8 MB");
      return;
    }
    const id = ++requestId.current;
    setWorking(true);
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
        const c = document.createElement("canvas");
        c.width = Math.max(2, Math.round(bitmap.width * scale));
        c.height = Math.max(2, Math.round(bitmap.height * scale));
        const context = c.getContext("2d", { willReadFrequently: true });
        if (!context) throw Error("无法读取图片像素");
        context.drawImage(bitmap, 0, 0, c.width, c.height);
        const data = context.getImageData(0, 0, c.width, c.height);
        const ratio = measureReferenceSilhouette(data.data, c.width, c.height);
        if (id !== requestId.current) return;
        setTargetRatio(ratio);
        setLabel(file.name);
        setCandidates(exploreMorphologies(snapshot.params, snapshot.seed, ratio));
        setRound(0);
      } finally {
        bitmap.close();
      }
    } catch (e) {
      if (id === requestId.current) onNotice((e as Error).message || "参考图片解析失败");
    } finally {
      if (id === requestId.current) setWorking(false);
    }
  };

  return (
    <section className="life-explorer" aria-labelledby="life-explorer-heading">
      <div className="life-explorer-header">
        <div>
          <span className="life-overline">MORPHOLOGY SEARCH / 004</span>
          <h2 id="life-explorer-heading">自动形态探索</h2>
          <p>生成一组可比较的数学形态，选择候选后立即应用到上方的实时动画。</p>
        </div>
        <button onClick={explore} disabled={working} className="life-primary">
          探索 6 个新形态 ↗
        </button>
      </div>
      <div className="life-reference">
        <label>
          <span>参考图片约束</span>
          <input
            type="file" accept="image/*" disabled={working}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void reference(file);
              event.target.value = "";
            }}
          />
        </label>
        <div>
          <strong>{working ? "分析中…" : label || "未选择图片"}</strong>
          <span>
            {targetRatio === undefined
              ? `当前形态宽高比约 ${estimateShapeRatio(snapshot.params).toFixed(2)}`
              : `检测到的前景宽高比约 ${targetRatio.toFixed(2)}`}
          </span>
        </div>
        {targetRatio !== undefined && (
          <button className="life-clear" onClick={() => {
            requestId.current++;
            setTargetRatio(undefined);
            setLabel("");
            setCandidates([]);
            setWorking(false);
          }}>清除参考</button>
        )}
      </div>
      <p className="life-disclosure">
        本地处理，图片不会上传。算法只依据背景色差估算前景宽高比，
        适合背景干净、轮廓清晰的图片。尚未支持语义分割、自动骨架重建或 AI 审美评分。
        候选评分是几何匹配度与运动参数的启发式指标。
      </p>
      {candidates.length ? (
        <div className="life-candidate-grid">
          {candidates.map((candidate, index) => (
            <button key={candidate.seed} className="life-candidate"
              onClick={() => onSelect(candidate.params, candidate.seed)}>
              <Preview candidate={candidate} />
              <span>
                <b>0{index + 1} · {shapeNames[Math.round(candidate.params.shape)]}</b>
                <small>匹配评分 {Math.round(candidate.score * 100)} / 100</small>
              </span>
              <span className="life-apply">应用形态 ↗</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="life-candidate-empty">
          调整形态参数，点击「探索 6 个新形态」开始自动搜索。
        </div>
      )}
      <div className="life-attribution">
        <span>INSPIRATION CREDIT</span>
        <p>
          Inspired by the mathematical generative art of{" "}
          <a href="https://x.com/yuruyurau?s=21" target="_blank" rel="noreferrer">
            @yuruyurau ↗
          </a>
          . All morphology formulas and animations are independently implemented.
        </p>
      </div>
    </section>
  );
}
