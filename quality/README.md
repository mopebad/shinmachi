# Repeatable visual review

The latest [Yoto After Dark](./NIGHTLIFE_DEVELOPMENT_3A.md) includes [matched comparisons and actual walk/audio recording](./YOTO_REVIEW.html), real basement/stair geometry, licensing and spatial validation. Use a fresh `?view=7&seed=8412&review=1` page and import the [Yoto helper](../tools/yoto-browser-checks.mjs): `audit()`, `captureSet('after')`, `validateCaptures()` and `simulationTest()`. Enable sound with the existing button, then run `playbackTest()` and `recordWalk()` in a visible tab. The walkthrough uses the real walking controller throughout; MP4 and PCM sidecar have adjacent position/audio state traces. Preserve original before captures. Ordinary play uses `?view=7&seed=8412`, 21:00, with the B1 entrance near X 19.5 / Z −27.5.

The latest [City Development 2B](./CITY_DEVELOPMENT_2B.md) differentiates the existing commercial, station, residential and restaurant areas. Its [nine-pair comparison viewer](./NEIGHBORHOOD_REVIEW.html) includes day/night housing, Hero Street, station, restaurant alley, transition and overview views. From a fresh `?view=8&seed=8412&review=1` page, import the [neighborhood helper](../tools/neighborhood-browser-checks.mjs), then run `captureSet('after')`, `audit()`, `replayGeometry()`, `validateCaptures()` and `exercise()`. [Spatial validation](./neighborhood-geometry-audit.json), [two-load simulation results](./neighborhood-simulation-audit.json), [live frame timing](./neighborhood-frame-timing.json) and [research credits](./references/neighborhoods/README.md) are included. Preserve original before captures. Camera/render conditions match; actor routes can differ under revised district preferences.

The preceding [Environment Development 1B](./ENVIRONMENT_DEVELOPMENT_1B.md) adds the railway/station district. Its [comparison viewer](./RAIL_DISTRICT_REVIEW.html) contains nine fixed before/after pairs plus actual arrival, service-lane, under-rail and forecourt close-ups. The [rail district helper](../tools/rail-district-browser-checks.mjs) runs `audit()`, `captureSet('after')`, `validateCaptures()`, `performanceReview()` and `exchange()` from a fresh `?view=2&seed=8412&review=1` page. [Spatial validation](./rail-district-geometry-audit.json), [two-load passenger closure results](./rail-district-passenger-audit.json), [performance](./rail-district-performance.json) and licensed [references](./references/rail-district/README.md) are included. Keep the tab visible while timing; preserve the original before captures.

The preceding [Skyline Development 1A](./SKYLINE_DEVELOPMENT_1A.md) includes eight matching before/after pairs, [Hero Street](./captures/skyline-hero-night-after.png), [district overview](./captures/skyline-overview-day-after.png), licensed [Tokyo reference photographs](./references/skyline/README.md), [spatial/replay validation](./skyline-validation.json) and rendering measurements. The [skyline helper](../tools/skyline-browser-checks.mjs) runs `captureSet('after')`, `validate()` and `gpuCost()` from a fresh `?view=8&seed=8412&review=1` page. Keep the tab visible while timing.

The latest [living-city behavior pass](./LIVING_CITY_BEHAVIOR.md) includes [before](./captures/behavior-hero-before.png) / [after](./captures/behavior-hero-after.png), [live hero recording](./captures/behavior-hero-sequence.mp4), activity/traffic/station recordings with audio and adjacent state traces, and [generated-world measurements](./behavior-generated-audit.json). Use the [behavior browser helper](../tools/behavior-browser-checks.mjs) on `?view=8&seed=8412&review=1`; enable sound, set the required camera/clock, then call `record(window.__shinmachi, 'review-name', 20)`. It records actual live canvas/Web Audio output and pauses afterward. `generatedAudit(window.__shinmachi)` checks a separate 1,200-second simulation without changing the displayed population. See the report for safety contracts, results and limits.

The preceding pass is [Hero Street 2A: vehicle families](./HERO_STREET_2A_VEHICLES.md). It includes [night before](./captures/vehicles-hero-before.png) / [after](./captures/vehicles-hero-after.png), matching day comparisons, fourteen day/night close-up pairs and traffic-phase captures. Open `http://127.0.0.1:5173/?view=8&seed=8412&review=1` on the development server, then run:

```js
const vehicles = await (await import('/tools/vehicle-browser-checks.mjs')).review();
window.__shinmachi.setReviewPaused(false);
```

The development-only `review=1` query pauses before simulation starts. The helper replays to clock 300 for the comparison, photographs actual spawned families, and checks 1,500 seconds of generated-world traffic and station journeys. [Measurements](./vehicle-measurements.json) include geometry budgets, capture conditions and synchronous render cost; [visible frame timing](./vehicle-frame-timing.json) is a separate desktop sample. See the report for dimensions, research sources, visual limitations and performance tradeoffs.

The preceding architecture pass is [Hero Street Development 1](./HERO_STREET_DEVELOPMENT_1.md): select **09 / Shinmachi Hero Street**, or open `http://127.0.0.1:5173/?view=8&seed=8412`. It preserves the existing commercial camera at 20:30 with After Rain and reflections. [Before](./captures/hero-street-before.png) and [after](./captures/hero-street-after.png) are actual 1080p WebGL captures. Reload that URL, then run:

```js
window.__shinmachi.setReviewPaused(true);
const heroReview = await (await import('/tools/hero-street-browser-checks.mjs')).review();
window.__shinmachi.setReviewPaused(false);
```

This refreshes final captures and [measurements](./hero-street-measurements.json), preserves pre-edit evidence, compares city spatial contracts and validates new scenery against routes and actual pedestrian volumes. See the report for exact settings, the ranked visual audit, simulation regression results and remaining limits.

The station simulation baseline remains [Station Development 3C](./STATION_DEVELOPMENT_3C.md). In a freshly loaded page on the existing development server, run:

```js
const passengerReview = await (await import('/tools/station3c-browser-checks.mjs')).review();
window.__shinmachi.setReviewPaused(false);
```

This saves [passenger measurements](./station3c-measurements.json) and ten actual 1080p captures of waiting, alighting, boarding, interior occupancy, secured doors, moving riders and city reentry. It validates all six rendered approaches, twelve standing-position paths, actual human parts near thresholds and a 1,200-second generated-world run plus 600-second service-closure drain. The saved run completes 24 boardings, 48 alightings and 80/80 admitted journeys with zero unsafe departures or crossing/occupancy failures.

Earlier reviews below are historical milestone procedures. Their timed-visitor and disabled-boarding assumptions predate 3C; use the current passenger review above against the current simulation. Their saved measurements and captures remain available.

The preceding task was [Station 3B.5](./STATION_DEVELOPMENT_3B_5.md):

```js
const accessReview = await (await import('/tools/station35-browser-checks.mjs')).review();
```

This saves [access measurements](./station35-measurements.json), six actual open-door approach close-ups and two frontage/guard views. It validates real body volumes, triangle rays, floor support, sill alignment, the normal platform/train gap, retained guards, nine arrival/departure cycles and the existing 35/35 visitor closure regression. Physical access is conditional on a stopped, aligned train with fully open doors; NPC boarding remains disabled for Station 3C. Resume automatic stepping afterward with `window.__shinmachi.setReviewPaused(false)`.

The previous [Station Development 3B](./STATION_DEVELOPMENT_3B.md) door review remains available:

```js
const doorReview = await (await import('/tools/station3b-browser-checks.mjs')).review();
```

This saves [door measurements](./station3b-measurements.json) and seven actual 1080p captures, including closed/opening/open/closing close-ups of one doorway during a live train cycle. It validates nine generated-world door cycles, actual leaf/body clearances, real aperture/floor rays, a 60-second obstructed close and the retained station pedestrian regression. Door state and world-space openings come from the train simulation. Resume automatic stepping afterward with `window.__shinmachi.setReviewPaused(false)`.

The previous [Station Development 3A](./STATION_DEVELOPMENT_3A.md) stopping review remains available:

```js
const trainReview = await (await import('/tools/station3-browser-checks.mjs')).review();
```

This saves [measurements](./station3-measurements.json) and 11 actual 1080p captures, follows one complete train cycle and three further arrivals, validates 1,500 seconds of train operation and repeats the 1,200-second station pedestrian run plus 600-second closure drain. Every capture has paired train state, position, velocity, stopping error and simulation clock. The review pauses automatic simulation stepping while advancing the same live state explicitly; resume with `window.__shinmachi.setReviewPaused(false)`. No FPS claim is made by this review.

The prior [Station Development 2](./STATION_DEVELOPMENT_2.md) can still be reproduced:

```js
const stationReview = await (await import('/tools/station2-browser-checks.mjs')).review();
console.log(JSON.stringify(stationReview, null, 2));
```

This validates 1,200 open seconds and a 600-second closure drain against actual generated district bounds, then follows one live NPC through 12 actual 1080p captures. It checks gate ownership, physical movement, separation, city safety/liveness, rendered support surfaces, simulation/presentation alignment and camera starts. [The saved result](./station2-measurements.json) includes lifecycle histories, waits and capture observations. A hidden tab skips frame timing instead of waiting indefinitely or claiming a benchmark.

Enable the optional development overlay with `?stationDebug=1`, or `window.__shinmachi.activity.setStationDebug(true)`; pass `false` to hide it. It shows graph connections, flights, waiting destinations, passenger paths/state labels and free/occupied gates. No HUD controls are added. [The navigation export](./station2-navigation.json) records the actual generated graph used in the reviewed run.

The architecture milestone is [Station Development 1](./STATION_DEVELOPMENT_1.md). Generate its source-derived debug SVG and spatial JSON from the repository root:

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

[SHINDO 3B gallery](./SHINDO_REVIEW.html) contains three fixed-camera before/after pairs, seven final venue views and the real local-music controls. [Short notes and music setup](./SHINDO_3B.md).

[SHINDO 3C listening-bar gallery](./SHINDO_3C_REVIEW.html) adds four comparisons, eight final views and a silent recording of actual playback-driven details. [Concise implementation and validation notes](./SHINDO_3C.md).

[SHINDO 3D gallery](./SHINDO_3D_REVIEW.html): restrained signage, a single-deck selector, warmer bar details and real in-world music controls. [Short notes](./SHINDO_3D.md).

[SHINDO 3E stair correction](./SHINDO_3E_REVIEW.html): four camera-matched comparisons, the geometry-only flicker fix and an actual walking-camera recording.
