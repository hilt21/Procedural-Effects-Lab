import type { Factory } from "../core";
export const create: Factory = (canvas, initial, seed) => {
  let p = { ...initial },
    t = 0,
    lost = false;
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: false,
  });
  const fallback = () => {
    canvas.style.background =
      "radial-gradient(ellipse at 70% 20%,#c0a8e4,transparent 65%),radial-gradient(ellipse at 10% 90%,#345d83,#24203f)";
  };
  if (!gl) {
    fallback();
    return {
      update(n) {
        p = n;
      },
      step() {},
      draw() {},
      resize() {},
      reset() {},
      destroy() {
        canvas.style.background = "";
      },
      metrics() {
        return { items: 0 };
      },
    };
  }
  const compile = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const msg = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw Error(msg || "着色器编译失败");
    }
    return s;
  };
  const vs = compile(
      gl.VERTEX_SHADER,
      "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}",
    ),
    fs = compile(
      gl.FRAGMENT_SHADER,
      `precision mediump float;uniform vec2 resolution;uniform float time,scale,warp,grain,hue,seed;void main(){vec2 uv=gl_FragCoord.xy/resolution;vec2 q=(uv-.5)*vec2(resolution.x/resolution.y,1.)*scale;float z=time+seed;for(int i=1;i<4;i++){float f=float(i);q+=warp*.25*vec2(sin(q.y*f+z*.4),cos(q.x*f-z*.3))/f;}float k=sin(q.x+sin(q.y+z*.25))+cos(q.y*1.4-z*.2);vec3 a=vec3(.36,.43,.63),b=vec3(.29,.23,.22);vec3 c=a+b*cos(6.28318*(k*.18+vec3(0.,.13,.3)+hue/360.));float n=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);c+=(n-.5)*grain/400.;c*=.7+.3*(1.-smoothstep(.1,1.,distance(uv,vec2(.5))));gl_FragColor=vec4(c,1.);}`,
    );
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error("着色器链接失败");
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  let currentSeed = seed;
  const lostContext = (e: Event) => {
    e.preventDefault();
    lost = true;
    fallback();
  };
  canvas.addEventListener("webglcontextlost", lostContext);
  return {
    update(n) {
      p = { ...n };
    },
    step(dt) {
      t += (dt * p.speed) / 40;
    },
    reset(s) {
      currentSeed = s;
      t = 0;
    },
    resize(w, h, dpr) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (!lost) gl.viewport(0, 0, canvas.width, canvas.height);
    },
    draw() {
      if (lost) return;
      gl.useProgram(program);
      gl.uniform2f(
        gl.getUniformLocation(program, "resolution"),
        canvas.width,
        canvas.height,
      );
      for (const [k, v] of Object.entries({
        time: t,
        scale: p.scale,
        warp: p.warp,
        grain: p.grain,
        hue: p.hue,
        seed: (currentSeed % 10000) / 1000,
      }))
        gl.uniform1f(gl.getUniformLocation(program, k), v);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    metrics() {
      return { items: 1, load: 0, peak: 0 };
    },
    destroy() {
      canvas.removeEventListener("webglcontextlost", lostContext);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      canvas.style.background = "";
    },
  };
};
