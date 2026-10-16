# Procedural Effects Lab

A growing browser-based visual effects laboratory. The initial experiment is Angular Light Lab, a self-contained Canvas 2D prototype.

## Run the current experiment

Open `index.html` directly in a modern browser, or serve this directory with `python3 -m http.server 8000`.

## Angular Light Lab

- Exact 45-degree diagonal segments with viewport-boundary mirror reflection.
- Trail population cap, global visible-length budget, and local grid density control.
- Sparse, balanced, and burst presets; live controls; pause and regenerate.
- Click or tap the canvas to move the emitter.
- Responsive control panel and density diagnostics.

The reflection is two-dimensional viewport-boundary reflection. It does not implement depth-buffer screen-space reflections, character occlusion, or ground reflection.

## Status

The original standalone prototype is preserved as the initial baseline. A multi-experiment architecture is under research; no collection migration has been implemented yet.

Validation on import: inline JavaScript passes `node --check`; file contents match the supplied prototype. Browser behavior has not been re-tested in this import session.
