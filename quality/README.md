# Repeatable visual review

Run the existing development task. In the browser console, with the tab visible:

```js
const city = window.__shinmachi;
await city.assetsReady;
await city.captureBenchmark('nightlife-pass1-final', 'nightlife', 21);
await city.measurePerformance(5);
```

The capture renders the real scene at 1920 × 1080, with pixel ratio 1 and no HUD. The development server writes a paired PNG and JSON under [captures/](./captures/). The JSON records seed, clock, simulation clock, camera quaternion/FOV, viewport, renderer counts, surface mode and loaded assets. Compare the same seed, camera and clock; moving agents continue to run, so captures are composition benchmarks rather than pixel-identical simulation replays.

Available views are `nightlife`, `tower`, `alley`, `residential`, `station`, `overview`, `commercial` and `elevatedRail`. The ground-level railway crossing is **pending**; the elevated railway is a different review subject. The existing seven presets are retained, and nightlife is preset 8.

For performance, use a 1920 × 1080 browser viewport at pixel ratio 1. Allow the shader and model loading to finish. The measurement waits 60 animation frames, then records raw frame intervals. Report elapsed time, aggregate FPS, median, p95, p99 and worst interval with browser/GPU label and draw counts. These timings do not isolate GPU work. Captures should be saved separately from the timed interval.

Review the primary reference alongside the before and after images. List the three to five most visible differences, make targeted changes, then repeat. [QUALITY_REPORT.md](../QUALITY_REPORT.md) records the actual results and limitations.

The capture middleware only runs in Vite development mode; production builds do not expose a filesystem-writing endpoint.
