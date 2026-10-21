# Procedural Effects Lab

Explore, tune, and reproduce browser visual effects. A static React + TypeScript + Vite application, with framework-independent renderers loaded on demand.

## Experiments

| Experiment           | Renderer  | What to explore                                                                                  |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| Angular light trails | Canvas 2D | Exact 45° paths, directional persistence, viewport reflection, global and local geometry budgets |
| Flow field particles | Canvas 2D | Seeded particles, procedural vector fields, cell occupancy, trails                               |
| Chromatic drift      | WebGL     | Fullscreen fragment shader, color fields, warp, grain, static fallback                           |
| Procedural lifeforms | Canvas 2D | Three original parametric lifeforms, looping motions, local particle budgets, and morphology search |

## Procedural lifeforms

The fourth experiment contains three connected capabilities: deterministic, high-density three-dimensional point-cloud morphology (jellyfish, anemone, fish, and a sinuous abstract organism), periodic local deformation plus a closed global path, and seeded morphology exploration with a diversity-aware heuristic. Six generated candidates can be previewed and applied as normal shareable experiment parameters.

Users may optionally select a local reference image. The browser estimates its foreground width-to-height ratio from color contrast with the corners. The photo is neither sent to a server nor embedded in URLs or JSON. It cannot recover anatomical structure, determine semantic species, or guarantee faithful reconstruction. Candidate scores are heuristic, not AI-generated aesthetic rankings. Low-contrast or cluttered images can fail, and the interface reports this.

**Inspiration:** [@yuruyurau](https://x.com/yuruyurau?s=21) and the broader mathematical-generative-art tradition. All geometry and motion formulas here were independently written, with no copying of original sketch code.

## Development

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
npm test
npm run build
```

`dist/` is a static build. No backend, database, API keys, remote fonts, or runtime CDN requests are required. The original standalone light experiment is preserved at `public/baseline/angular-light-lab.html` and is available at `/baseline/angular-light-lab.html` in a deployment.

## Add an experiment

1. Add a renderer under `src/effects/` implementing the `Effect` interface from `src/core.ts`.
2. Register metadata, controls, presets, and a dynamic loader in `src/registry.ts`.
3. Add a static poster in `src/main.tsx` and describe the mechanism and limitations.
4. Validate preset round trips, deterministic behavior, resource disposal, and browser behavior.

The shared lifecycle is `resize → step/draw → update/reset → destroy`. Renderers receive a container-sized canvas and must release their own listeners and GPU resources. The runtime owns one animation loop, fixed 1/60s simulation steps, visibility suspension, and reduced-motion handling. Pause stops scheduling frames. Slow frames use at most six simulation steps, so simulation time may lag real time.

## Configuration

Share links and JSON contain schema version, effect ID, effect version, seed, and validated parameters. Imports reject unsupported versions, unknown effects, invalid seeds, and missing/out-of-range parameters. Reproduction requires equal viewport dimensions and parameters. Playback time, moved emitter coordinates, GPU pixel output, and resize history are not saved.

## Important boundaries

- Light reflections are 2D viewport-boundary reflections, with no depth-buffer SSR.
- Light density uses unweighted geometric line length. Exact grid intersections partition each segment; growth reserves global and per-cell capacity before admission. Old geometry retains capacity until removed, even as it fades. This is a conservative geometric budget, not a pixel brightness limit.
- Particle density is based on particle centers, not accumulated trail brightness. The vector field is procedural, not a physical fluid solver.
- Shader code uses native WebGL without Three.js or R3F. Unsupported or lost WebGL contexts display a static CSS gradient.
- DPR is capped at 1.5. The directory uses static posters and never runs all experiments at once.
- Lifeform loops close at twelve seconds at 50% playback speed. Shapes use procedural 3D coordinates projected onto a 2D canvas; no fluid simulation or anatomical reconstruction is involved. Adaptive sampling responds to measured render cost, so displayed point count may be below requested point count. A per-cell particle cap limits visual accumulation. A selected photo is transient and does not persist across page reloads.

## Verification

See [QA report](docs/QA_REPORT.md) for verified checks, an environment blocker, and pending browser/device verification. Successful unit tests and builds do not constitute browser QA.

## License

Project source: MIT. React and React DOM: MIT. The modular effects are independently implemented; no React Bits, Vanta, tsParticles, VFX-JS, or ShaderGradient components were copied.
