# Station 3B.5 — clear platform boarding access

Historical milestone: [Station Development 3C](./STATION_DEVELOPMENT_3C.md) subsequently enables real NPC exchange and passenger interlocks, replaces timed platform visits, and makes warning-strip tops flush with the deck. Disabled-boarding flags and the 16 mm strip offset below describe the 3B.5 state and its retained captures.

The continuous track-facing screen has been removed from the usable boarding frontage. All six operating train doorways now have physically clear approaches from the existing platform waiting destination, at matching sill elevation. NPC boarding remains disabled until Station 3C. The authoritative train/door sequence and departure interlocks are unchanged.

This corrects the `STATIC_SCREEN` / `passengerAccess: false` limitation recorded in the historical [3B handoff](./STATION_DEVELOPMENT_3B.md). Its captures remain historical evidence; the current architecture and access contract are described here.

## Architecture and shared spatial data

[StationLayout.ts](../src/world/generation/StationLayout.ts) previously supplied one full-length `track-edge-screen` box to both rendering and height-aware collision. [StationDetails.ts](../src/world/generation/StationDetails.ts) also generated metal rails and stanchions around that glass box. Removing the box removes the glass, framing and collision together; no invisible wall remains.

The station now uses a compact open-platform arrangement:

- Platform length **53.5 m**, x = **8–61.5**; open usable frontage **51.5 m**, x = **9–60.5**. Platform surfaces, stairs, railway alignment and carriage spacing remain in place.
- Two short **1 m** track-facing end returns protect the non-boarding corners. Rear-edge guards, transverse platform-end guards, stairwell guards, return-landing rails and stair handrails are retained.
- The continuous **0.30 m** yellow tactile strip is retained at z = **−55.02**, spanning z = **−55.17 to −54.87**. The separate pale waiting boundary is at z = **−54.75**.
- The edge hazard band runs from z = **−55.5 to −54.75**. It is an explicit navigation hazard, not a collision wall. Ordinary station NPC navigation excludes it with a 0.25 m body margin. Waiting destinations remain at z = **−54.15**, 1.35 m behind the platform edge.

`StationSpatial.boardingFrontage` records the open frontage, tactile dimensions, safe waiting boundary, `barrier: 'OPEN_PLATFORM'`, `accessPolicy: 'STOPPED_OPEN_DOOR_ONLY'` and `npcBoardingEnabled: false`. `navigationHazards` records the edge exclusion separately from solid `boxes`. Actual guards and masts remain collision boxes.

## Door alignment and physical approaches

The existing three-car train is **39.125 m** long and stops at x = **34.75**, track z = **−57**. The sill and platform are both y = **7.455 m** (floating-point difference below 10⁻¹⁴ m). Every doorway is **1.06 m** wide and **1.85 m** high. The outer train sill is z = **−55.555**, leaving a normal **55 mm** gap to the platform at z = **−55.5**.

| Operating doorway | Center x (m) | Aperture x interval (m) | Platform/sill y (m) | Clear approach screenshot |
| --- | ---: | --- | ---: | --- |
| car-1-south-1 | 18.05 | 17.52–18.58 | 7.455 | [Door 1](./captures/station35-car-1-south-1-access.png) |
| car-1-south-2 | 25.25 | 24.72–25.78 | 7.455 | [Door 2](./captures/station35-car-1-south-2-access.png) |
| car-2-south-1 | 31.15 | 30.62–31.68 | 7.455 | [Door 3](./captures/station35-car-2-south-1-access.png) |
| car-2-south-2 | 38.35 | 37.82–38.88 | 7.455 | [Door 4](./captures/station35-car-2-south-2-access.png) |
| car-3-south-1 | 44.25 | 43.72–44.78 | 7.455 | [Door 5](./captures/station35-car-3-south-1-access.png) |
| car-3-south-2 | 51.45 | 50.92–51.98 | 7.455 | [Door 6](./captures/station35-car-3-south-2-access.png) |

[StationBoardingAccess.ts](../src/world/simulation/StationBoardingAccess.ts) validates each approach for a **0.50 m diameter, 1.65 m high** pedestrian. It starts at the existing waiting destination **(28.2, 7.455, −54.15)**, walks along the safe platform corridor to the door's x coordinate, then approaches that sill directly. This keeps the longitudinal route behind the catenary masts at z = −54.7 and ahead of the stairwell guards at z = −53.1. The 1.06 m opening leaves **0.28 m** on either side of a centered 0.50 m body.

The helper checks frontage bounds, opening width/height, body obstacles and platform support every **25 mm**. It rejects sill errors above **20 mm** and gaps outside **0–80 mm**. Its only support exception is the short step directly from the platform edge to this door's sill; it never treats the railway as a walking surface or permits a longitudinal path through track space. Regressions check all six approaches at nominal stopping position and at both **±50 mm** accepted stopping limits. Existing train step faces now meet the cabin floor edge without overlapping coplanar faces, preserving their elevation and outer edge while removing visible sill seam artifacts.

## Boarding interface and navigation permission

[TrainDoors.ts](../src/world/simulation/TrainDoors.ts) now exposes these properties under each door's `boarding` record:

| Property | Current meaning |
| --- | --- |
| `platformBarrier` | `OPEN_PLATFORM` on the six south doorways; `NO_PLATFORM` on the north side. |
| `approach` | Fresh geometry report with waiting/platform/edge/threshold points, path, clearance result/reason, gap, sill error and pedestrian radius. Present only for an aligned platform-side station hold. |
| `platformPoint` | Supported, safe approach point on the existing waiting corridor, aligned with the current door x. Null when no aligned platform approach exists. |
| `doorPassable` | Active, aligned, stationary station hold; door at its full-open limit; no obstruction input. |
| `passengerAccess` | `doorPassable` **and** a clear validated physical approach. False while moving, opening, closing, unaligned, obstructed, inactive or on the north side. |
| `npcBoardingEnabled` | Always **false** in this milestone. Physical access does not dispatch an NPC. |

[StationNavigation.ts](../src/world/simulation/StationNavigation.ts) exposes six `boardingApproaches`, each with its door ID and `enabled: false`. They are metadata, with **no new active graph edges**. The existing **248 station edges, 4,901 validation samples and 13 waiting destinations** are preserved. Fare-gate ownership, stair lanes, separation, platform idling, shop visits and traffic behavior are unchanged. No boarding/alighting state or passenger assignment has been added.

The train's authoritative operation, door actuators, warning/closing states, service rules and all-doors-closed departure checks are retained. The access flags are derived from that authority; rendering and camera position cannot enable them.

## Actual browser evidence

[station35-browser-checks.mjs](../tools/station35-browser-checks.mjs) uses the existing browser capture endpoint and real live train simulation. [Saved measurements](./station35-measurements.json) include every approach, the complete door interface, train state, closure/departure observations, guard checks and generated-world regression results. No train positions, door fractions or scene visibility are posed for the captures.

All six close-ups above and the [open-frontage view](./captures/station35-open-frontage.png) were captured at simulation clock **62.600 s**, **12:00**, `DWELLING`, train x = **34.75**, velocity **0**, stopping error **0**, all six operating doors fully open. Each 1920 × 1080 image has paired JSON containing those values and the actual camera. The [stairwell view](./captures/station35-stair-guards.png) shows the retained guards beside the open boarding strip. Images were visually inspected; the nearby x = 45 mast remains beside its doorway, outside the pedestrian approach.

The geometry review extracts actual uploaded instances from the generated district and train, including glass frames, mast parts and door leaves. Disjoint sign-atlas faces are tested individually rather than treated as one district-sized solid bounding box. Conservative body boxes and real triangle raycasts check the complete waiting-to-threshold paths.

| Measured result | Value |
| --- | ---: |
| Local rendered parts checked | 456 |
| Body-volume samples across six approaches / intersections | **2,982 / 0** |
| Real approach rays / blocked rays | **216 / 0** |
| Supported platform floor rays | **2,952** |
| Maximum platform surface offset | **16 mm**, the retained raised tactile strip |
| Minimum horizontal clearance beyond the tested body radius | **260 mm** |
| Normal gap from geometry / 1 mm floor scan | **55 mm / 56 mm**, within sampling resolution |
| Upper-level guard boxes matched to actual rendered glass | **9 / 9**, all solid collision guards |
| Generated-world operating run | **1,200 s** |
| Full-open arrivals / secured departures | **9 / 9** |
| Physical-access violations / NPC-boarding permission violations | **0 / 0** |
| Maximum dwelling stop error | **0 m** |
| Page exceptions / failed shader links / asset errors | **0 / 0 / 0** |

At **88.400 s** the same live train is closing and every access flag is false. At **95.600 s** it is accelerating with every door confirmed closed and every access flag false. Existing automated tests also retain interrupted-close recovery, late obstruction, invalid transitions, frame-rate determinism and service-hour withdrawal/restart coverage.

The generated-world pedestrian run repeats **1,200 open seconds plus 600 closure-drain seconds**: **35 starts, 35 completions after closure**, zero invalid moves/failures, zero gate conflicts, overlaps or street-safety violations; no visitors or reservations remain. Minimum passenger separation is **0.5603 m**, maximum continuous movement wait **11.033 s**, with **294** vehicle exits.

## Reproduction and checks

Run the existing Vite development task, reload the browser, then execute:

```js
const review = await (await import('/tools/station35-browser-checks.mjs')).review();
// Saves eight actual PNG/JSON capture pairs plus quality/station35-measurements.json.
window.__shinmachi.setReviewPaused(false);
```

The review pauses automatic stepping and explicitly advances the same authoritative live state. It makes no new FPS claim. [station-boarding-access.test.mjs](../tests/station-boarding-access.test.mjs) adds five focused regressions for open architecture/guards, all six approaches across the stop tolerance, invalid geometry, conditional access flags and six complete secured cycles. Existing station/door tests assert the corrected contract.

Required validation passed:

```text
npm.cmd run check
npm.cmd test          # 49 passed
npm.cmd run build
```

Editor diagnostics report no TypeScript errors. The inherited nonfatal Three.js chunk-size advisory remains.

## Remaining work for Station 3C

NPC door selection, crowd reservations along these approaches, stepping across the conditional gap, train-floor support integration, boarding and alighting remain unimplemented. These are physical access contracts rather than an active passenger walking system. All twelve doors retain their existing safety interlocks; only the six platform-side doors can expose access. The wider railway's inherited offstage turnbacks and building overlap beyond the station frontage remain as documented in 3A; no railway or district redesign was made.
