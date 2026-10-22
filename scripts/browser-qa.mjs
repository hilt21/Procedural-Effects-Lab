import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chrome = ["google-chrome", "google-chrome-stable", "chromium"].find((name) => {
  try { execFileSync("which", [name], { stdio: "ignore" }); return true; }
  catch { return false; }
});
if (!chrome) throw Error("No Chromium/Chrome binary available for browser QA");

const output = "qa-artifacts";
await mkdir(output, { recursive: true });
const server = spawn("node",
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1",
    "--port", "4173", "--strictPort"], { stdio: "ignore" });
let browser;
let socket;
const failures = [];
const metrics = {};

async function waitHttp(url, timeout = 14000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await pause(200);
  }
  throw Error("HTTP service did not respond: " + url);
}
let sequence = 0;
const pending = new Map();
const send = (method, params = {}) => {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(Error("CDP timeout: " + method));
    }, 13000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
};
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error("Evaluation failed: " +
    (r.exceptionDetails.exception?.description || r.exceptionDetails.text || JSON.stringify(r.exceptionDetails)));
  return r.result.value;
};
const until = async (expression, deadline = 8500) => {
  const start = Date.now();
  while (Date.now() - start < deadline) {
    try { if (await evaluate(expression)) return; } catch {}
    await pause(220);
  }
  throw Error("Timed out checking browser DOM: " + expression);
};
const snap = async (name) => {
  const { data } = await send("Page.captureScreenshot",
    { format: "png", captureBeyondViewport: false });
  await writeFile(join(output, name), Buffer.from(data, "base64"));
};
const geometry = () => evaluate(`(() => {
  const c = document.querySelector(".stage canvas");
  if (!c || !c.width || !c.height) return null;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const {data,width,height} = ctx.getImageData(0,0,c.width,c.height);
  let colored = 0, sampled = 0;
  for (let y=0; y<height; y+=17) for(let x=0; x<width; x+=17) {
    const k=(y*width+x)*4;
    sampled++;
    if (data[k] + data[k+1] + data[k+2] > 110) colored++;
  }
  return {width,height,colored,sampled};
})()`);
try {
  await waitHttp("http://127.0.0.1:4173/");
  browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu-sandbox",
    "--disable-dev-shm-usage", "--hide-scrollbars",
    "--remote-allow-origins=*", "--remote-debugging-port=9222",
    "--user-data-dir=" + join(tmpdir(), "lifeforms-qa-" + process.pid),
    "about:blank",
  ], { stdio: "ignore" });
  const info = await waitHttp("http://127.0.0.1:9222/json/version");
  const version = await info.json();
  const targetRes = await fetch("http://127.0.0.1:9222/json/new?about:blank",
    { method: "PUT" });
  if (!targetRes.ok) throw Error("Could not create browser tab");
  const tab = await targetRes.json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const p = pending.get(message.id);
      clearTimeout(p.timer);
      pending.delete(message.id);
      if (message.error) p.reject(Error(JSON.stringify(message.error)));
      else p.resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown")
      failures.push(message.params.exceptionDetails.text);
    if (message.method === "Log.entryAdded" &&
      message.params.entry.level === "error")
      failures.push(message.params.entry.text);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride",
    { width: 1280, height: 820, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:4173/" });
  await until('document.querySelectorAll(".cards button.card").length === 4');
  await evaluate('document.querySelectorAll(".cards button.card")[3].click()');
  await until('document.querySelector(".stage canvas")?.width > 10');
  await until('document.querySelector(".controls .preset-row") !== null');
  await pause(1100);
  metrics.desktop = await geometry();
  if (!metrics.desktop || metrics.desktop.colored < 10)
    throw Error("Desktop canvas has too few visible bright pixels");
  if (!await evaluate(`Array.from(document.querySelectorAll('.preset-row button')).some(b=>b.textContent.includes("干涉"))`))
    throw Error("Index-space presets were not found");
  await snap("desktop-interference.png");
  await until(`Array.from(document.querySelectorAll('.preset-row button')).some(b=>b.textContent.includes("折叠"))`);
  process.stdout.write("QA action: desktop fold\\n");
  await evaluate(`Array.from(document.querySelectorAll('.preset-row button')).find(b=>b.textContent.includes("折叠")).click()`);
  await pause(750);
  metrics.fold = await geometry();
  if (!metrics.fold || metrics.fold.colored < 10) throw Error("Fold canvas is empty");
  await snap("desktop-fold.png");
  await until(`Array.from(document.querySelectorAll('.preset-row button')).some(b=>b.textContent.includes("水母"))`);
  process.stdout.write("QA action: jellyfish preset\\n");
  await evaluate(`Array.from(document.querySelectorAll('.preset-row button')).find(b=>b.textContent.includes("水母")).click()`);
  await pause(850);
  metrics.jellyfishDesktop = await geometry();
  if (!metrics.jellyfishDesktop || metrics.jellyfishDesktop.colored < 10)
    throw Error("Replacement jellyfish canvas is visually empty");
  await snap("desktop-jellyfish-interference.png");
  await until('document.querySelector(".life-primary") !== null');
  process.stdout.write("QA action: explore candidates\\n");
  await evaluate('document.querySelector(".life-primary").click()');
  await until('document.querySelectorAll(".life-candidate").length === 6');
  metrics.jellyfishPreviews = await evaluate(`(() => {
    const canvases = Array.from(document.querySelectorAll(".life-candidate canvas"));
    return canvases.filter(c => {
      const pix = c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      let hits=0;
      for (let i=0;i<pix.length;i+=80)
        if (pix[i]+pix[i+1]+pix[i+2]>110) hits++;
      return hits>8;
    }).length;
  })()`);
  if (metrics.jellyfishPreviews !== 6)
    throw Error("Jellyfish preview painter did not generate six visible candidates");
  process.stdout.write("QA action: apply candidate\\n");
  await evaluate('document.querySelector(".life-candidate").click()');
  await until('document.querySelector(".notice") !== null');
  metrics.candidates = await evaluate('document.querySelectorAll(".life-candidate").length');
  await send("Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  process.stdout.write("QA action: mobile reload\\n");
  await send("Page.reload");
  await until('document.querySelector(".stage canvas")?.width > 10');
  await until(`Array.from(document.querySelectorAll('.preset-row button')).some(b=>b.textContent.includes("水母"))`);
  process.stdout.write("QA action: jellyfish preset\\n");
  await evaluate(`Array.from(document.querySelectorAll('.preset-row button')).find(b=>b.textContent.includes("水母")).click()`);
  await pause(850);
  metrics.mobile = await geometry();
  metrics.horizontalOverflow = await evaluate(
    'document.documentElement.scrollWidth > window.innerWidth + 2');
  if (!metrics.mobile || metrics.mobile.colored < 4)
    throw Error("Mobile canvas has too few visible pixels");
  if (metrics.horizontalOverflow) throw Error("Mobile document overflows horizontally");
  await snap("mobile-jellyfish-interference.png");
  process.stdout.write("QA action: mobile screenshot captured\\n");
  if (failures.length) throw Error("Browser console errors: " + failures.join(" | "));
  metrics.browser = version.Browser;
  metrics.ok = true;
  await writeFile(join(output, "result.json"), JSON.stringify(metrics, null, 2));
  process.stdout.write("Browser QA passed: " + JSON.stringify(metrics) + "\n");
} catch (err) {
  metrics.ok = false;
  metrics.error = String(err);
  metrics.browserErrors = failures;
  await writeFile(join(output, "result.json"), JSON.stringify(metrics, null, 2));
  process.stderr.write("Browser QA failed: " + String(err) + "\n");
  process.exitCode = 1;
} finally {
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  browser?.kill();
  server.kill();
}
