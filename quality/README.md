# Repeatable visual review

The latest bounded task is [Station Development 1](./STATION_DEVELOPMENT_1.md). Generate its source-derived debug SVG and spatial JSON from the repository root:

```text
node --experimental-strip-types tools/build-station-debug.mjs
```

Then run the existing development task, keep the browser tab visible, and execute:

```js
const stationReview = await (await import('/tools/station-browser-checks.mjs')).review();
console.log(JSON.stringify(stationReview, null, 2));
```

This saves 12 actual canvas views plus the debug PNG and checks real player walking up/down, rendered headroom at all route waypoints, original camera starts, platform/building separation, shader links, loaded assets, a 600-second generated-world simulation and station frame timing at 1920 × 1080 / pixel ratio 1. [station1-measurements.json](./station1-measurements.json) is the recorded result. The review is development-only and does not enter the production bundle. A hidden tab is reported as unavailable timing rather than treated as benchmark evidence.

The previous [signage/store review](./KONBINI_REVIEW.md) and its inherited `konbini-*-before` captures are retained. With a dedicated local Chrome CDP page at port 9333, `node tools/konbini-review.mjs --review` regenerates matching `*-after` images plus actual-font, schedule, surface, generated-world and performance checks in [konbini-measurements.json](./konbini-measurements.json). Keep the temporary browser profile outside the workspace to avoid development reloads from profile writes.

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

## Ranked visual-review pass

The latest review is [VISUAL_REVIEW.md](../VISUAL_REVIEW.md). The `review2-*` captures retain its before/after evidence; [review2-measurements.json](./review2-measurements.json) stores browser intervals, GPU timer queries, the controlled contact pixel check and simulation results.

For an explicit static fixture study:

```js
city.setContactShading(false);
await city.captureBenchmark('fixture-off', 'nightlife', 21, {
  eye: [-13.2, 1.82, -27.1], target: [-13.2, 4.1, -22.65], fov: 38
});
city.setContactShading(true);
await city.captureBenchmark('fixture-on', 'nightlife', 21, {
  eye: [-13.2, 1.82, -27.1], target: [-13.2, 4.1, -22.65], fov: 38
});
```

An optional fourth capture argument supplies a study framing without changing any gameplay camera preset. The contact effect also has a URL opt-out, `?ao=0`. Existing road-reflection controls remain separate.
