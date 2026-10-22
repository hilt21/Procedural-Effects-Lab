# Procedural Effects Lab

Explore, tune, and reproduce browser visual effects. A static React + TypeScript + Vite application, with framework-independent renderers loaded on demand.

## Experiments

| Experiment           | Renderer  | What to explore                                                                                  |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| Angular light trails | Canvas 2D | Exact 45° paths, directional persistence, viewport reflection, global and local geometry budgets |
| Flow field particles | Canvas 2D | Seeded particles, procedural vector fields, cell occupancy, trails                               |
| Chromatic drift      | WebGL     | Fullscreen fragment shader, color fields, warp, grain, static fallback                           |
| Procedural lifeforms | Canvas 2D | Original parametric and index-space mathematical organisms, looping motions, particle budgets, and morphology search |

## Procedural lifeforms

The fourth experiment contains three connected capabilities: deterministic, high-density index-space point fields (including a folded jellyfish) alongside three-dimensional point-cloud morphology (a sinuous abstract organism); both anemone and fish now use folded index-space fields, periodic local deformation plus a closed global path, and seeded morphology exploration with a diversity-aware heuristic. Six generated candidates can be previewed and applied as normal shareable experiment parameters.

Users may optionally select a local reference image. The browser estimates its foreground width-to-height ratio from color contrast with the corners. The photo is neither sent to a server nor embedded in URLs or JSON. It cannot recover anatomical structure, determine semantic species, or guarantee faithful reconstruction. Candidate scores are heuristic, not AI-generated aesthetic rankings. Low-contrast or cluttered images can fail, and the interface reports this.

**Inspiration:** [@yuruyurau](https://x.com/yuruyurau?s=21) and the broader mathematical-generative-art tradition. All geometry and motion formulas here were independently written, with no copying of original sketch code.

## Index-space interference studies (2026-10)

Two additional specimens (**干涉** and **折叠**) derive an original mathematical point-map from a fixed index domain. All points are computed directly as functions of index, parameters, seed and time. Incommensurate spatial frequencies generate dense interference bands and organic folds; no hand-drawn model, texture, scene graph or fluid solver is needed.

- The original index domain is preserved when level of detail decreases, so the whole form does not collapse into a truncated prefix.
- The same painter is used in the real-time canvas and morphology candidate thumbnails.
- Phase functions are commensurate with the shared 12-second animation period and explicitly tested at the loop seam.
- Interference intentionally allows spatial overdraw; local particle rejection would erase its fine interference structure. Alpha compositing limits displayed channel values, and adaptive global sampling reduces frame cost.
- They are **independently developed mathematical studies**, not licensed ports, source-code copies, or guaranteed pixel matches to any specific artist's sketch.
- Reference reading: [@yuruyurau on X](https://x.com/yuruyurau?s=21), [generative sea creatures analysis](https://games.studio23.london/blog/generative-sea-creatures/). The artist has publicly expressed reservations about reuse and publishing copies. Attribution does not grant a license. Reproducing a specific sketch faithfully for public distribution would require clarification of permission.

## Jellyfish interference replacement (2026-10)

The existing `shape=0` jellyfish preset now renders a new independently authored index-space field via `src/effects/lifeforms-jellyfish-field.ts`. It preserves existing URLs and JSON snapshots without adding parameters or changing schema versions. The former manually sculpted 3D shell is bypassed at runtime.

The field contains three intrinsically related index-space domains: 53% rippling bell membrane, 24% folded oral ribbons, and 23% trailing filament families. Spatially coupled wave interference, phase delays and alpha accumulation create dense material texture without per-cell culling. All terms close after twelve simulated seconds. Adaptive sampling works across the *entire* stable index domain. The main renderer and candidate thumbnails call the same evaluator and painter.

**The change is a visual reinterpretation, not a licensed recreation of any particular @yuruyurau animation.** Source sketches were not copied. Existing “干涉” and “折叠” shapes remain untouched.

## High-density interference anemone (2026-10)

The existing **`shape=1`** anemone has been replaced with a distinct mathematical point-field using the same renderer as the approved jellyfish, interference and folded field. Its three index regions are 35% breathing folded core, 22% short crown bands and 43% outward/upward filament families. Correlated six-fiber bundles form dense interference texture and phase-delayed movement without per-cell point rejection. Spatially complete adaptive LOD, 12-second closure, seed determinism and thumbnail/main-canvas parity are tested. The original `shape=1` ID and JSON keys are preserved, so saved URL configurations remain importable. The "干涉" and "折叠" formulas are unchanged. This is an independently written mathematical interpretation, credited to [@yuruyurau](https://x.com/yuruyurau?s=21) for creative inspiration, not a licensed reproduction.

## Interference fish swimmer (2026-10)

The existing **`shape=2`** fish now uses an independent index-space mathematical organism, rendering through the shared alpha-accumulating painter. Its shape is anchored by a coherent head-facing-right body axis while dense high-frequency folds give the surface its interference texture. Three domains form 58% tapered folded body, 20% dorsal / ventral / pectoral fins plus gill / eye detail, and 22% forked caudal fin and restrained wake. A stronger traveling wave reaches the tail before the head, preserving recognizability during the 12-second seamless loop.

The main canvas and candidate gallery evaluate the exact same point sampler, with global index-domain LOD on mobile. Existing `shape=2` URLs, seeds, exported JSON and slider keys remain compatible. The accepted jellyfish, anemone, "干涉" and "折叠" formulas are untouched. The mathematics is independently authored, with inspiration credited to [@yuruyurau](https://x.com/yuruyurau?s=21) and no reuse of original sketches.

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
