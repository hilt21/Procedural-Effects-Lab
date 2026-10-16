# Architecture and decisions

```mermaid
flowchart TD
  Registry[Experiment registry] --> Catalog[Static catalog]
  Registry --> Workbench[React workbench]
  Workbench --> State[Validated configuration]
  Workbench --> Runtime[Fixed-step runtime]
  State --> Renderer[Lazy effect module]
  Runtime --> Renderer
  Renderer --> Canvas[Canvas 2D or WebGL]
```

- `registry.ts`: experiment metadata, controls, presets, schema validation, dynamic imports.
- `main.tsx`: directory, filtering, workbench controls, share and JSON actions.
- `core.ts`: renderer contract, seeded random source, reflection, exact line-length reservation, lifecycle scheduling.
- `effects/`: independent renderers, without React imports.
- `public/baseline/`: unchanged original light prototype for comparison.

## State ownership

React owns selected experiment, parameters, seed, pause preference, and UI state. Renderers own simulation and rendering resources. The runtime owns scheduling. The URL is a serialized configuration snapshot, updated on share, selection, or import. Slider changes remain local until shared. Invalid URL configuration displays an explanatory message instead of starting an unknown experiment.

## Lifecycle

Selecting an experiment cancels pending initialization of the previous selection. On unmount the ResizeObserver, animation frame, visibility listener, reduced-motion listener, pointer listener, and GPU resources are disposed by their owning layer. An async module resolving after unmount does not create a renderer. A paused or hidden experiment has no scheduled animation frames.

## Rendering choice

The UI uses React, while renderer modules use native browser APIs. Chromatic drift uses a fullscreen WebGL triangle rather than a 3D engine: it needs no scene graph, camera, meshes, or imported models. Future experiments can dynamically import Three.js when those capabilities are needed. This keeps the MVP's effect dependencies small.

## Density budget

Angular light trails reserve each incremental segment before committing movement. Segments are split at their exact intersections with grid boundaries; interval length is added to the corresponding cell. Rebuilding occupancy and incremental admission therefore use the same geometric measure. A failed admission stops the ray and starts its decay. Settings that reduce capacity reset the experiment immediately. Count includes both growing and fading rays.

Particle movement updates a cell occupancy map sequentially and refuses entry into a full destination cell. It limits particle-center concentration; it does not impose a hard luminance or trail-length budget.

## Reproducibility

A seeded LCG and a fixed simulation timestep provide repeatable CPU simulation at a given viewport. Configurations are versioned, bounded, and quantized to control steps. GPU output can differ by implementation. Resize resets simulation. Manual emitter relocation and playback time are intentionally not serialized in v1 and are disclosed in the UI.

## Deployment

Vite emits a static `dist` with separate lazy effect chunks. Relative asset URLs permit subpath hosting. The Sites manifest declares `dist`; no server bindings or credentials are required. GitHub CI runs tests/build and retains the static artifact. It does not claim browser coverage or automatically publish to a second hosting provider.
