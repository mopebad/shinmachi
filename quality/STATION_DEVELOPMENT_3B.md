# Station Development 3B — functional train doors

The commuter train now has physical sliding doors governed by the authoritative railway state. A complete service stops, confirms alignment, opens its platform-side doors, holds them fully open, warns of departure, closes and confirms every door, then accelerates. No passenger boarding, alighting, announcements, platform-screen animation or new railway is included.

Historical milestone: [Station 3B.5](./STATION_DEVELOPMENT_3B_5.md) subsequently removes the static screen along the usable frontage and updates the physical access interface. References below to `STATIC_SCREEN`, blocked passenger access and the old barrier captures describe the 3B state, not the current open platform. NPC boarding remains disabled until Station 3C.

## Audit and retained geometry

Reviewed [the 3A handoff](./STATION_DEVELOPMENT_3A.md), [TrainOperation.ts](../src/world/simulation/TrainOperation.ts), [RailGeometry.ts](../src/world/simulation/RailGeometry.ts), [CommuterRail.ts](../src/world/simulation/CommuterRail.ts), CitySimulation/CityActivity integration, station surfaces/navigation and capture infrastructure before implementation.

The existing train remains **three cars, 39.125 m overall**, with 12.8 m bodies, 13.1 m center spacing and 0.30 m body gaps. It stops at x = **34.75**, z = **-57**, alongside the unchanged platform x = 8–61.5. Its usable frontage remains x = 9–60.5, and the stop tolerance remains ±0.05 m. Platform and door sill remain y = **7.455**. Direction reversal does not rotate the train, so the south side (+Z) faces the platform on both service directions.

The old doors were static panels over one solid carriage box. Moving those panels alone would reveal an opaque body. The renderer now builds a hollow shell from a floor, upper body, ends and side-wall spans that leave genuine door apertures. Stripes and lower trim also stop at the apertures. Frames, threshold steps and guide rails remain fixed; two leaves slide externally along each side wall. The changed shell required keeping formerly concealed underbody equipment below the visible floor, with small bogie/wheel-envelope adjustments to remove floor penetration. Traction/wheel contact remains the pre-existing authored approximation.

| Door geometry | Measurement |
| --- | --- |
| Doorways / leaves | **12 / 24**: two doorways per side per car |
| Operating platform-side doorways | **6**; north-side doors stay closed |
| Structural aperture | **1.06 × 1.85 m** |
| Leaf width / thickness | **0.53 / 0.02 m** |
| Travel per leaf | **0.55 m** along ±X |
| Panel center plane | z = track center ±1.38 |
| Clearance behind panels to side stripe | **2.5 mm**; body shell has more clearance |
| Closest open-leaf edge to adjacent window frame | **20 mm** |
| Maximum train/threshold half-width | **1.445 m**, retaining the 3A envelope |
| Clearance from threshold/handles to platform edge | **55 mm** |

Door centers remain x = **18.05, 25.25, 31.15, 38.35, 44.25, 51.45** at the stop. Every doorway and the entire consist remain inside the usable platform. Glazing uses real openings in the leaves and transparent panes; the train's pre-existing static window silhouettes are not painted onto the moving doors.

## State machine, timing and interlocks

[TrainDoors.ts](../src/world/simulation/TrainDoors.ts) owns door definitions, individual actuators, closed confirmations, obstruction inputs and world-space openings. [TrainOperation.ts](../src/world/simulation/TrainOperation.ts) owns railway transitions and departure permission. Both run through the existing 30 Hz simulation; [TrainDoorPresentation.ts](../src/world/simulation/TrainDoorPresentation.ts) only copies authoritative fractions and lamp state into instance matrices.

```text
APPROACHING → DECELERATING → STOPPED → DOOR OPENING → DWELLING
→ DEPARTURE WARNING → DOOR CLOSING → PREPARING DEPARTURE
→ ACCELERATING → RUNNING
```

| Configuration | Default | Meaning |
| --- | ---: | --- |
| `stoppedSeconds` | 1 s | Stationary confirmation before opening |
| `doorOpeningSeconds` | 2.4 s | Full opening stroke |
| `dwellSeconds` | 24 s | **Fully open** dwell, excluding opening time |
| `departureWarningSeconds` | 3 s | Doors remain open; amber lamps blink |
| `doorClosingSeconds` | 2.4 s | Closing stroke; amber lamps stay lit |
| `preparationSeconds` | 3 s | Confirmed closed hold before acceleration |

These are constructor settings on `CitySimulation({ train: { ... } })` or `TrainOperation`, not HUD controls. All durations must be positive and finite. The elapsed time is simulation time, including when daylight is held; 3A's fixed-step daylight/service-hour behavior remains intact.

Each actuator follows cubic easing `3u² - 2u³` from its current fraction to its commanded endpoint. At normal opening/closing, velocity is zero at both ends; maximum default leaf speed is **0.34375 m/s**. Fractional phase boundaries consume the remainder of the same tick. Rendering has no door timer and cannot confirm closure.

Opening requires an active, committed station hold, **exactly zero train velocity**, center error within ±0.05 m, and the complete consist within the safe stopping envelope. The one-second stop confirmation must also finish. Only the platform-facing set receives an opening command. Invalid open requests while moving, inactive, offstage, unaligned, or in another operation phase are refused.

Departure requires all **12** doorways to report `CLOSED`, zero fraction, zero leaf speed and no obstruction, as well as completed departure preparation and valid station alignment. Both station departures and offstage launches enforce closure. A timer reaching its endpoint alone does not grant permission.

`setDoorObstructed(id, true)` is a deterministic sensor input, accepted only for a real platform-side door during a stationary aligned hold. There is no NPC coupling yet. An obstruction during closing or preparation causes the operating set to reopen from its current positions. The train stays held, completes another open dwell and warning, and retries closing; persistent obstruction keeps departure inhibited. This models a safety stop: the leaf can halt on obstruction, and the recovery curve begins with zero speed without a position jump. Clearing the input permits a subsequent fully confirmed close. Wrong-side, unknown-ID and moving-train obstruction attempts are refused.

At service closure, an admitted stop completes the same door sequence before departing to its offstage parking point. An unresolved obstruction takes priority over withdrawal. The train does not hide while open, and 05:00 reopening starts with all doors secured.

## Interface for future passenger boarding

`simulation.train.doors` returns fresh `TrainDoorSnapshot[]` records. The train snapshot also includes these records plus `allDoorsClosed`, `warningLampOn`, `doorCycles` and `doorReopenings`. IDs such as `car-2-south-2` remain stable across arrivals.

Each record provides:

- Car/door indices, fixed side, local X, individual `CLOSED` / `OPENING` / `OPEN` / `CLOSING` state, normalized fraction, signed leaf speed, obstruction and `closedConfirmed`.
- `opening`: full world-space doorway bounds (`minX`, `maxX`, `bottomY`, `topY`, `z`), width and outward normal at the outer threshold plane.
- `clearOpening`: the current projected clear gap, clipped to the 1.06 m structural aperture. Closed width is zero; full-open width is 1.06 m.
- `boarding.platformPoint`, `thresholdPoint` and `interiorPoint`, plus train/door alignment and passability flags. All six platform anchors are supported by real platform surfaces and clear of station body obstacles.

Example after the train is stopped and open:

```js
const train = window.__shinmachi.activity.simulation.train;
const door = train.doors.find(d => d.id === 'car-2-south-2');
// opening: x=37.82..38.88, y=7.455..9.305, z=-55.555, outward +Z
// platformPoint:  (38.35, 7.455, -54.5)
// thresholdPoint: (38.35, 7.455, -55.555)
// interiorPoint:  (38.35, 7.455, -56.15)
```

**These are future boarding anchors, not an active walking route.** The existing platform screen is still closed static architecture. Records explicitly expose `platformBarrier: 'STATIC_SCREEN'` and `passengerAccess: false`; `doorPassable` means only that the aligned train doorway is fully open. North-side records have no platform point and cannot be boarding candidates. No navigation links, gates, waiting destinations or pedestrian routines were changed.

## Actual browser validation

[station3b-browser-checks.mjs](../tools/station3b-browser-checks.mjs) advances the actual live train and uses the existing 1920 × 1080 capture infrastructure. It never assigns train positions or door fractions. [Saved measurements](./station3b-measurements.json) include the configuration, complete transition observations, individual door states, world-space boarding interface, geometry checks, an interrupted live closing cycle and the generated-world pedestrian regression.

The four required close-ups use the same camera and the same doorway, `car-2-south-2`, in one uninterrupted arrival/departure cycle:

| Actual scene capture | Simulation clock (s) | Operation state | Open fraction | Clear width (m) |
| --- | ---: | --- | ---: | ---: |
| [Closed](./captures/station3b-doors-closed.png) | 57.200 | STOPPED | 0 | 0 |
| [Opening](./captures/station3b-doors-opening.png) | 59.267 | DOOR OPENING | 0.424734 | 0.467208 |
| [Open](./captures/station3b-doors-open.png) | 62.600 | DWELLING | 1 | 1.060000 |
| [Closing](./captures/station3b-doors-closing.png) | 88.667 | DOOR CLOSING | 0.575266 | 0.632792 |

[The interior view](./captures/station3b-open-interior.png) looks through the genuine open doorway toward the retained platform barrier. [Warning](./captures/station3b-departure-warning.png) at 84.600 seconds shows the lit amber indicator with doors open. [Departure](./captures/station3b-departing.png) at 95.600 seconds shows the moving train with all doors confirmed closed. It returns to normal running at 101.000 seconds. All seven images were visually inspected; paired JSON records the train/door state, clock and actual camera. Opening/dwell/warning/closing occur at x = 34.75, velocity zero and stopping error zero.

| Measured result | Value |
| --- | ---: |
| Generated-world open run | **1,200 s** |
| Arrivals / full opening events / secured departures | **9 / 9 / 9** |
| Moving-door / wrong-side / unsafe opening violations | **0 / 0 / 0** |
| Maximum sampled leaf speed | **0.343713 m/s** |
| Maximum leaf displacement per 30 Hz tick | **0.0114575 m** |
| Dynamic door-part instances checked per geometry sample | **288**, in five shared pools |
| Maximum uploaded leaf-position error | **0.000000869 m** |
| Leaf/static-body intersections, with 0.01 mm numerical tolerance | **0** |
| Open-aperture rays / blocked rays | **72 / 0** across all six platform doorways |
| Cabin-floor rays per sample / maximum floor error | **75 / 0.000000211 m** |
| Supported, unobstructed future platform anchors | **6** |
| Page exceptions / failed shader links / asset errors | **0 / 0 / 0** |

In the following live arrival, an obstruction input was applied at city-clock **228.067 s** during closing. The train stayed at x = 34.75 and zero velocity for the entire **60-second** blocked interval, reopened three times, and had no completed close/departure in that interval. After the input cleared, all doors closed and the train entered ACCELERATING at **315.467 s**. This uses the same live world as the normal captures.

The retained [Station Development 2 validation](../tools/station2-validation.mjs) again ran **1,200 open seconds plus 600 closure-drain seconds** against the actual generated district. It recorded **35 starts, 27 open completions, 35/35 completions after closure**, zero failed/invalid moves, no remaining visitors/reservations, and zero gate conflicts, passenger overlaps or street safety failures. Minimum passenger separation remains 0.5603 m, maximum continuous movement wait 11.033 s and vehicle exits 294. Platform idling remains independent of trains.

## Automated tests and reproduction

[train-doors.test.mjs](../tests/train-doors.test.mjs) adds seven focused regressions: world-space doorway/anchor contracts, configurable timing and full-open dwell, six complete smooth cycles, invalid transition refusal, interrupted closing and persistent obstruction, late closed-limit failure plus service withdrawal/reopening, and invalid timing/input rejection. The existing [train-operation tests](../tests/train-operation.test.mjs) now assert the expanded lifecycle, secured moving trains, closure from every door phase, and exact reproducibility across 144 Hz, 30 Hz, 2 Hz and irregular updates with different cameras/population seeds and advancing daylight.

Required validation passed:

```text
npm.cmd run check
npm.cmd test           # 44 passed
npm.cmd run build
```

With the existing Vite task running, reload the page and execute:

```js
const review = await (await import('/tools/station3b-browser-checks.mjs')).review();
// Saves quality/station3b-measurements.json and seven paired PNG/JSON captures.
window.__shinmachi.setReviewPaused(false); // resume ordinary automatic simulation
```

Review pauses automatic stepping while explicitly advancing the same live state; no HUD redesign or production debug endpoint is added. Five dynamic instance pools and one warning-lamp pool serve all doors; geometry/materials are allocated once. No dependencies, real lights, announcements or door sounds were added. The existing nonfatal Three.js bundle-size advisory remains. This review makes no new FPS claim.

## Remaining limitations

- Boarding, alighting and platform-screen operation are pending. The door interface marks the closed screen barrier explicitly and supplies no active passenger route.
- Obstruction is an authoritative test/future-system input, not a new crowd-collision or mechanical-force solver. Emergency recovery preserves panel positions; a safety interruption may stop leaf velocity abruptly.
- Cabin geometry is sufficient for real openings and floor support; detailed furnishings and passenger interiors are outside this scope. Other static window silhouettes retain their existing presentation.
- 3A's offstage continuation/turnback abstraction and inherited building overlap beyond the station frontage remain. Train doors stay secured there; this task adds no track or broader right-of-way repair.
