# Station Development 3A — accurate train stopping

Completed 3 November 2026 (Toronto; capture metadata uses UTC). The existing train now approaches, brakes, stops at the platform, dwells, prepares departure and accelerates into normal running. The retained station architecture, pedestrian visits, fare-gate reservations, stairs, waiting destinations, city traffic and shops remain functional. No boarding, alighting or operating doors are included.

## Audit and geometry decision

Reviewed [CommuterRail.ts](../src/world/simulation/CommuterRail.ts), [CityWorld.ts](../src/world/CityWorld.ts), [CitySimulation.ts](../src/world/simulation/CitySimulation.ts), [StationLayout.ts](../src/world/generation/StationLayout.ts), [StationNavigation.ts](../src/world/simulation/StationNavigation.ts), [CityActivity.ts](../src/world/simulation/CityActivity.ts), [WorldRules.ts](../src/world/simulation/WorldRules.ts), the railway/station renderers, and [Station Development 1](./STATION_DEVELOPMENT_1.md) / [Station Development 2](./STATION_DEVELOPMENT_2.md).

Previously, the train was four 12.8 m car bodies at 13.1 m center spacing. Its X coordinate was `((simulation.clock * 9) % 330) - 130`: constant eastbound 9 m/s motion, then an instantaneous wrap from 200 to -130. Rendering hid it immediately outside service hours, although its simulation coordinate kept moving. There was no arrival, stopping target or dwell. The architecture handoff's approximately 52.1 m measurement described the bodies; projecting cab lamps extend the actual overall envelope to **52.225 m**.

The platform is 53.5 m long, x = 8–61.5. This task excludes one metre at each guarded end, giving a **51.5 m usable frontage**, x = 9–60.5. The old train exceeds that frontage by **0.725 m**. Its allowable center interval would be [35.1125, 34.3875], which is empty. Merely centering that train on the slab would not supply safe end margins.

The smallest configuration correction is to remove one existing carriage, retain its dimensions/details, recenter the remaining bodies and move the end-cab details to their new ends. Pantographs stay on the outer cars. [RailGeometry.ts](../src/world/simulation/RailGeometry.ts) supplies the same carriage centers, door offsets, cab ends and dimensions used by the actual renderer and operation checks. Station geometry and track alignment are unchanged.

| Measurement | Selected geometry |
| --- | --- |
| Carriages / body length | 3 / 12.8 m each |
| Center spacing / body gap | 13.1 m / 0.30 m |
| Body envelope / overall rendered length | 39.000 m / **39.125 m**, including end lamps |
| Actual browser instance-bound length | 39.1250018 m; float32 matrix rounding |
| Maximum rendered width | 2.890 m, including handles |
| Usable platform | x = 9–60.5; 51.5 m |
| Allowable train-center stopping envelope | x = **28.5625–40.9375** |
| Target center / accepted error | x = **34.75 m** / **±0.05 m** |
| Stopped train extremities | x = **15.1875–54.3125** |
| Margin inside each usable end | **6.1875 m**; at least 6.1375 m at accepted tolerance |
| Track alignment / directions | z = -57; eastbound +X and westbound -X |
| Rail head / platform and door sill | y = 7.02 / y = **7.455** |
| Platform-facing handle extremity | z = -55.555 |
| Minimum train-to-platform horizontal clearance | **55 mm**; actual uploaded-instance check: 55.0008 mm |

Each carriage has two existing static doors on each side. Door leaves are 1.06 m wide; their backing recesses are 1.13 m. Center offsets within each car are ±3.6 m. At the stop, platform-side door centers are x = **18.05, 25.25, 31.15, 38.35, 44.25, 51.45**. All leaves and recesses lie inside the usable frontage. The entire train, rather than only its doors, fits inside it. The static platform screen remains between pedestrians and train; its track-facing glass surface at z = -55.415 is 140 mm from the projecting handles. There is no boarding opening or door animation yet.

## Authoritative operation

[TrainOperation.ts](../src/world/simulation/TrainOperation.ts) is browser-independent and advances inside the existing CitySimulation 30 Hz step. [CityActivity.ts](../src/world/simulation/CityActivity.ts) only presents its snapshot. Position, signed velocity, acceleration, direction, service status, phase timing, completed arrivals and error are authoritative; camera distance, visibility culling, population RNG and rendering do not choose train state.

```text
APPROACHING → DECELERATING → STOPPED → DWELLING
→ PREPARING DEPARTURE → ACCELERATING → RUNNING
```

| State | Default rule |
| --- | --- |
| APPROACHING | Maintain 4 m/s for the last 30 m before the braking point |
| DECELERATING | Smooth 8-second speed ramp, using exactly 16 m to stop |
| STOPPED | Confirmed stationary for 1 second |
| DWELLING | Remain stationary for configurable `dwellSeconds`, default 24 seconds |
| PREPARING DEPARTURE | Remain stationary for 3 seconds; no door action |
| ACCELERATING | Smooth 8-second ramp to 4 m/s over 16 m |
| RUNNING | Cruise on the existing straight alignment toward the offstage turnback |

For normalized ramp time `u`, acceleration uses `v = V(3u² - 2u³)`. Braking uses `v = V(1 - 3u² + 2u³)`. Position comes from their analytic integrals; both traverse `V*T/2`. Velocity and acceleration are continuous at every station transition, including entry/exit from zero-speed holds. Peak acceleration is 0.75 m/s²; peak ramp jerk is bounded by 0.375 m/s³. Fractional phase boundaries consume the remaining portion of the same tick, so timing is not rounded to a new frame. Final position normalization corrects less than 0.0000001 m of floating-point error and throws if a target is missed beyond that threshold; it is not an overshoot recovery.

The old 9 m/s passing speed required an 81 m departure ramp at the same comfortable peak acceleration. That would put normal running beyond the drawn rail. The selected **4 m/s (14.4 km/h)** is a deliberate low-speed station-section limit: normal running begins at x = 50.75 eastbound or 18.75 westbound, while the full train still fits on the rendered railway x = -71–71. Eastbound braking begins at x = 18.75; westbound at 50.75. Both stop at 34.75.

Repeated service does not reset or wrap X. The train continues along the same implied straight alignment beyond the district to x = 200 or -130, brakes smoothly to rest, waits five seconds, reverses direction at zero velocity and returns. The cab lamps swap leading/trailing colors there. Offstage braking/holding remain RUNNING with explicit `motion` and `destination` fields; initial/reopening launches use ACCELERATING. These endpoints reuse the old passing-service coordinate range. No railway line, track geometry, switch or additional platform is created.

## Simulation time and service hours

One operation second is one second of the fixed-step city clock. The daylight clock is separate: when playing, its existing rate is 0.06 hours per second, or a 400-second day. Holding the daylight clock still allows trains and pedestrians to move. Dwell uses physical simulation seconds, not accelerated displayed minutes; it is not a timetable.

The world now passes elapsed visible-frame time to the simulation instead of discarding time above 50 ms; the simulation retains accumulated time rather than capping it at 250 ms. While daylight is playing, the same fixed ticks advance its existing 0.06-hour/second rate, so service boundaries also agree across frame rates. Controls and effects keep their existing delta limits. This preserves the same 30 Hz pedestrian/traffic rules while making train results identical for equivalent elapsed time across frame rates. Hidden pages pause the city, and visibility changes reset the frame timestamp to prevent a background catch-up. Development review can pause automatic stepping while explicitly advancing the actual live simulation; this adds no HUD control.

The existing `railServiceOpen` rule remains **05:00 inclusive through 01:00 exclusive**, including midnight wrapping. Closure stops further turnback launches. An admitted trip completes its station stop/dwell/departure and brakes to rest at its next offstage endpoint, then becomes inactive. It does not vanish at the platform or reset speed when the hour slider changes. Reopening starts from the same parked position with zero speed. If service reopens before the active trip finishes, the endpoint can launch the next trip. `active`, rather than the current hour alone, controls train rendering; rumble follows actual speed and continues consistently during service withdrawal.

## Actual browser evidence

[station3-browser-checks.mjs](../tools/station3-browser-checks.mjs) advances the actual live CityActivity simulation without replacing actors or assigning train positions. Only camera framing changes. [The saved measurements](./station3-measurements.json) contain 1,500 one-second samples, all transitions, 12 arrivals, closure/reopening state, pedestrian regressions and the capture observations. Every PNG has paired JSON with the authoritative train snapshot, simulation timestamp, camera, renderer dimensions and asset status.

The complete captured eastbound cycle is below. The error column is signed `x - target`; while moving it describes distance from the station target, not a failed stop. Daylight is held at 12:00; the city clock starts from its existing 8-second offset.

| Actual capture | Simulation clock (s) | State | Center X (m) | Velocity (m/s) | Error (m) |
| --- | ---: | --- | ---: | ---: | ---: |
| [Approaching](./captures/station3-approaching.png) | 42.000 | APPROACHING | -10.000000 | 4.000000 | -44.750000 |
| [Decelerating](./captures/station3-decelerating.png) | 53.200 | DECELERATING | 31.774941 | 1.990625 | -2.975059 |
| [Stopped](./captures/station3-stopped.png) | 57.200 | STOPPED | 34.750000 | 0 | **0** |
| [Dwelling](./captures/station3-dwelling.png) | 68.200 | DWELLING | 34.750000 | 0 | **0** |
| [Preparing](./captures/station3-preparing.png) | 82.200 | PREPARING DEPARTURE | 34.750000 | 0 | **0** |
| [Departing](./captures/station3-departing.png) | 87.800 | ACCELERATING | 35.682456 | 1.001112 | 0.932456 |
| [Normal running](./captures/station3-running.png) | 93.200 | RUNNING | 50.800000 | 4.000000 | 16.050000 |

[The platform-level view](./captures/station3-platform-alignment.png) shows the real stopped cab, static doors, platform edge, barrier and canopy. [Return arrival 1](./captures/station3-repeat-1.png), [arrival 2](./captures/station3-repeat-2.png) and [return arrival 3](./captures/station3-repeat-3.png) are subsequent stops in that same live world at city-clock 188.833, 320.200 and 451.833 seconds. All stop at x = 34.75 with zero speed and zero error. All 11 captures were visually inspected. The overview shows three coupled carriages and clear platform ends; the platform view shows sill alignment and the closed barrier. A retained building beyond the east platform end partly occludes the leading car in the running view.

| Measured validation | Result |
| --- | ---: |
| Generated-world arrivals in 1,500 open seconds | **12**, both directions |
| Maximum stationary stopping error | **0 m**, tolerance 0.05 m |
| Maximum displacement per 30 Hz tick | **0.13333334 m** |
| Maximum velocity change per tick | **0.02499983 m/s** |
| Maximum acceleration / sampled jerk | **0.75 m/s² / 0.37344 m/s³** |
| Station-contract collisions / pedestrian intersections | **0 / 0** |
| Checked rendered station instances / intersections | **271 / 0** |
| Minimum train-envelope to elevated pedestrian body clearance | **0.905 m**, using 0.25 m body radius |
| Browser page exceptions / failed shader links | **0 / 0** |
| Loaded GLBs / asset errors | **3 / 0** |

The separate [Station Development 2 validation](../tools/station2-validation.mjs) was rerun with the real generated bounds and operating train: 1,200 open seconds at 18:30 plus 600 closed seconds at 03:00. It again recorded **35 starts, 27 open completions and 35/35 completions after closure**, zero remaining visitors/reservations, zero invalid moves, gate conflicts, passenger overlaps, pedestrian wall hits, unmarked-road samples or pedestrian/vehicle overlaps. Minimum passenger separation remains 0.5603 m; 294 vehicles exited. Train validation additionally samples elevated pedestrian bodies against the moving train. Gate/stair/navigation/pose implementations were not changed.

## Tests and reproduction

[train-operation.test.mjs](../tests/train-operation.test.mjs) adds six focused regressions: old/new consist compatibility and full door envelopes, eight repeated two-direction arrivals and continuous kinematics, configurable dwell, identical fixed-step results across 144 Hz / 30 Hz / 2 Hz / irregular updates with different cameras and population seeds (both held daylight and an advancing clock crossing closure/reopening), closure during every station phase plus reopening, and invalid configuration rejection. Existing station navigation tests retain gate ownership, stair support, separation and closure draining across multiple seeds.

Required commands passed:

```text
npm.cmd run check
npm.cmd test          # 37 pass
npm.cmd run build
```

Run the existing development task, reload the page, then use its console:

```js
const review = await (await import('/tools/station3-browser-checks.mjs')).review();
// Writes quality/station3-measurements.json and paired capture PNG/JSON files.
window.__shinmachi.setReviewPaused(false); // resume ordinary automatic stepping
```

The existing Vite capture middleware now also accepts metadata-only review saves; it still exists only in development. No new dependency, real light or shader system is added. The production build retains Vite's pre-existing large Three.js chunk advisory. This review intentionally pauses automatic stepping and makes no new FPS claim.

## Remaining limitations

- Offstage railway continuation and turnbacks are an operation abstraction on the existing straight alignment. Rails are drawn only within the existing district; no offstage track/terminus or new district was modeled. The inherited east-end building occupies part of the route beyond the station frontage; its occlusion/clipping is retained. Collision claims here cover station geometry and pedestrians, not a complete railway right-of-way outside the station.
- The station-section speed is deliberately low. There is no long-distance line speed, timetable, dispatcher, multi-train separation or delay recovery.
- Doors and platform screens stay static. Platform waiting remains the existing timed pedestrian visit, independent of train arrivals; boarding and alighting are pending.
- Geometry, rendered-instance and generated-world evidence uses the existing default seed 8412. Train motion is independent of world/population seeds; arbitrary future city geometry still needs its own spatial review.
- This is deterministic kinematics, not traction, wheel-contact or rigid-body physics. Existing bogies, wheels and catenary detail retain their authored geometry.
