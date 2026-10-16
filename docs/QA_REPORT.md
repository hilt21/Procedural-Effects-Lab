# QA report

Date: 2026-10-16. Scope: first modular collection MVP.

## Automatically verified

- TypeScript strict type checking and Vite production build.
- 19 Vitest checks in two test files.
- All nine presets survive JSON serialization and schema validation unchanged.
- Invalid versions, effects, seeds, missing parameters, non-finite and out-of-range values are rejected.
- Mirror reflection preserves diagonal direction magnitude and is reversible.
- Global and local reservations reject excess geometry atomically.
- Three light presets simulated for 1,200 fixed steps each: count, global length and every-cell capacity stay within limits.
- Generated diagonal draw segments retain their 45° constraint.
- Same seed, viewport and simulation duration repeat light metrics.
- Reducing limits applies immediately.
- Runtime stops scheduling when paused, hidden or reduced motion is enabled; resume schedules one loop; disposal removes lifecycle effects.
- Original baseline remains byte-identical to the imported HTML.
- Production build emits separate effect chunks. No external font or runtime CDN is required.

The rendering tests use a stub Canvas context. They verify simulation and lifecycle contracts, not actual pixels or GPU behavior.

## Defects found and corrected

1. Sparse preset speed (175) did not align with a slider step of 10. JSON import changed it to 180. Slider step changed to 5; all presets now round trip.
2. Rebuilding density by resampling an entire line assigned slightly different cell lengths than incremental sampling, briefly exceeding local capacity. Replaced sampling with exact grid-boundary intersection partitioning. All three presets now pass 1,200-step capacity tests.
3. Paused simulation initially retained a rendering loop. Runtime now cancels animation scheduling while paused or hidden.

## Browser QA attempted, blocked

- Managed preview supervisor reports running at `http://terminal.local:4173/`.
- Initial cloud-browser visit before preview startup returned `ERR_CONNECTION_REFUSED`.
- After supervisor startup, the cloud browser returned `ERR_BLOCKED_BY_CLIENT`.
- Supervisor status still reported running. No working application page, screenshot, console record, or UI interaction could be obtained.
- This is an environment access blocker, not evidence that application UI passed or failed.

## Manually verified

No real-browser or real-device checks completed in this session. Source review checked lifecycle ownership, dynamic imports, native accessible labels, relative build asset paths, and static fallback code; this is not visual verification.

## Still unverified

- Actual desktop/mobile appearance and screenshot comparison.
- Search, filters, sliders, pause, back navigation, share clipboard, JSON upload/download and fullscreen in a real browser.
- WebGL compile/render behavior, unsupported context fallback and context loss on hardware.
- Chromium/Safari performance, memory behavior over repeated switches, and real iPhone touch behavior.
- Keyboard navigation, screen readers, 400% zoom, and reduced-motion behavior in a real browser.
- Deployment HTTP and visual behavior beyond the hosting provider's deployment result.

## Next browser test sequence

1. Open directory at 1440×900 and 390×844; check overflow, focus and poster layout.
2. Filter each category, search a title and a no-match term, then clear.
3. Open every experiment; change each control and preset; pause/reset; return and switch repeatedly.
4. Share, reload the URL, and compare configuration. Export/import JSON and try invalid version and out-of-range data.
5. Inspect light budgets for at least 20 seconds in each preset; compare paused frames and seeded resets.
6. Test hidden tabs, reduced motion, WebGL disabled/context loss, mobile fullscreen fallback, and console errors.
7. Capture desktop/mobile screenshots, failed steps and device-specific performance results.
